// @ts-nocheck

import { dev } from '$app/environment';
import { fail } from '@sveltejs/kit';
import { guardStudio } from '$lib/server/studio-guard.js';
import { resolveLocale } from '$lib/i18n/resolve-locale.js';
import { getOperatorLocale, getOperatorTranslator } from '$lib/i18n/server.js';
import {
  readProjectYaml,
  runStructuralValidation,
  validationMessage,
  writeProjectYaml
} from '$lib/server/studio-io.js';

function isRecord(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

/** @param {{ ok: boolean, output: string }} validation @param {string} locale */
function saveMessage(validation, locale) {
  return validationMessage(validation, locale);
}

export function loadLanguageForm() {
  const data = readProjectYaml('config/site.yaml');
  const site = data.site;

  if (!isRecord(site)) {
    throw new Error('config/site.yaml is missing a site object.');
  }

  return {
    language: resolveLocale(site.language)
  };
}

export async function saveLanguageAction({ request }) {
  guardStudio();

  const locale = getOperatorLocale();
  const t = getOperatorTranslator();
  const formData = await request.formData();

  try {
    const data = readProjectYaml('config/site.yaml');

    if (!isRecord(data.site)) {
      throw new Error(t('errors.missingSite'));
    }

    const site = { ...data.site };
    site.language = resolveLocale(formData.get('language'));
    writeProjectYaml('config/site.yaml', { site });
    const validation = runStructuralValidation();

    return {
      languageStatus: validation.ok ? 'success' : 'warning',
      languageMessage: saveMessage(validation, locale),
      languageForm: loadLanguageForm()
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : t('server.saveLanguageError');
    return fail(400, {
      languageStatus: 'error',
      languageMessage: message,
      languageForm: loadLanguageForm()
    });
  }
}

export async function shutdownStudioAction() {
  guardStudio();

  const t = getOperatorTranslator();

  if (!dev && process.env.ATELIER_STUDIO !== '1') {
    return fail(403, {
      shutdownStatus: 'error',
      shutdownMessage: t('studio.system.shutdown.unavailable')
    });
  }

  setTimeout(() => {
    process.exit(0);
  }, 400);

  return {
    shutdownStatus: 'success',
    shutdownMessage: t('studio.system.shutdown.success')
  };
}
