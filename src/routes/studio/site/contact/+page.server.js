// @ts-nocheck

import { guardStudio } from '$lib/server/studio-guard.js';
import { loadContactForm, saveContactAction } from '$lib/server/studio-site-server.js';

export function load() {
  guardStudio();
  return {
    contactForm: loadContactForm()
  };
}

/** @type {import('./$types').Actions} */
export const actions = {
  saveContact: saveContactAction
};
