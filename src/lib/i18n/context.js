import { getContext, setContext } from 'svelte';
import { createTranslator } from '$lib/i18n/index.js';

const I18N_KEY = 'atelier-i18n';

/** @typedef {(key: string, params?: Record<string, string | number>) => string} Translator */

/**
 * @param {() => string} localeGetter
 */
export function setI18nContext(localeGetter) {
  /** @type {Translator} */
  const t = (key, params = {}) => createTranslator(localeGetter())(key, params);
  setContext(I18N_KEY, t);
}

/** @returns {Translator} */
export function useI18n() {
  const translator = getContext(I18N_KEY);

  if (typeof translator !== 'function') {
    return (key) => key;
  }

  return translator;
}
