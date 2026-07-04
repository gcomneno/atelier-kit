// @ts-nocheck

import { fail, redirect } from '@sveltejs/kit';
import { guardStudio } from '$lib/server/studio-guard.js';
import {
  createCollectionRecord,
  listItemSummaries,
  runStructuralValidation,
  validationMessage
} from '$lib/server/studio-io.js';
import { titleFromItemId } from '$lib/item-presets.js';

export function load() {
  guardStudio();

  return {
    items: listItemSummaries()
  };
}

/** @type {import('./$types').Actions} */
export const actions = {
  createCollection: async ({ request }) => {
    guardStudio();

    const formData = await request.formData();
    const id = String(formData.get('id') ?? '').trim();
    const titleInput = String(formData.get('title') ?? '').trim();
    const title = titleInput || titleFromItemId(id);
    const description = String(formData.get('description') ?? '');
    const itemIds = formData.getAll('item_ids').map((value) => String(value).trim()).filter(Boolean);
    const form = { id, title, description, item_ids: itemIds };

    try {
      createCollectionRecord({
        id,
        title,
        description,
        items: itemIds
      });

      const validation = runStructuralValidation();

      if (!validation.ok) {
        return fail(400, {
          createStatus: 'warning',
          createMessage: validationMessage(validation),
          form,
          items: listItemSummaries()
        });
      }

      redirect(303, `/studio/collections/${id}`);
    } catch (error) {
      if (error instanceof Response) {
        throw error;
      }

      return fail(400, {
        createStatus: 'error',
        createMessage: error instanceof Error ? error.message : 'Could not create collection.',
        form,
        items: listItemSummaries()
      });
    }
  }
};
