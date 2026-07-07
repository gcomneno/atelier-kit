// @ts-nocheck

import { fail, isRedirect, redirect } from '@sveltejs/kit';
import { guardStudio } from '$lib/server/studio-guard.js';
import {
  createNewsRecord,
  runStructuralValidation,
  saveNewsImageUpload,
  validationMessage,
  writeNewsRecord
} from '$lib/server/studio-io.js';
import { getOperatorLocale, getOperatorTranslator } from '$lib/i18n/server.js';
import { titleFromItemId } from '$lib/item-presets.js';

function todayIsoDate() {
  return new Date().toISOString().slice(0, 10);
}

export function load() {
  guardStudio();

  return {
    defaultDate: todayIsoDate()
  };
}

/** @type {import('./$types').Actions} */
export const actions = {
  createNews: async ({ request }) => {
    guardStudio();

    const locale = getOperatorLocale();
    const t = getOperatorTranslator();
    const formData = await request.formData();
    const id = String(formData.get('id') ?? '').trim();
    const titleInput = String(formData.get('title') ?? '').trim();
    const title = titleInput || titleFromItemId(id);
    const date = String(formData.get('date') ?? '').trim();
    const body = String(formData.get('body') ?? '');
    const excerpt = String(formData.get('excerpt') ?? '');
    const imageAlt = String(formData.get('image_alt') ?? '');
    const form = { id, title, date, body, excerpt, image_alt: imageAlt };

    try {
      const post = createNewsRecord(
        {
          id,
          title,
          date,
          body,
          excerpt
        },
        locale
      );

      const upload = formData.get('image_upload');

      if (upload instanceof File && upload.size > 0) {
        const imageFile = await saveNewsImageUpload(id, upload, locale);
        const imageAlt = String(formData.get('image_alt') ?? '').trim();

        writeNewsRecord(id, {
          ...post,
          image_file: imageFile,
          ...(imageAlt ? { image_alt: imageAlt } : {})
        });
      }

      const validation = runStructuralValidation();

      if (!validation.ok) {
        return fail(400, {
          createStatus: 'warning',
          createMessage: validationMessage(validation, locale),
          form
        });
      }

      redirect(303, `/studio/news/${id}`);
    } catch (error) {
      if (isRedirect(error)) {
        throw error;
      }

      return fail(400, {
        createStatus: 'error',
        createMessage: error instanceof Error ? error.message : t('server.createNewsError'),
        form
      });
    }
  }
};
