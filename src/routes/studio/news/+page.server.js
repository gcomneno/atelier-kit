// @ts-nocheck

import { fail } from '@sveltejs/kit';
import { guardStudio } from '$lib/server/studio-guard.js';
import {
  listNewsSummaries,
  runStructuralValidation,
  validationMessage,
  writeNewsSortOrders
} from '$lib/server/studio-io.js';
import { getOperatorLocale, getOperatorTranslator } from '$lib/i18n/server.js';

export function load({ url }) {
  guardStudio();

  return {
    posts: listNewsSummaries(),
    deletedPostTitle: url.searchParams.get('deleted') ?? '',
    missingPostId: url.searchParams.get('missing') ?? ''
  };
}

/** @type {import('./$types').Actions} */
export const actions = {
  saveNewsOrder: async ({ request }) => {
    guardStudio();

    const locale = getOperatorLocale();
    const t = getOperatorTranslator();

    try {
      const formData = await request.formData();
      const postIds = formData
        .getAll('post_ids')
        .map((value) => String(value).trim())
        .filter(Boolean);

      writeNewsSortOrders(postIds, locale);

      const validation = runStructuralValidation();

      return {
        newsOrderStatus: validation.ok ? 'success' : 'warning',
        newsOrderMessage: validationMessage(validation, locale),
        posts: listNewsSummaries()
      };
    } catch (error) {
      return fail(400, {
        newsOrderStatus: 'error',
        newsOrderMessage: error instanceof Error ? error.message : t('server.saveNewsOrderError'),
        posts: listNewsSummaries()
      });
    }
  }
};
