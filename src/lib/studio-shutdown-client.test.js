import assert from 'node:assert/strict';
import test from 'node:test';

import {
  createStudioShutdownFlow,
  renderStudioShutdownDocument,
  SHUTDOWN_PHASE,
  showStudioShutdownFallback
} from './studio-shutdown-client.js';

function createFlow(overrides = {}) {
  const calls = [];
  const phases = [];
  const flow = createStudioShutdownFlow({
    confirmShutdown: () => (calls.push('confirm'), true),
    renderTerminal: () => calls.push('render'),
    afterRender: async () => calls.push('paint'),
    closeWindow: () => calls.push('close'),
    showFallback: () => calls.push('fallback'),
    acknowledgeRendered: async () => calls.push('acknowledge'),
    onPhaseChange: (phase) => phases.push(phase),
    ...overrides
  });
  return { calls, phases, flow };
}

test('confirmed shutdown enters the disabled stopping state once', () => {
  const { calls, flow, phases } = createFlow();
  assert.equal(flow.begin(), true);
  assert.equal(flow.phase, SHUTDOWN_PHASE.STOPPING);
  assert.equal(flow.begin(), false);
  assert.deepEqual(calls, ['confirm']);
  assert.deepEqual(phases, [SHUTDOWN_PHASE.STOPPING]);
});

test('a cancelled confirmation does not submit or open a second dialog', () => {
  let confirmations = 0;
  const { flow } = createFlow({ confirmShutdown: () => (++confirmations, false) });
  assert.equal(flow.begin(), false);
  assert.equal(flow.phase, SHUTDOWN_PHASE.IDLE);
  assert.equal(confirmations, 1);
});

test('success renders the terminal state before close and leaves the fallback before acknowledgement', async () => {
  const { calls, flow, phases } = createFlow();
  assert.equal(flow.begin(), true);
  assert.equal(await flow.complete(), true);
  assert.deepEqual(calls, [
    'confirm', 'render', 'paint', 'close', 'fallback', 'paint', 'acknowledge'
  ]);
  assert.deepEqual(phases, [
    SHUTDOWN_PHASE.STOPPING, SHUTDOWN_PHASE.STOPPED, SHUTDOWN_PHASE.FALLBACK
  ]);
});

test('server failure restores the idle state without terminal rendering or close', async () => {
  const { calls, flow } = createFlow();
  flow.begin();
  flow.reset();
  assert.equal(flow.phase, SHUTDOWN_PHASE.IDLE);
  assert.equal(await flow.complete(), false);
  assert.deepEqual(calls, ['confirm']);
});

test('terminal document is self-contained, accessible, focused, and reveals its fallback', () => {
  const title = { focused: false, focus() { this.focused = true; } };
  const message = { hidden: true };
  const documentObject = {
    html: '',
    opened: false,
    closed: false,
    open() { this.opened = true; },
    write(value) { this.html += value; },
    close() { this.closed = true; },
    getElementById(id) {
      return id === 'studio-shutdown-title' ? title : id === 'studio-shutdown-message' ? message : null;
    }
  };

  renderStudioShutdownDocument(documentObject, {
    lang: 'it',
    pageTitle: 'Studio arrestato',
    stopped: 'Studio arrestato',
    fallback: 'Studio arrestato. Puoi chiudere questa scheda.'
  });
  assert.equal(documentObject.opened, true);
  assert.equal(documentObject.closed, true);
  assert.equal(title.focused, true);
  assert.match(documentObject.html, /role="status"/);
  assert.match(documentObject.html, /<html lang="it">/);
  assert.match(documentObject.html, /aria-live="polite"/);
  assert.match(documentObject.html, /Studio arrestato\. Puoi chiudere questa scheda\./);

  showStudioShutdownFallback(documentObject);
  assert.equal(message.hidden, false);
});
