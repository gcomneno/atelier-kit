// @ts-nocheck

import { guardStudio } from '$lib/server/studio-guard.js';
import {
  loadAppearanceForm,
  localizedAppearancePresets,
  saveAppearanceAction
} from '$lib/server/studio-site-server.js';
import { getOperatorLocale } from '$lib/i18n/server.js';

export function load() {
  guardStudio();
  const locale = getOperatorLocale();
  return {
    appearanceForm: loadAppearanceForm(),
    appearancePresets: localizedAppearancePresets(locale)
  };
}

/** @type {import('./$types').Actions} */
export const actions = {
  saveAppearance: saveAppearanceAction
};
