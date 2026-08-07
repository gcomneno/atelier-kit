import { createTranslator } from './i18n/index.js';

/**
 * @typedef {{
 *   home_eyebrow: string,
 *   page_eyebrow: string
 * }} CollectionsEditorialConfig
 */

/**
 * @param {unknown} value
 * @returns {string}
 */
function normalizedOptionalString(value) {
  return typeof value === 'string' ? value.trim() : '';
}

/**
 * Normalize optional consumer-owned editorial wording.
 *
 * Missing or malformed runtime values fail safely to empty strings.
 * Authoring validation remains responsible for rejecting malformed config
 * before publication.
 *
 * @param {unknown} value
 * @returns {CollectionsEditorialConfig}
 */
export function normalizeCollectionsEditorialConfig(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {
      home_eyebrow: '',
      page_eyebrow: ''
    };
  }

  const record = /** @type {Record<string, unknown>} */ (value);

  return {
    home_eyebrow: normalizedOptionalString(record.home_eyebrow),
    page_eyebrow: normalizedOptionalString(record.page_eyebrow)
  };
}

/**
 * Merge the two eyebrow fields into an existing collections editorial object.
 *
 * Unknown keys are deliberately preserved so later editorial additions
 * such as page title and introduction can share the same site-owned file.
 *
 * @param {unknown} existing
 * @param {unknown} updates
 * @returns {Record<string, unknown>}
 */
export function mergeCollectionsEditorialConfig(existing, updates) {
  const next =
    existing && typeof existing === 'object' && !Array.isArray(existing)
      ? { .../** @type {Record<string, unknown>} */ (existing) }
      : {};

  const normalized = normalizeCollectionsEditorialConfig(updates);

  delete next.home_eyebrow;
  delete next.page_eyebrow;

  if (normalized.home_eyebrow) {
    next.home_eyebrow = normalized.home_eyebrow;
  }

  if (normalized.page_eyebrow) {
    next.page_eyebrow = normalized.page_eyebrow;
  }

  return next;
}

/**
 * @param {CollectionsEditorialConfig} config
 * @param {string} locale
 */
export function resolveHomeCollectionsEyebrow(config, locale) {
  const custom = normalizedOptionalString(config?.home_eyebrow);

  if (custom) {
    return custom;
  }

  return createTranslator(locale)('visitor.home.collectionsEyebrow');
}

/**
 * @param {CollectionsEditorialConfig} config
 * @param {string} blockLabel
 * @param {string} locale
 */
export function resolveCollectionsPageEyebrow(
  config,
  blockLabel,
  locale
) {
  const custom = normalizedOptionalString(config?.page_eyebrow);

  if (custom) {
    return custom;
  }

  const structuralFallback = normalizedOptionalString(blockLabel);

  if (structuralFallback) {
    return structuralFallback;
  }

  return createTranslator(locale)('visitor.collections.eyebrow');
}
