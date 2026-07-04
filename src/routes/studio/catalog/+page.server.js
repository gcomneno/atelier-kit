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

export function load() {
  guardStudio();

  return {
    catalogForm: loadCatalogForm()
  };
}

/** @type {import('./$types').Actions} */
export const actions = {
  saveCatalog: async ({ request }) => {
    guardStudio();

    try {
      const formData = await request.formData();

      writeCatalogForm({
        item_name_singular: formData.get('item_name_singular'),
        item_name_plural: formData.get('item_name_plural'),
        show_price: checkboxEnabled(formData.get('show_price')),
        show_availability: checkboxEnabled(formData.get('show_availability')),
        show_material: checkboxEnabled(formData.get('show_material')),
        show_dimensions: checkboxEnabled(formData.get('show_dimensions')),
        show_status: checkboxEnabled(formData.get('show_status')),
        show_meta: checkboxEnabled(formData.get('show_meta'))
      });

      const validation = runStructuralValidation();

      return {
        catalogStatus: validation.ok ? 'success' : 'warning',
        catalogMessage: validationMessage(validation),
        catalogForm: loadCatalogForm()
      };
    } catch (error) {
      return fail(400, {
        catalogStatus: 'error',
        catalogMessage: error instanceof Error ? error.message : 'Could not save catalog settings.',
        catalogForm: loadCatalogForm()
      });
    }
  }
};
