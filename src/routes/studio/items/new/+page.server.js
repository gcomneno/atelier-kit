// @ts-nocheck

import { fail, isRedirect, redirect } from '@sveltejs/kit';
import { guardStudio } from '$lib/server/studio-guard.js';
import {
  createItemRecord,
  getItemRelationAuthoringData,
  listItemSummaries,
  runStructuralValidation,
  saveItemImageUpload,
  validationMessage,
  writeItemRecord
} from '$lib/server/studio-io.js';
import { getStudioItemRelationRows, parseAndValidateStudioItemRelations } from '$lib/studio-item-relations.js';
import { localizedItemPresets } from '$lib/i18n/index.js';
import { getOperatorLocale, getOperatorTranslator } from '$lib/i18n/server.js';
import { titleFromItemId } from '$lib/item-presets.js';

export function load() {
  guardStudio();
  const locale = getOperatorLocale();

  return {
    presets: localizedItemPresets(locale),
    defaultPreset: 'default',
    relationAuthoring: getItemRelationAuthoringData()
  };
}

/** @type {import('./$types').Actions} */
export const actions = {
  createItem: async ({ request }) => {
    guardStudio();

    const locale = getOperatorLocale();
    const t = getOperatorTranslator();
    const formData = await request.formData();
    const id = String(formData.get('id') ?? '').trim();
    const titleInput = String(formData.get('title') ?? '').trim();
    const title = titleInput || titleFromItemId(id);
    const preset = String(formData.get('preset') ?? 'default');
    const description = String(formData.get('description') ?? '');
    const relationRows = getStudioItemRelationRows(parseRelationRowsSafely(formData));
    const form = { id, title, preset, description, relationRows };

    try {
      const relations = parseAndValidateStudioItemRelations(formData, id, listItemSummaries(), locale);
      const item = createItemRecord(
        {
          id,
          title,
          preset,
          description,
          relations
        },
        locale
      );

      const upload = formData.get('image_upload');

      if (upload instanceof File && upload.size > 0) {
        const imageFile = await saveItemImageUpload(id, upload, locale);
        writeItemRecord(id, {
          ...item,
          image_file: imageFile
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

      redirect(303, `/studio/items/${id}`);
    } catch (error) {
      if (isRedirect(error)) {
        throw error;
      }

      return fail(400, {
        createStatus: 'error',
        createMessage: error instanceof Error ? error.message : t('server.createItemError'),
        form
      });
    }
  }
};

function parseRelationRowsSafely(formData) {
  const types = formData.getAll('relation_types');
  const targets = formData.getAll('relation_targets');
  const labels = formData.getAll('relation_labels');
  return types.map((type, index) => ({ type: String(type), target: String(targets[index] ?? ''), label: String(labels[index] ?? '') }));
}
