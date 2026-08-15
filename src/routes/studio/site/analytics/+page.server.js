// @ts-nocheck

import { guardStudio } from '$lib/server/studio-guard.js';
import {
  loadAnalyticsForm,
  saveAnalyticsAction
} from '$lib/server/studio-site-server.js';

export function load() {
  guardStudio();

  return {
    analyticsForm: loadAnalyticsForm()
  };
}

/** @type {import('./$types').Actions} */
export const actions = {
  saveAnalytics: saveAnalyticsAction
};
