// @ts-nocheck

import { fail } from '@sveltejs/kit';
import { guardStudio } from '$lib/server/studio-guard.js';
import {
  checkboxEnabled,
  loadCatalogForm,
  runStructuralValidation,
  validationMessage,
  writeCatalogForm
} from '$lib/server/studio-io.js';
import { getOperatorLocale, getOperatorTranslator } from '$lib/i18n/server.js';

export function load() {
  guardStudio();
  const locale = getOperatorLocale();

  return {
    catalogForm: loadCatalogForm(locale)
  };
}

/** @type {import('./$types').Actions} */
export const actions = {
  saveCatalog: async ({ request }) => {
    guardStudio();

    const locale = getOperatorLocale();
    const t = getOperatorTranslator();

    try {
      const formData = await request.formData();

      writeCatalogForm(
        {
          item_name_singular: formData.get('item_name_singular'),
          item_name_plural: formData.get('item_name_plural'),
          show_price: checkboxEnabled(formData.get('show_price')),
          show_availability: checkboxEnabled(formData.get('show_availability')),
          show_material: checkboxEnabled(formData.get('show_material')),
          show_dimensions: checkboxEnabled(formData.get('show_dimensions')),
          show_status: checkboxEnabled(formData.get('show_status')),
          show_meta: checkboxEnabled(formData.get('show_meta'))
        },
        locale
      );

      const validation = runStructuralValidation();

      return {
        catalogStatus: validation.ok ? 'success' : 'warning',
        catalogMessage: validationMessage(validation, locale),
        catalogForm: loadCatalogForm(locale)
      };
    } catch (error) {
      return fail(400, {
        catalogStatus: 'error',
        catalogMessage: error instanceof Error ? error.message : t('server.saveCatalogError'),
        catalogForm: loadCatalogForm(locale)
      });
    }
  }
};
