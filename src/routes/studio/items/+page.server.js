// @ts-nocheck

import { fail } from '@sveltejs/kit';
import { guardStudio } from '$lib/server/studio-guard.js';
import {
  listItemSummaries,
  runStructuralValidation,
  validationMessage,
  writeItemSortOrders
} from '$lib/server/studio-io.js';
import { getOperatorLocale, getOperatorTranslator } from '$lib/i18n/server.js';

export function load({ url }) {
  guardStudio();

  return {
    items: listItemSummaries(),
    deletedItemTitle: url.searchParams.get('deleted') ?? '',
    missingItemId: url.searchParams.get('missing') ?? ''
  };
}

/** @type {import('./$types').Actions} */
export const actions = {
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
