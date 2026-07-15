import assert from 'node:assert/strict';
import test from 'node:test';

import {
  createStudioShutdownCoordinator,
  isStudioShutdownAllowed
} from './studio-shutdown-server.js';

function createFakeTimers() {
  let nextId = 0;
  /** @type {Map<number, { callback: () => void, delay: number }>} */
  const timers = new Map();
  return {
    timers,
    /** @param {() => void} callback @param {number} delay */
    setTimer(callback, delay) {
      const id = ++nextId;
      timers.set(id, { callback, delay });
      return id;
    },
    /** @param {ReturnType<typeof setTimeout> | number} id */
    clearTimer(id) {
      if (typeof id === 'number') timers.delete(id);
    }
  };
}

test('shutdown accepts one request and waits for a rendered acknowledgement', () => {
  const fake = createFakeTimers();
  /** @type {number[]} */
  const exits = [];
  const coordinator = createStudioShutdownCoordinator({
    exit: (code) => exits.push(code),
    setTimer: fake.setTimer,
    clearTimer: fake.clearTimer,
    fallbackExitDelayMs: 10_000,
    acknowledgedExitDelayMs: 150
  });

  assert.equal(coordinator.request(), true);
  assert.equal(coordinator.request(), false);
  assert.deepEqual([...fake.timers.values()].map(({ delay }) => delay), [10_000]);
  assert.deepEqual(exits, []);

  assert.equal(coordinator.acknowledgeRendered(), true);
  assert.deepEqual([...fake.timers.values()].map(({ delay }) => delay), [150]);
  [...fake.timers.values()][0].callback();
  assert.deepEqual(exits, [0]);
  coordinator.dispose();
});

test('an acknowledgement cannot terminate a process before shutdown was requested', () => {
  const fake = createFakeTimers();
  const coordinator = createStudioShutdownCoordinator({
    exit: () => assert.fail('tests must not exit'),
    setTimer: fake.setTimer,
    clearTimer: fake.clearTimer
  });
  assert.equal(coordinator.acknowledgeRendered(), false);
  assert.equal(fake.timers.size, 0);
});

test('shutdown remains restricted to dev or explicit local Studio mode', () => {
  assert.equal(isStudioShutdownAllowed(true, {}), true);
  assert.equal(isStudioShutdownAllowed(false, { ATELIER_STUDIO: '1' }), true);
  assert.equal(isStudioShutdownAllowed(false, {}), false);
  assert.equal(isStudioShutdownAllowed(false, { ATELIER_STUDIO: '0' }), false);
});
