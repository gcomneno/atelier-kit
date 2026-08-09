import assert from 'node:assert/strict';
import test from 'node:test';
import {
  STUDIO_RUNTIME_MODES,
  canAccessStudio,
  resolveStudioRuntimeMode
} from './studio-runtime.js';

test('visitor production is the default when no Studio configuration exists', () => {
  assert.equal(
    resolveStudioRuntimeMode(false, {}),
    STUDIO_RUNTIME_MODES.VISITOR
  );
});

test('Vite development resolves to Local Studio', () => {
  assert.equal(
    resolveStudioRuntimeMode(true, {}),
    STUDIO_RUNTIME_MODES.LOCAL
  );
});

test('ATELIER_STUDIO=1 preserves controlled Local Studio outside Vite dev', () => {
  assert.equal(
    resolveStudioRuntimeMode(false, { ATELIER_STUDIO: '1' }),
    STUDIO_RUNTIME_MODES.LOCAL
  );
});

test('non-enabling legacy ATELIER_STUDIO values preserve visitor production', () => {
  assert.equal(
    resolveStudioRuntimeMode(false, { ATELIER_STUDIO: '0' }),
    STUDIO_RUNTIME_MODES.VISITOR
  );
});

test('ATELIER_STUDIO_MODE=hosted resolves to Hosted Studio', () => {
  assert.equal(
    resolveStudioRuntimeMode(false, { ATELIER_STUDIO_MODE: 'hosted' }),
    STUDIO_RUNTIME_MODES.HOSTED
  );
});

test('Hosted Studio is never authorized by the runtime-only boundary', () => {
  assert.equal(canAccessStudio(STUDIO_RUNTIME_MODES.HOSTED), false);
  assert.equal(
    canAccessStudio(STUDIO_RUNTIME_MODES.HOSTED),
    false
  );
});

test('Local Studio remains accessible without hosted authorization', () => {
  assert.equal(canAccessStudio(STUDIO_RUNTIME_MODES.LOCAL), true);
});

test('visitor and invalid modes are always inaccessible', () => {
  assert.equal(canAccessStudio(STUDIO_RUNTIME_MODES.VISITOR), false);
  assert.equal(canAccessStudio(STUDIO_RUNTIME_MODES.INVALID), false);
  assert.equal(
    canAccessStudio(STUDIO_RUNTIME_MODES.INVALID),
    false
  );
});

test('hosted mode conflicts with Vite development and fails closed', () => {
  assert.equal(
    resolveStudioRuntimeMode(true, { ATELIER_STUDIO_MODE: 'hosted' }),
    STUDIO_RUNTIME_MODES.INVALID
  );
});

test('hosted mode conflicts with ATELIER_STUDIO=1 and fails closed', () => {
  assert.equal(
    resolveStudioRuntimeMode(false, {
      ATELIER_STUDIO: '1',
      ATELIER_STUDIO_MODE: 'hosted'
    }),
    STUDIO_RUNTIME_MODES.INVALID
  );
});

test('unknown explicit mode fails closed', () => {
  assert.equal(
    resolveStudioRuntimeMode(false, { ATELIER_STUDIO_MODE: 'local' }),
    STUDIO_RUNTIME_MODES.INVALID
  );
});

test('empty explicit mode fails closed', () => {
  assert.equal(
    resolveStudioRuntimeMode(false, { ATELIER_STUDIO_MODE: '' }),
    STUDIO_RUNTIME_MODES.INVALID
  );
});
