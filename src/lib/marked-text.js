import {
  editorialFontPresets,
  stripEditorialMarkup,
  validateEditorialField,
  validateEditorialParagraphs
} from './editorial-markup.js';

/** @typedef {'single-line' | 'multiline'} MarkedTextMode */
/** @typedef {{ family: string, path: string, mode: MarkedTextMode }} MarkedTextFieldDefinition */

/**
 * Canonical inventory for Studio-managed public editorial strings. `*` denotes
 * an array member and `{id}` a content filename. Every pipeline stage consumes
 * this registry, so adding a field here without validation/font coverage fails tests.
 *
 * @type {readonly MarkedTextFieldDefinition[]}
 */
export const MARKED_TEXT_FIELDS = Object.freeze([
  { family: 'site', path: 'site.tagline', mode: 'single-line' },
  { family: 'site', path: 'site.header_title', mode: 'single-line' },
  { family: 'site', path: 'site.intro_title', mode: 'single-line' },
  { family: 'site', path: 'site.hero_intro', mode: 'multiline' },
  { family: 'site', path: 'site.hero_signature', mode: 'multiline' },
  { family: 'site', path: 'site.footer_note', mode: 'single-line' },
  { family: 'hero', path: 'site.hero_banner.description', mode: 'multiline' },
  { family: 'hero', path: 'site.hero_banner.caption', mode: 'single-line' },
  { family: 'catalog', path: 'catalog.eyebrow', mode: 'single-line' },
  { family: 'catalog', path: 'catalog.intro', mode: 'multiline' },
  { family: 'about', path: 'about.title', mode: 'single-line' },
  { family: 'about', path: 'about.intro', mode: 'multiline' },
  { family: 'about', path: 'about.sections.*.heading', mode: 'single-line' },
  { family: 'about', path: 'about.sections.*.body', mode: 'multiline' },
  { family: 'items', path: 'items.{id}.title', mode: 'single-line' },
  { family: 'items', path: 'items.{id}.subtitle', mode: 'single-line' },
  { family: 'items', path: 'items.{id}.description', mode: 'multiline' },
  { family: 'items', path: 'items.{id}.notice', mode: 'multiline' },
  { family: 'collections', path: 'collections.{id}.title', mode: 'single-line' },
  { family: 'collections', path: 'collections.{id}.description', mode: 'multiline' },
  { family: 'news', path: 'news.{id}.title', mode: 'single-line' },
  { family: 'news', path: 'news.{id}.excerpt', mode: 'multiline' },
  { family: 'news', path: 'news.{id}.body', mode: 'multiline' },
  { family: 'footer', path: 'footer.copyright', mode: 'single-line' },
  { family: 'footer', path: 'footer.legal_line', mode: 'single-line' },
  { family: 'footer', path: 'footer.columns.*.title', mode: 'single-line' },
  { family: 'footer', path: 'footer.columns.*.links.*.label', mode: 'single-line' },
  { family: 'layout', path: 'layout.blocks.*.label', mode: 'single-line' },
  { family: 'contact', path: 'contact.email.label', mode: 'single-line' },
  { family: 'contact', path: 'contact.whatsapp.label', mode: 'single-line' },
  { family: 'signal-clouds', path: 'signal_clouds.*.question', mode: 'single-line' },
  { family: 'signal-clouds', path: 'signal_clouds.*.hint', mode: 'single-line' },
  { family: 'signal-clouds', path: 'signal_clouds.*.options.*.label', mode: 'single-line' },
  { family: 'signal-clouds', path: 'signal_clouds.*.faq.answer', mode: 'multiline' },
  { family: 'signal-clouds', path: 'signal_clouds.*.faq.group', mode: 'single-line' }
]);

/** Canonical projection for metadata, search, JSON-LD, feeds and accessibility. */
/** @param {string | undefined | null} value */
export function markedTextToPlainText(value) {
  return stripEditorialMarkup(value);
}

/**
 * Validate named values before persistence.
 * @param {Array<{ path: string, value?: string | null, mode?: MarkedTextMode }>} values
 */
export function validateMarkedTextValues(values) {
  return values.flatMap(({ path, value, mode = 'single-line' }) =>
    mode === 'multiline'
      ? validateEditorialParagraphs(value, path)
      : validateEditorialField(value, path)
  );
}

/** Throw before a caller performs any file or upload write. */
/** @param {Array<{ path: string, value?: string | null, mode?: MarkedTextMode }>} values */
export function assertValidMarkedText(values) {
  const errors = validateMarkedTextValues(values);
  if (errors.length > 0) throw new Error(`Invalid Atelier Mark: ${errors.join(' ')}`);
}

/** Discover all inline fonts from normalized marked values. */
/** @param {(string | undefined | null)[]} values */
export function markedTextFontPresets(values) {
  return editorialFontPresets(...values.filter((value) => typeof value === 'string'));
}
