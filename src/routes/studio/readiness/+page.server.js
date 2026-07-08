// @ts-nocheck

import { guardStudio } from '$lib/server/studio-guard.js';
import { runContentDoctorReport, runPublishPrepReport } from '$lib/server/studio-io.js';
import {
  getPublishLivePreview,
  runPublishLive
} from '$lib/server/studio-publish-live.js';
import { getSiteConfig } from '$lib/server/showcase.js';
import { loadOperatorLocale } from '$lib/i18n/load-operator-locale.js';
import { createTranslator } from '$lib/i18n/index.js';

export function load() {
  guardStudio();

  const report = runContentDoctorReport();
  const livePreview = getPublishLivePreview();
  const site = getSiteConfig();

  return {
    report,
    livePreview,
    siteUrl: site.url?.trim() || ''
  };
}

export const actions = {
  runPublishPrep: async () => {
    guardStudio();

    const locale = loadOperatorLocale();
    const t = createTranslator(locale);
    const prep = runPublishPrepReport();

    return {
      prep,
      message: prep.ok ? t('studio.readiness.publishOk') : t('studio.readiness.publishFailed')
    };
  },

  publishLive: async () => {
    guardStudio();

    const locale = loadOperatorLocale();
    const result = runPublishLive(locale);

    return {
      live: result,
      message: result.message,
      livePreview: getPublishLivePreview()
    };
  }
};
