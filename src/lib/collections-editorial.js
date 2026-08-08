import { createTranslator } from './i18n/index.js';

/**
 * @typedef {{
 *   home_eyebrow: string,
 *   page_eyebrow: string,
 *   title?: string,
 *   intro?: string
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
      page_eyebrow: '',
      title: '',
      intro: ''
    };
  }

  const record = /** @type {Record<string, unknown>} */ (value);

  return {
    home_eyebrow: normalizedOptionalString(record.home_eyebrow),
    page_eyebrow: normalizedOptionalString(record.page_eyebrow),
    title: normalizedOptionalString(record.title),
    intro: normalizedOptionalString(record.intro)
  };
}

/**
 * Merge Studio-owned collection wording into an existing editorial object.
 *
 * Unknown keys are deliberately preserved for forward compatibility.
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
  delete next.title;
  delete next.intro;

  if (normalized.home_eyebrow) {
    next.home_eyebrow = normalized.home_eyebrow;
  }

  if (normalized.page_eyebrow) {
    next.page_eyebrow = normalized.page_eyebrow;
  }

  if (normalized.title) {
    next.title = normalized.title;
  }

  if (normalized.intro) {
    next.intro = normalized.intro;
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
 * @param {string} locale
 */
export function resolveCollectionsPageTitle(config, locale) {
  const custom = normalizedOptionalString(config?.title);

  if (custom) {
    return custom;
  }

  return createTranslator(locale)('visitor.collections.title');
}

/**
 * @param {CollectionsEditorialConfig} config
 * @param {string} itemPlural
 * @param {string} locale
 */
export function resolveCollectionsPageIntro(config, itemPlural, locale) {
  const custom = normalizedOptionalString(config?.intro);

  if (custom) {
    return custom;
  }

  return createTranslator(locale)('visitor.collections.intro', { itemPlural });
  return createTranslator(locale)(
    'visitor.collections.intro',
    { itemPlural }
  );
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
