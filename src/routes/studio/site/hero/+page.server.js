// @ts-nocheck

import { guardStudio } from '$lib/server/studio-guard.js';
import {
  loadAppearanceForm,
  loadHeroBannerForm,
  loadSiteForm,
  saveHeroBannerAction
} from '$lib/server/studio-site-server.js';

export function load() {
  guardStudio();
  return {
    siteForm: loadSiteForm(),
    appearanceForm: loadAppearanceForm(),
    heroBannerForm: loadHeroBannerForm()
  };
}

/** @type {import('./$types').Actions} */
export const actions = {
  saveHeroBanner: saveHeroBannerAction
};
