import assert from 'node:assert/strict';
import test from 'node:test';

import { createReadinessActionState } from './studio-readiness-action-state.js';

test('build test transitions from pending to its completed result immediately', () => {
  const state = createReadinessActionState();
  assert.equal(state.start('prep'), true);
  assert.deepEqual(state.pending, { prep: true, live: false });
  const prep = { prep: { ok: true, output: 'build ok' }, message: 'passed' };
  state.complete('prep', { type: 'success', data: prep });
  assert.deepEqual(state.pending, { prep: false, live: false });
  assert.equal(state.results.prep, prep);
  assert.equal(state.results.live, null);
});

test('failed build test keeps its own technical output', () => {
  const state = createReadinessActionState();
  state.start('prep');
  const prep = { prep: { ok: false, output: 'build error' }, message: 'failed' };
  state.complete('prep', { type: 'failure', data: prep });
  assert.equal(state.results.prep.prep.ok, false);
  assert.equal(state.results.prep.prep.output, 'build error');
});

test('publish alone updates only the publish result', () => {
  const state = createReadinessActionState();
  state.start('live');
  const live = { live: { ok: true, output: 'deploy ok' }, message: 'online' };
  state.complete('live', { type: 'success', data: live });
  assert.equal(state.results.prep, null);
  assert.equal(state.results.live, live);
});

test('publish after a build test neither reveals late output nor replaces the test result', () => {
  const state = createReadinessActionState();
  const prep = { prep: { ok: true, output: 'separate build output' }, message: 'passed' };
  state.start('prep');
  state.complete('prep', { type: 'success', data: prep });
  assert.equal(state.results.prep, prep);

  const live = { live: { ok: false, output: 'separate deploy output' }, message: 'not online' };
  state.start('live');
  state.complete('live', { type: 'failure', data: live });
  assert.equal(state.results.prep, prep);
  assert.equal(state.results.live, live);
  assert.notEqual(state.results.prep.prep.output, state.results.live.live.output);
});

test('a concurrent second submission is rejected without a misleading pending state', () => {
  const state = createReadinessActionState();
  assert.equal(state.start('prep'), true);
  assert.equal(state.start('live'), false);
  assert.deepEqual(state.pending, { prep: true, live: false });
});

test('server-rendered action data initializes only its matching result', () => {
  const prepForm = { prep: { ok: true, output: 'SSR build' }, message: 'passed' };
  let state = createReadinessActionState(prepForm);
  assert.equal(state.results.prep, prepForm);
  assert.equal(state.results.live, null);

  const liveForm = { live: { ok: true, output: 'SSR deploy' }, message: 'online' };
  state = createReadinessActionState(liveForm);
  assert.equal(state.results.prep, null);
  assert.equal(state.results.live, liveForm);
});
