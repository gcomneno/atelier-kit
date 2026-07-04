// @ts-nocheck

import { error, fail } from '@sveltejs/kit';
import { guardStudio } from '$lib/server/studio-guard.js';
import {
  assertContentId,
  listItemSummaries,
  optionalField,
  readCollectionRecord,
  requiredField,
  runStructuralValidation,
  validationMessage,
  writeCollectionRecord
} from '$lib/server/studio-io.js';

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

  try {
    assertContentId(params.id, 'Collection id');

    return {
      collectionForm: loadCollectionForm(params.id),
      items: listItemSummaries()
    };
  } catch {
    error(404, 'Collection not found');
  }
}

/** @type {import('./$types').Actions} */
export const actions = {
  saveCollection: async ({ params, request }) => {
    guardStudio();

    try {
      assertContentId(params.id, 'Collection id');
      const formData = await request.formData();
      const itemIds = formData.getAll('item_ids').map((value) => String(value).trim()).filter(Boolean);

      if (itemIds.length === 0) {
        throw new Error('Choose at least one item for this collection.');
      }

      const collection = {
        id: params.id,
        title: requiredField(formData.get('title'), 'Collection title'),
        description: requiredField(formData.get('description'), 'Collection description'),
        items: itemIds
      };

      writeCollectionRecord(params.id, collection);
      const validation = runStructuralValidation();

      return {
        collectionStatus: validation.ok ? 'success' : 'warning',
        collectionMessage: validationMessage(validation),
        collectionForm: loadCollectionForm(params.id),
        items: listItemSummaries()
      };
    } catch (saveError) {
      const message = saveError instanceof Error ? saveError.message : 'Could not save collection.';

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
