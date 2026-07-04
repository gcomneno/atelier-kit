// @ts-nocheck

import { error, fail } from '@sveltejs/kit';
import { guardStudio } from '$lib/server/studio-guard.js';
import {
  applyMetaFromForm,
  assertContentId,
  optionalField,
  readItemRecord,
  requiredField,
  runStructuralValidation,
  saveItemImageUpload,
  validationMessage,
  writeItemRecord
} from '$lib/server/studio-io.js';

function readString(record, key, fallback = '') {
  const value = record[key];
  return typeof value === 'string' ? value : fallback;
}

function loadItemForm(id) {
  const item = readItemRecord(id);

  return {
    id: readString(item, 'id', id),
    title: readString(item, 'title'),
    subtitle: readString(item, 'subtitle'),
    status: readString(item, 'status'),
    price_mode: readString(item, 'price_mode', 'hidden'),
    image_file: readString(item, 'image_file'),
    image_alt: readString(item, 'image_alt'),
    description: readString(item, 'description'),
    notice: readString(item, 'notice'),
    meta: Array.isArray(item.meta) ? item.meta : []
  };
}

export function load({ params }) {
  guardStudio();

  try {
    assertContentId(params.id, 'Item id');
    return {
      itemForm: loadItemForm(params.id)
    };
  } catch {
    error(404, 'Item not found');
  }
}

/** @type {import('./$types').Actions} */
export const actions = {
  saveItem: async ({ params, request }) => {
    guardStudio();

    try {
      assertContentId(params.id, 'Item id');
      const original = readItemRecord(params.id);
      const formData = await request.formData();
      const upload = formData.get('image_upload');
      let imageFile = requiredField(formData.get('image_file'), 'Image path');

      if (upload instanceof File && upload.size > 0) {
        imageFile = await saveItemImageUpload(params.id, upload);
      }

      const item = {
        id: readString(original, 'id', params.id),
        title: requiredField(formData.get('title'), 'Item title'),
        subtitle: optionalField(formData.get('subtitle')),
        status: optionalField(formData.get('status')),
        price_mode: optionalField(formData.get('price_mode'), 'hidden'),
        image_file: imageFile,
        image_alt: optionalField(formData.get('image_alt')),
        description: requiredField(formData.get('description'), 'Description'),
        notice: optionalField(formData.get('notice')),
        meta: applyMetaFromForm(original.meta, formData)
      };

      writeItemRecord(params.id, item);
      const validation = runStructuralValidation();

      return {
        itemStatus: validation.ok ? 'success' : 'warning',
        itemMessage: validationMessage(validation),
        itemForm: loadItemForm(params.id)
      };
    } catch (saveError) {
      const message = saveError instanceof Error ? saveError.message : 'Could not save item.';

      try {
        return fail(400, {
          itemStatus: 'error',
          itemMessage: message,
          itemForm: loadItemForm(params.id)
        });
      } catch {
        return fail(400, {
          itemStatus: 'error',
          itemMessage: message
        });
      }
    }
  }
};
