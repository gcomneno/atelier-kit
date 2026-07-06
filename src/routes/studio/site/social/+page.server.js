// @ts-nocheck

import { guardStudio } from '$lib/server/studio-guard.js';
import { loadSocialForm, saveSocialAction } from '$lib/server/studio-site-server.js';

export function load() {
  guardStudio();
  return {
    socialForm: loadSocialForm()
  };
}

/** @type {import('./$types').Actions} */
export const actions = {
  saveSocial: saveSocialAction
};
