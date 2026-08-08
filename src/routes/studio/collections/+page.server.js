// @ts-nocheck

import { fail } from '@sveltejs/kit';
import { guardStudio } from '$lib/server/studio-guard.js';
import {
  getCatalogConfig,
  listCollectionSummaries,
  loadCollectionsEditorialForm,
  runStructuralValidation,
  validationMessage,
  writeCollectionSortOrders,
  writeCollectionsEditorialForm
} from '$lib/server/studio-io.js';
import {
  getOperatorLocale,
  getOperatorTranslator
} from '$lib/i18n/server.js';

export function load({ url }) {
  guardStudio();
  const locale = getOperatorLocale();

  return {
    catalog: getCatalogConfig(),
    collections: listCollectionSummaries(),
    collectionsEditorialForm:
      loadCollectionsEditorialForm(locale),
    deletedCollectionTitle:
      url.searchParams.get('deleted') ?? '',
    missingCollectionId:
      url.searchParams.get('missing') ?? ''
  };
}

/** @type {import('./$types').Actions} */
export const actions = {
  saveCollectionsEditorial: async ({ request }) => {
    guardStudio();

    const locale = getOperatorLocale();
    const t = getOperatorTranslator();

    try {
      const formData = await request.formData();

      writeCollectionsEditorialForm(
        {
          home_eyebrow: formData.get('home_eyebrow'),
          page_eyebrow: formData.get('page_eyebrow'),
          title: formData.get('title'),
          intro: formData.get('intro')
        },
        locale
      );

      const validation = runStructuralValidation();

      return {
        collectionsEditorialStatus:
          validation.ok ? 'success' : 'warning',
        collectionsEditorialMessage:
          validationMessage(validation, locale),
        collectionsEditorialForm:
          loadCollectionsEditorialForm(locale)
      };
    } catch (error) {
      return fail(400, {
        collectionsEditorialStatus: 'error',
        collectionsEditorialMessage:
          error instanceof Error
            ? error.message
            : t('server.saveCollectionsEditorialError'),
        collectionsEditorialForm:
          loadCollectionsEditorialForm(locale)
      });
    }
  },

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
        collectionOrderStatus:
          validation.ok ? 'success' : 'warning',
        collectionOrderMessage:
          validationMessage(validation, locale),
        collections: listCollectionSummaries()
      };
    } catch (error) {
      return fail(400, {
        collectionOrderStatus: 'error',
        collectionOrderMessage:
          error instanceof Error
            ? error.message
            : t('server.saveCollectionOrderError'),
        collections: listCollectionSummaries()
      });
    }
  }
};
