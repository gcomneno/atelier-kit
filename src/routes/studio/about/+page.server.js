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
import { getOperatorLocale, getOperatorTranslator } from '$lib/i18n/server.js';

export function load() {
  guardStudio();
  const locale = getOperatorLocale();

  return {
    aboutForm: loadAboutForm(locale)
  };
}

/** @type {import('./$types').Actions} */
export const actions = {
  saveAbout: async ({ request }) => {
    guardStudio();

    const locale = getOperatorLocale();
    const t = getOperatorTranslator();

    try {
      const formData = await request.formData();

      writeAboutForm(
        {
          enabled: checkboxEnabled(formData.get('enabled')),
          title: formData.get('title'),
          intro: formData.get('intro'),
          section_heading: formData.get('section_heading'),
          section_body: formData.get('section_body')
        },
        locale
      );

      const validation = runStructuralValidation();

      return {
        aboutStatus: validation.ok ? 'success' : 'warning',
        aboutMessage: validationMessage(validation, locale),
        aboutForm: loadAboutForm(locale)
      };
    } catch (error) {
      return fail(400, {
        aboutStatus: 'error',
        aboutMessage: error instanceof Error ? error.message : t('server.saveAboutError'),
        aboutForm: loadAboutForm(locale)
      });
    }
  }
};
