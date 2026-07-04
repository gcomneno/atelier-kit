// @ts-nocheck

import { fail } from '@sveltejs/kit';
import { guardStudio } from '$lib/server/studio-guard.js';
import {
  checkboxEnabled,
  loadAboutForm,
  runStructuralValidation,
  validationMessage,
  writeAboutForm
} from '$lib/server/studio-io.js';

export function load() {
  guardStudio();

  return {
    aboutForm: loadAboutForm()
  };
}

/** @type {import('./$types').Actions} */
export const actions = {
  saveAbout: async ({ request }) => {
    guardStudio();

    try {
      const formData = await request.formData();

      writeAboutForm({
        enabled: checkboxEnabled(formData.get('enabled')),
        title: formData.get('title'),
        intro: formData.get('intro'),
        section_heading: formData.get('section_heading'),
        section_body: formData.get('section_body')
      });

      const validation = runStructuralValidation();

      return {
        aboutStatus: validation.ok ? 'success' : 'warning',
        aboutMessage: validationMessage(validation),
        aboutForm: loadAboutForm()
      };
    } catch (error) {
      return fail(400, {
        aboutStatus: 'error',
        aboutMessage: error instanceof Error ? error.message : 'Could not save about page.',
        aboutForm: loadAboutForm()
      });
    }
  }
};
