// @ts-nocheck

import { fail } from '@sveltejs/kit';
import { guardStudio } from '$lib/server/studio-guard.js';
import {
  checkboxEnabled,
  loadAboutForm,
  runStructuralValidation,
  saveAboutPortraitUpload,
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
      const current = loadAboutForm(locale);
      const showPortrait = checkboxEnabled(formData.get('show_portrait'));
      const upload = formData.get('portrait_upload');
      let portraitImageFile = String(formData.get('portrait_image_file') ?? '').trim();

      if (showPortrait && upload instanceof File && upload.size > 0) {
        portraitImageFile = await saveAboutPortraitUpload(upload, locale);
      }

      writeAboutForm(
        {
          title: formData.get('title'),
          intro: formData.get('intro'),
          section_heading: formData.get('section_heading'),
          section_body: formData.get('section_body'),
          show_portrait: showPortrait,
          portrait_image_file: showPortrait ? portraitImageFile : current.portrait_image_file,
          portrait_image_alt: showPortrait
            ? formData.get('portrait_image_alt')
            : current.portrait_image_alt,
          portrait_caption: formData.get('portrait_caption')
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
