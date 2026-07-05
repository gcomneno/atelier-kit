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
import { getOperatorLocale, getOperatorTranslator } from '$lib/i18n/server.js';

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
  const locale = getOperatorLocale();
  const t = getOperatorTranslator();

  try {
    assertContentId(params.id, t('fields.itemId'), locale);
    return {
      itemForm: loadItemForm(params.id)
    };
  } catch {
    error(404, t('server.itemNotFound'));
  }
}

/** @type {import('./$types').Actions} */
export const actions = {
  saveItem: async ({ params, request }) => {
    guardStudio();

    const locale = getOperatorLocale();
    const t = getOperatorTranslator();

    try {
      assertContentId(params.id, t('fields.itemId'), locale);
      const original = readItemRecord(params.id);
      const formData = await request.formData();
      const upload = formData.get('image_upload');
      let imageFile = requiredField(formData.get('image_file'), t('studio.itemsEdit.imagePath'), locale);

      if (upload instanceof File && upload.size > 0) {
        imageFile = await saveItemImageUpload(params.id, upload, locale);
      }

      const item = {
        id: readString(original, 'id', params.id),
        title: requiredField(formData.get('title'), t('fields.itemTitle'), locale),
        subtitle: optionalField(formData.get('subtitle')),
        status: optionalField(formData.get('status')),
        price_mode: optionalField(formData.get('price_mode'), 'hidden'),
        image_file: imageFile,
        image_alt: optionalField(formData.get('image_alt')),
        description: requiredField(formData.get('description'), t('fields.description'), locale),
        notice: optionalField(formData.get('notice')),
        meta: applyMetaFromForm(original.meta, formData)
      };

      writeItemRecord(params.id, item);
      const validation = runStructuralValidation();

      return {
        itemStatus: validation.ok ? 'success' : 'warning',
        itemMessage: validationMessage(validation, locale),
        itemForm: loadItemForm(params.id)
      };
    } catch (saveError) {
      const message = saveError instanceof Error ? saveError.message : t('server.saveItemError');

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
