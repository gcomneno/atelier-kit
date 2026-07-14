import assert from 'node:assert/strict';
import test from 'node:test';

import {
  resolveAtelierFormStatusDuration,
  resolveAtelierFormStatusTone
} from '../src/lib/form-status-adapter.js';

test('maps every supported form status and falls unknown statuses back to info', () => {
  for (const tone of ['success', 'warning', 'error', 'info']) {
    assert.equal(resolveAtelierFormStatusTone(tone), tone);
  }
  assert.equal(resolveAtelierFormStatusTone('unknown'), 'info');
  assert.equal(resolveAtelierFormStatusTone(undefined), 'info');
});

test('applies the deliberate default duration policy for every tone', () => {
  assert.equal(resolveAtelierFormStatusDuration('success', undefined), 5000);
  assert.equal(resolveAtelierFormStatusDuration('info', undefined), 5000);
  assert.equal(resolveAtelierFormStatusDuration('warning', undefined), null);
  assert.equal(resolveAtelierFormStatusDuration('error', undefined), null);
});

test('preserves explicit positive and null durations', () => {
  /** @type {import('giadaware-ui-components').FormStatusTone[]} */
  const tones = ['success', 'warning', 'error', 'info'];
  for (const tone of tones) {
    assert.equal(resolveAtelierFormStatusDuration(tone, 2750), 2750);
    assert.equal(resolveAtelierFormStatusDuration(tone, null), null);
  }
});
