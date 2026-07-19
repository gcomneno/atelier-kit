import {
  EDITORIAL_MARK_TAGS,
  editorialFontPresets,
  parseEditorialMarkup,
  scanEditorialMarkup,
  stripEditorialMarkup,
  validateEditorialField,
  validateEditorialParagraphs
} from './editorial-markup.js';
import { isFontPreset } from './site-typography.js';

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

/**
 * Apply an Atelier Mark tag to the selected range.
 * @param {string} value
 * @param {number} start
 * @param {number} end
 * @param {string} tag
 */
export function wrapMarkedTextSelection(value, start, end, tag) {
  const edit = transformMarkedTextSelection(value, start, end, tag);
  const cursor = edit.changed && tag !== 'remove'
    ? edit.selectionEnd + `{/${closingTag(tag)}}`.length
    : edit.selectionEnd;
  return { value: edit.value, cursor };
}

/** @param {string} tag */
function isSupportedCommand(tag) {
  if (EDITORIAL_MARK_TAGS.includes(tag)) return true;
  if (!tag.startsWith('font:')) return false;
  return isFontPreset(tag.slice('font:'.length));
}

/** @param {string} tag */
function closingTag(tag) {
  return tag.startsWith('font:') ? 'font' : tag;
}

/**
 * Apply, replace or remove controlled markup without creating invalid syntax.
 * A selection that crosses only part of markup is rejected. A complete marked
 * selection is normalized through the parser before applying another token.
 * @param {string} value
 * @param {number} start
 * @param {number} end
 * @param {string | 'remove'} command
 */
export function transformMarkedTextSelection(value, start, end, command) {
  const first = Math.max(0, Math.min(Number.isFinite(start) ? start : 0, value.length));
  const second = Math.max(0, Math.min(Number.isFinite(end) ? end : 0, value.length));
  const safeStart = Math.min(first, second);
  const safeEnd = Math.max(first, second);
  if (safeStart === safeEnd) {
    return { value, selectionStart: safeStart, selectionEnd: safeEnd, changed: false, status: 'empty' };
  }
  if (command !== 'remove' && !isSupportedCommand(command)) {
    return { value, selectionStart: safeStart, selectionEnd: safeEnd, changed: false, status: 'invalid-command' };
  }
  const scanned = scanEditorialMarkup(value);
  if (!scanned.ok) {
    return { value, selectionStart: safeStart, selectionEnd: safeEnd, changed: false, status: 'invalid-markup' };
  }

  for (const part of scanned.segments) {
    if ((part.type === 'delimiter' || part.type === 'escape') &&
        ((safeStart > part.start && safeStart < part.end) || (safeEnd > part.start && safeEnd < part.end))) {
      return { value, selectionStart: safeStart, selectionEnd: safeEnd, changed: false, status: 'crosses-markup' };
    }
  }

  let rangeStart = safeStart;
  let rangeEnd = safeEnd;
  const exactToken = scanned.tokens.find((token) =>
    (safeStart === token.start && safeEnd === token.end) ||
    (safeStart === token.contentStart && safeEnd === token.contentEnd)
  );
  if (exactToken) {
    rangeStart = exactToken.start;
    rangeEnd = exactToken.end;
  }

  for (const token of scanned.tokens) {
    const overlaps = safeStart < token.end && safeEnd > token.start;
    const containsWhole = safeStart <= token.start && safeEnd >= token.end;
    const isExact = token === exactToken;
    if (overlaps && !containsWhole && !isExact) {
      return { value, selectionStart: safeStart, selectionEnd: safeEnd, changed: false, status: 'crosses-markup' };
    }
  }

  const includedTokens = scanned.tokens.filter((token) => rangeStart <= token.start && rangeEnd >= token.end);
  const selected = scanned.segments
    .filter((part) => part.end > rangeStart && part.start < rangeEnd && part.type !== 'delimiter')
    .map((part) => part.source.slice(Math.max(0, rangeStart - part.start), part.source.length - Math.max(0, part.end - rangeEnd)))
    .join('');

  if (command === 'remove') {
    if (includedTokens.length === 0) {
      return { value, selectionStart: safeStart, selectionEnd: safeEnd, changed: false, status: 'plain' };
    }
    const next = `${value.slice(0, rangeStart)}${selected}${value.slice(rangeEnd)}`;
    return {
      value: next,
      selectionStart: rangeStart,
      selectionEnd: rangeStart + selected.length,
      changed: next !== value,
      status: 'removed'
    };
  }

  if (exactToken?.command === command) {
    return { value, selectionStart: safeStart, selectionEnd: safeEnd, changed: false, status: 'already-applied' };
  }
  const close = closingTag(command);
  const wrapped = `{${command}}${selected}{/${close}}`;
  const next = `${value.slice(0, rangeStart)}${wrapped}${value.slice(rangeEnd)}`;
  const contentStart = rangeStart + command.length + 2;
  return {
    value: next,
    selectionStart: contentStart,
    selectionEnd: contentStart + selected.length,
    changed: next !== value,
    status: includedTokens.length > 0 ? 'replaced' : 'applied'
  };
}

/**
 * Keep the successful form value in sync before notifying form-level listeners.
 * @param {HTMLInputElement | HTMLTextAreaElement} field
 * @param {string} value
 */
export function notifyMarkedTextEdit(field, value) {
  field.value = value;
  field.dispatchEvent(new Event('input', { bubbles: true }));
}
