import { getContext, setContext } from 'svelte';
import { createVisitorTranslator } from '$lib/i18n/index.js';

const VISITOR_I18N_KEY = 'atelier-visitor-i18n';

/** @typedef {(key: string, params?: Record<string, string | number>) => string} VisitorTranslator */

/**
 * @param {() => string} localeGetter
 */
export function setVisitorI18nContext(localeGetter) {
  /** @type {VisitorTranslator} */
  const t = (key, params = {}) => createVisitorTranslator(localeGetter())(`visitor.${key}`, params);
  setContext(VISITOR_I18N_KEY, t);
}

/** @returns {VisitorTranslator} */
export function useVisitorI18n() {
  const translator = getContext(VISITOR_I18N_KEY);

  if (typeof translator !== 'function') {
    return (key) => key;
  }

  return translator;
}
