import assert from 'node:assert/strict';
import test from 'node:test';
import { readImageMutation } from './studio-image-mutation.js';

test('normalizes Studio image upload/removal FormData', () => {
  const none = readImageMutation(new FormData(), 'upload', 'remove');
  assert.deepEqual(none, { upload: null, remove: false, hasUpload: false });

  const uploadForm = new FormData();
  const upload = new File(['image'], 'image.png', { type: 'image/png' });
  uploadForm.set('upload', upload);
  const uploaded = readImageMutation(uploadForm, 'upload', 'remove');
  assert.ok(uploaded.upload);
  assert.equal(uploaded.upload.name, 'image.png');
  assert.equal(uploaded.hasUpload, true);
  assert.equal(uploaded.remove, false);

  const emptyForm = new FormData();
  emptyForm.set('upload', new File([], 'empty.png', { type: 'image/png' }));
  assert.deepEqual(readImageMutation(emptyForm, 'upload', 'remove'), {
    upload: null, remove: false, hasUpload: false
  });

  const removeForm = new FormData();
  removeForm.set('remove', 'on');
  assert.deepEqual(readImageMutation(removeForm, 'upload', 'remove'), {
    upload: null, remove: true, hasUpload: false
  });

  uploadForm.set('remove', 'true');
  assert.throws(
    () => readImageMutation(uploadForm, 'upload', 'remove'),
    /either a new image or removal/
  );
});
