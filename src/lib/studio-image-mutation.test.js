import assert from 'node:assert/strict';
import test from 'node:test';

import { createHeroBannerRemoval, createStudioImageMutation } from './studio-image-mutation.js';

test('models no mutation, addition and replacement', () => {
  const addition = createStudioImageMutation();
  assert.deepEqual(addition.snapshot(), { state: 'none', hasUpload: false, remove: false });
  assert.equal(addition.selectFile({ size: 4 }).state, 'add');

  const replacement = createStudioImageMutation({ hasExisting: true });
  assert.equal(replacement.selectFile({ size: 4 }).state, 'replace');
});

test('models removal, cancellation and never restores a cleared upload', () => {
  const mutation = createStudioImageMutation({ hasExisting: true });
  mutation.selectFile({ size: 4 });
  assert.deepEqual(mutation.setRemove(true), { state: 'remove', hasUpload: false, remove: true });
  assert.deepEqual(mutation.setRemove(false), { state: 'none', hasUpload: false, remove: false });
  assert.equal(mutation.selectFile({ size: 8 }).state, 'replace');
});

test('Hero removal forces show off and cancellation restores its previous value', () => {
  const visibility = createHeroBannerRemoval(true);
  assert.deepEqual(visibility.update(true, true), { remove: true, show: false });
  assert.deepEqual(visibility.update(false, false), { remove: false, show: true });

  visibility.reset(false);
  assert.deepEqual(visibility.update(true, false), { remove: true, show: false });
  assert.deepEqual(visibility.update(false, false), { remove: false, show: false });
});

test('selecting a file cancels removal', () => {
  const mutation = createStudioImageMutation({ hasExisting: true });
  mutation.setRemove(true);
  assert.deepEqual(mutation.selectFile({ size: 2 }), {
    state: 'replace', hasUpload: true, remove: false
  });
});

test('an empty file is treated as no upload', () => {
  const mutation = createStudioImageMutation();
  assert.equal(mutation.selectFile({ size: 0 }).state, 'none');
  assert.equal(mutation.snapshot().hasUpload, false);
});
