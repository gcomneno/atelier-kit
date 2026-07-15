// @ts-nocheck

import { guardStudio } from '$lib/server/studio-guard.js';
import {
  acknowledgeStudioShutdownAction,
  loadLanguageForm,
  saveLanguageAction,
  shutdownStudioAction
} from '$lib/server/studio-system-server.js';

export function load() {
  guardStudio();
  return {
    languageForm: loadLanguageForm()
  };
}

/** @type {import('./$types').Actions} */
export const actions = {
  saveLanguage: saveLanguageAction,
  shutdown: shutdownStudioAction,
  shutdownRendered: acknowledgeStudioShutdownAction
};
