// @ts-nocheck

import { guardStudio } from '$lib/server/studio-guard.js';
import { LAYOUT_PRESETS, loadLayoutForm, saveLayoutAction } from '$lib/server/studio-site-server.js';

export function load() {
  guardStudio();
  return {
    layoutForm: loadLayoutForm(),
    layoutPresets: LAYOUT_PRESETS
  };
}

/** @type {import('./$types').Actions} */
export const actions = {
  saveLayout: saveLayoutAction
};
