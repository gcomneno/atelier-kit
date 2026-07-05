import { getSiteConfig } from '$lib/server/showcase.js';
import { resolveLocale } from '$lib/i18n/resolve-locale.js';
import { createTranslator } from '$lib/i18n/index.js';

export function getOperatorLocale() {
  return resolveLocale(getSiteConfig().language);
}

export function getOperatorTranslator() {
  return createTranslator(getOperatorLocale());
}
