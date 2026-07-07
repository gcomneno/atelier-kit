// @ts-nocheck

import { guardStudio } from '$lib/server/studio-guard.js';
import { getSiteConfig } from '$lib/server/showcase.js';
import { resolveLocale } from '$lib/i18n/resolve-locale.js';
import { loadLayoutForm, saveLayoutAction } from '$lib/server/studio-site-server.js';

export function load() {
  guardStudio();
  const site = getSiteConfig();

  return {
    layoutForm: loadLayoutForm(),
    siteLocale: resolveLocale(site.language)
  };
}

/** @type {import('./$types').Actions} */
export const actions = {
  saveLayout: saveLayoutAction
};
