// @ts-nocheck

import { fail } from '@sveltejs/kit';
import { guardStudio } from '$lib/server/studio-guard.js';
import {
  applySignalCloudsFromForm,
  optionalField,
  readSignalCloudRecords,
  runStructuralValidation,
  validationMessage,
  writeSignalCloudRecords
} from '$lib/server/studio-io.js';
import { getOperatorLocale, getOperatorTranslator } from '$lib/i18n/server.js';
import { getStudioSignalCloudRows } from '$lib/studio-signal-clouds.js';
import { getSignalCloudFaqIssues } from '$lib/signal-cloud-faq-validation.js';

function loadSignalCloudForm(locale) {
  return getStudioSignalCloudRows(readSignalCloudRecords(locale));
}

export function load() {
  guardStudio();
  const locale = getOperatorLocale();

  return {
    clouds: loadSignalCloudForm(locale)
  };
}

/** @type {import('./$types').Actions} */
export const actions = {
  saveSignalClouds: async ({ request }) => {
    guardStudio();

    const locale = getOperatorLocale();
    const t = getOperatorTranslator();

    try {
      const formData = await request.formData();
      const original = readSignalCloudRecords(locale);
      const clouds = applySignalCloudsFromForm(original, formData);
      const faqIssue = getSignalCloudFaqIssues(clouds)[0];

      if (faqIssue) {
        return fail(400, {
          cloudStatus: 'error',
          cloudMessage: t(`validate.${faqIssue.key}`, {
            source: 'config/signal-clouds.yaml',
            cloudId: faqIssue.cloudId
          }),
          clouds: getStudioSignalCloudRows(clouds)
        });
      }

      writeSignalCloudRecords(clouds);
      const validation = runStructuralValidation();

      return {
        cloudStatus: validation.ok ? 'success' : 'warning',
        cloudMessage: validationMessage(validation, locale),
        clouds: loadSignalCloudForm(locale)
      };
    } catch (error) {
      return fail(400, {
        cloudStatus: 'error',
        cloudMessage: error instanceof Error ? error.message : t('server.saveCloudsError'),
        clouds: loadSignalCloudForm(locale)
      });
    }
  },

  removeCloud: async ({ request }) => {
    guardStudio();

    const locale = getOperatorLocale();
    const t = getOperatorTranslator();

    try {
      const formData = await request.formData();
      const cloudId = optionalField(formData.get('cloud_id'));

      if (!cloudId) {
        throw new Error(t('server.removeCloudError'));
      }

      const clouds = readSignalCloudRecords(locale).filter((cloud) => cloud.id !== cloudId);

      writeSignalCloudRecords(clouds);
      const validation = runStructuralValidation();

      return {
        cloudStatus: validation.ok ? 'success' : 'warning',
        cloudMessage: t('server.cloudRemoved'),
        clouds: loadSignalCloudForm(locale)
      };
    } catch (error) {
      return fail(400, {
        cloudStatus: 'error',
        cloudMessage: error instanceof Error ? error.message : t('server.removeCloudError'),
        clouds: loadSignalCloudForm(locale)
      });
    }
  }
};
