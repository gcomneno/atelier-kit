// @ts-nocheck

import { fail } from '@sveltejs/kit';
import { guardStudio } from '$lib/server/studio-guard.js';
import {
  listItemSummaries,
  loadCatalogForm,
  runStructuralValidation,
  validationMessage,
  writeCatalogForm,
  writeItemSortOrders
} from '$lib/server/studio-io.js';
import { getOperatorLocale, getOperatorTranslator } from '$lib/i18n/server.js';

export function load({ url }) {
  guardStudio();
  const locale = getOperatorLocale();

  return {
    objectNamesForm: loadCatalogForm(locale),
    items: listItemSummaries(),
    deletedItemTitle: url.searchParams.get('deleted') ?? '',
    missingItemId: url.searchParams.get('missing') ?? ''
  };
}

/** @type {import('./$types').Actions} */
export const actions = {
  saveItemNames: async ({ request }) => {
    guardStudio();

    const locale = getOperatorLocale();
    const t = getOperatorTranslator();

    try {
      const formData = await request.formData();
      const currentCatalogForm = loadCatalogForm(locale);

      writeCatalogForm(
        {
          ...currentCatalogForm,
          item_name_singular: formData.get('item_name_singular'),
          item_name_plural: formData.get('item_name_plural')
        },
        locale
      );

      const validation = runStructuralValidation();

      return {
        itemNamesStatus: validation.ok ? 'success' : 'warning',
        itemNamesMessage: validationMessage(validation, locale),
        objectNamesForm: loadCatalogForm(locale),
        items: listItemSummaries()
      };
    } catch (error) {
      return fail(400, {
        itemNamesStatus: 'error',
        itemNamesMessage: error instanceof Error ? error.message : t('server.saveItemNamesError'),
        objectNamesForm: loadCatalogForm(locale),
        items: listItemSummaries()
      });
    }
  },

  saveItemOrder: async ({ request }) => {
    guardStudio();

    const locale = getOperatorLocale();
    const t = getOperatorTranslator();

    try {
      const formData = await request.formData();
      const itemIds = formData
        .getAll('item_ids')
        .map((value) => String(value).trim())
        .filter(Boolean);

      writeItemSortOrders(itemIds, locale);

      const validation = runStructuralValidation();

      return {
        itemOrderStatus: validation.ok ? 'success' : 'warning',
        itemOrderMessage: validationMessage(validation, locale),
        items: listItemSummaries()
      };
    } catch (error) {
      return fail(400, {
        itemOrderStatus: 'error',
        itemOrderMessage: error instanceof Error ? error.message : t('server.saveItemOrderError'),
        items: listItemSummaries()
      });
    }
  }
};
