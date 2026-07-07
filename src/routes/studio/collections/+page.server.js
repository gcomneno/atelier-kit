// @ts-nocheck

import { fail } from '@sveltejs/kit';
import { guardStudio } from '$lib/server/studio-guard.js';
import {
  listCollectionSummaries,
  runStructuralValidation,
  validationMessage,
  writeCollectionSortOrders
} from '$lib/server/studio-io.js';
import { getOperatorLocale, getOperatorTranslator } from '$lib/i18n/server.js';

export function load({ url }) {
  guardStudio();

  return {
    collections: listCollectionSummaries(),
    deletedCollectionTitle: url.searchParams.get('deleted') ?? '',
    missingCollectionId: url.searchParams.get('missing') ?? ''
  };
}

/** @type {import('./$types').Actions} */
export const actions = {
  saveCollectionOrder: async ({ request }) => {
    guardStudio();

    const locale = getOperatorLocale();
    const t = getOperatorTranslator();

    try {
      const formData = await request.formData();
      const collectionIds = formData
        .getAll('collection_ids')
        .map((value) => String(value).trim())
        .filter(Boolean);

      writeCollectionSortOrders(collectionIds, locale);

      const validation = runStructuralValidation();

      return {
        collectionOrderStatus: validation.ok ? 'success' : 'warning',
        collectionOrderMessage: validationMessage(validation, locale),
        collections: listCollectionSummaries()
      };
    } catch (error) {
      return fail(400, {
        collectionOrderStatus: 'error',
        collectionOrderMessage:
          error instanceof Error ? error.message : t('server.saveCollectionOrderError'),
        collections: listCollectionSummaries()
      });
    }
  }
};
