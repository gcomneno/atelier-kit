// @ts-nocheck

import { fail, redirect } from '@sveltejs/kit';
import { guardStudio } from '$lib/server/studio-guard.js';
import {
  createItemRecord,
  listItemPresetOptions,
  runStructuralValidation,
  saveItemImageUpload,
  validationMessage,
  writeItemRecord
} from '$lib/server/studio-io.js';
import { titleFromItemId } from '$lib/item-presets.js';

export function load() {
  guardStudio();

  return {
    presets: listItemPresetOptions(),
    defaultPreset: 'default'
  };
}

/** @type {import('./$types').Actions} */
export const actions = {
  createItem: async ({ request }) => {
    guardStudio();

    const formData = await request.formData();
    const id = String(formData.get('id') ?? '').trim();
    const titleInput = String(formData.get('title') ?? '').trim();
    const title = titleInput || titleFromItemId(id);
    const preset = String(formData.get('preset') ?? 'default');
    const description = String(formData.get('description') ?? '');
    const form = { id, title, preset, description };

    try {
      const item = createItemRecord({
        id,
        title,
        preset,
        description
      });

      const upload = formData.get('image_upload');

      if (upload instanceof File && upload.size > 0) {
        const imageFile = await saveItemImageUpload(id, upload);
        writeItemRecord(id, {
          ...item,
          image_file: imageFile
        });
      }

      const validation = runStructuralValidation();

      if (!validation.ok) {
        return fail(400, {
          createStatus: 'warning',
          createMessage: validationMessage(validation),
          form
        });
      }

      redirect(303, `/studio/items/${id}`);
    } catch (error) {
      if (error instanceof Response) {
        throw error;
      }

      return fail(400, {
        createStatus: 'error',
        createMessage: error instanceof Error ? error.message : 'Could not create item.',
        form
      });
    }
  }
};
