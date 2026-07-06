// @ts-nocheck

import { guardStudio } from '$lib/server/studio-guard.js';
import { loadFooterForm, saveFooterAction } from '$lib/server/studio-site-server.js';

export function load() {
  guardStudio();
  return {
    footerForm: loadFooterForm()
  };
}

/** @type {import('./$types').Actions} */
export const actions = {
  saveFooter: saveFooterAction
};
