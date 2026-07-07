// @ts-nocheck

import { error, fail, isRedirect, redirect } from '@sveltejs/kit';
import { guardStudio } from '$lib/server/studio-guard.js';
import {
  assertContentId,
  collectionRecordExists,
  deleteCollectionRecord,
  listItemSummaries,
  optionalField,
  readCollectionRecord,
  requiredField,
  runStructuralValidation,
  validationMessage,
  writeCollectionRecord
} from '$lib/server/studio-io.js';
import { getOperatorLocale, getOperatorTranslator } from '$lib/i18n/server.js';
import { translate } from '$lib/i18n/index.js';

function readString(record, key, fallback = '') {
  const value = record[key];
  return typeof value === 'string' ? value : fallback;
}

function loadCollectionForm(id) {
  const collection = readCollectionRecord(id);

  return {
    id: readString(collection, 'id', id),
    title: readString(collection, 'title'),
    description: readString(collection, 'description'),
    item_ids: Array.isArray(collection.items)
      ? collection.items.filter((itemId) => typeof itemId === 'string')
      : []
  };
}

export function load({ params }) {
  guardStudio();
  const locale = getOperatorLocale();
  const t = getOperatorTranslator();

  try {
    assertContentId(params.id, t('fields.collectionId'), locale);
  } catch (loadError) {
    if (isRedirect(loadError)) {
      throw loadError;
    }

    error(404, t('server.collectionNotFound'));
  }

  if (!collectionRecordExists(params.id)) {
    redirect(303, `/studio/collections?missing=${encodeURIComponent(params.id)}`);
  }

  try {
    return {
      collectionForm: loadCollectionForm(params.id),
      items: listItemSummaries()
    };
  } catch (loadError) {
    if (isRedirect(loadError)) {
      throw loadError;
    }

    error(404, t('server.collectionNotFound'));
  }
}

/** @type {import('./$types').Actions} */
export const actions = {
  saveCollection: async ({ params, request }) => {
    guardStudio();

    const locale = getOperatorLocale();
    const t = getOperatorTranslator();

    try {
      assertContentId(params.id, t('fields.collectionId'), locale);
      const formData = await request.formData();
      const itemIds = formData.getAll('item_ids').map((value) => String(value).trim()).filter(Boolean);

      if (itemIds.length === 0) {
        throw new Error(translate('errors.collectionNeedsItems', locale));
      }

      const collection = {
        id: params.id,
        title: requiredField(formData.get('title'), t('fields.collectionTitle'), locale),
        description: requiredField(formData.get('description'), t('fields.collectionDescription'), locale),
        items: itemIds
      };

      writeCollectionRecord(params.id, collection);
      const validation = runStructuralValidation();

      return {
        collectionStatus: validation.ok ? 'success' : 'warning',
        collectionMessage: validationMessage(validation, locale),
        collectionForm: loadCollectionForm(params.id),
        items: listItemSummaries()
      };
    } catch (saveError) {
      const message = saveError instanceof Error ? saveError.message : t('server.saveCollectionError');

      try {
        return fail(400, {
          collectionStatus: 'error',
          collectionMessage: message,
          collectionForm: loadCollectionForm(params.id),
          items: listItemSummaries()
        });
      } catch {
        return fail(400, {
          collectionStatus: 'error',
          collectionMessage: message
        });
      }
    }
  },

  deleteCollection: async ({ params }) => {
    guardStudio();

    const locale = getOperatorLocale();
    const t = getOperatorTranslator();

    try {
      assertContentId(params.id, t('fields.collectionId'), locale);
      const collection = readCollectionRecord(params.id);
      const title = typeof collection.title === 'string' ? collection.title : params.id;

      deleteCollectionRecord(params.id, locale);
      runStructuralValidation();

      redirect(303, `/studio/collections?deleted=${encodeURIComponent(title)}`);
    } catch (deleteError) {
      if (isRedirect(deleteError)) {
        throw deleteError;
      }

      const message =
        deleteError instanceof Error ? deleteError.message : t('server.deleteCollectionError');

      try {
        return fail(400, {
          collectionStatus: 'error',
          collectionMessage: message,
          collectionForm: loadCollectionForm(params.id),
          items: listItemSummaries()
        });
      } catch {
        return fail(400, {
          collectionStatus: 'error',
          collectionMessage: message
        });
      }
    }
  }
};
