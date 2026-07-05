/** @typedef {'en' | 'it'} SupportedLocale */

/** @type {SupportedLocale[]} */
export const SUPPORTED_LOCALES = ['en', 'it'];

/**
 * Map site.yaml language values to a supported operator locale.
 * @param {unknown} input
 * @returns {SupportedLocale}
 */
export function resolveLocale(input) {
  if (typeof input !== 'string' || input.trim() === '') {
    return 'en';
  }

  const base = input.trim().toLowerCase().split(/[-_]/)[0];

  if (base === 'it' || base === 'italian' || base === 'italiano') {
    return 'it';
  }

  return 'en';
}
