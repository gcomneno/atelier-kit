import en from './messages/en.js';
import it from './messages/it.js';
import { resolveLocale } from './resolve-locale.js';
import { FONT_PRESET_IDS } from '../site-typography.js';

/** @typedef {import('./resolve-locale.js').SupportedLocale} SupportedLocale */

/** @type {Record<SupportedLocale, Record<string, unknown>>} */
const catalogs = { en, it };

/**
 * @param {Record<string, unknown>} catalog
 * @param {string} path
 */
function lookup(catalog, path) {
  return path.split('.').reduce((value, key) => {
    if (value && typeof value === 'object' && key in /** @type {Record<string, unknown>} */ (value)) {
      return /** @type {Record<string, unknown>} */ (value)[key];
    }

    return undefined;
  }, /** @type {unknown} */ (catalog));
}

/**
 * @param {string} key
 * @param {SupportedLocale | string} [locale]
 * @param {Record<string, string | number>} [params]
 */
export function translate(key, locale = 'en', params = {}) {
  const resolved = resolveLocale(locale);
  const catalog = catalogs[resolved] ?? catalogs.en;
  let text = lookup(catalog, key);

  if (typeof text !== 'string') {
    text = lookup(catalogs.en, key);
  }

  if (typeof text !== 'string') {
    return key;
  }

  return Object.entries(params).reduce(
    (result, [name, value]) => result.replaceAll(`{${name}}`, String(value)),
    text
  );
}

/**
 * @param {SupportedLocale | string} locale
 */
export function createTranslator(locale) {
  return (/** @type {string} */ key, /** @type {Record<string, string | number>} */ params = {}) =>
    translate(key, locale, params);
}

export { resolveLocale } from './resolve-locale.js';

/**
 * @param {SupportedLocale | string} locale
 * @param {string} id
 */
export function appearancePresetLabel(locale, id) {
  return translate(`presets.appearance.${id}`, locale);
}

/**
 * @param {SupportedLocale | string} locale
 * @param {string} id
 */
export function fontPresetLabel(locale, id) {
  return translate(`presets.font.${id}`, locale);
}

/**
 * @param {SupportedLocale | string} locale
 * @param {string} id
 */
export function itemPresetLabel(locale, id) {
  return translate(`presets.items.${id}`, locale);
}

/**
 * @param {SupportedLocale | string} locale
 */
export function localizedAppearancePresets(locale) {
  return [
    { id: 'warm', label: appearancePresetLabel(locale, 'warm') },
    { id: 'neutral', label: appearancePresetLabel(locale, 'neutral') },
    { id: 'dark', label: appearancePresetLabel(locale, 'dark') },
    { id: 'custom', label: appearancePresetLabel(locale, 'custom') }
  ];
}

/**
 * @param {SupportedLocale | string} locale
 */
export function localizedFontPresets(locale) {
  return FONT_PRESET_IDS.map((id) => ({
    id,
    label: fontPresetLabel(locale, id)
  }));
}

/**
 * @param {SupportedLocale | string} locale
 */
export function localizedItemPresets(locale) {
  return ['default', 'handmade', 'artwork', 'jewelry', 'print', 'furniture', 'writing'].map((id) => ({
    id,
    label: itemPresetLabel(locale, id)
  }));
}

/**
 * @param {SupportedLocale | string} locale
 */
export function getOperatorTranslator(locale) {
  return createTranslator(resolveLocale(locale));
}

/**
 * @param {SupportedLocale | string} locale
 */
export function createVisitorTranslator(locale) {
  return createTranslator(resolveLocale(locale));
}

/**
 * @param {SupportedLocale | string} [locale]
 */
export function getVisitorTranslator(locale = 'en') {
  return createVisitorTranslator(locale);
}
