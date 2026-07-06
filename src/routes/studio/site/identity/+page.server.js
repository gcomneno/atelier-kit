// @ts-nocheck

import { guardStudio } from '$lib/server/studio-guard.js';
import { loadSiteForm, saveSiteAction } from '$lib/server/studio-site-server.js';

export function load() {
  guardStudio();
  return {
    siteForm: loadSiteForm()
  };
}

/** @type {import('./$types').Actions} */
export const actions = {
  saveSite: saveSiteAction
};
