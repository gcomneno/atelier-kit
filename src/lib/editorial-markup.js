import { FONT_PRESET_IDS, fontFamilyCss, isFontPreset } from './site-typography.js';

/** @typedef {import('./site-typography.js').FontPreset} FontPreset */
/** @typedef {'accent' | 'intro' | 'heading' | 'muted' | 'white' | 'black' | 'larger' | 'smaller' | 'text'} EditorialMarkToken */

/**
 * Canonical Atelier Mark contract. Tokens are single-level semantic presets:
 * they cannot nest, accept no values, and map only to fixed classes.
 */
export const EDITORIAL_MARK_TOKENS = Object.freeze([
  { id: 'accent', className: 'mark-accent', kind: 'theme-color' },
  { id: 'intro', className: 'mark-intro', kind: 'theme-color' },
  { id: 'heading', className: 'mark-heading', kind: 'theme-color' },
  { id: 'muted', className: 'mark-muted', kind: 'theme-color' },
  { id: 'white', className: 'mark-white', kind: 'explicit-color' },
  { id: 'black', className: 'mark-black', kind: 'explicit-color' },
  { id: 'larger', className: 'mark-larger', kind: 'size' },
  { id: 'smaller', className: 'mark-smaller', kind: 'size' }
]);

export const EDITORIAL_MARK_TAGS = Object.freeze(EDITORIAL_MARK_TOKENS.map(({ id }) => id));

/** @type {Record<EditorialMarkToken, string>} */
export const EDITORIAL_MARK_CLASSES = {
  accent: 'mark-accent',
  intro: 'mark-intro',
  heading: 'mark-heading',
  muted: 'mark-muted',
  white: 'mark-white',
  black: 'mark-black',
  larger: 'mark-larger',
  smaller: 'mark-smaller',
  text: 'mark-text'
};

/**
 * @param {unknown} value
 * @returns {value is EditorialMarkToken}
 */
export function isEditorialMarkTag(value) {
  return EDITORIAL_MARK_TAGS.includes(/** @type {string} */ (value));
}

/**
 * Legacy `tagline_display` is deliberately tolerated but has no active contract.
 * Existing YAML therefore loads safely while visitor and Studio ignore it.
 * Studio saves preserve the unknown legacy object; operators may remove it at any time.
 * @param {unknown} _record
 * @returns {null}
 */
export function parseTaglineDisplay(_record) {
  return null;
}

/**
 * @param {string} value
 */
function escapeHtml(value) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

/**
 * @param {string | undefined | null} text
 */
export function hasEditorialMarkup(text) {
  if (!text) {
    return false;
  }

  return /\{(?:\/?[a-z]+(?::[a-z-]+)?\}|{)/.test(text);
}

/**
 * Scan Atelier Mark once and retain source coordinates for every syntactic unit.
 * `plainText` is the rendered projection (escaped braces are decoded), while
 * `sourceText` removes controlled delimiters but preserves `{{` and `}}`.
 * Complete tokens expose both their whole and inner source ranges.
 *
 * @param {string} text
 * @returns {{ ok: boolean, errors: string[], segments: Array<Record<string, any>>, tokens: Array<{ type: 'token', command: string, start: number, end: number, contentStart: number, contentEnd: number, openEnd: number, closeStart: number }>, plainText: string, sourceText: string, html: string, fontPresets: FontPreset[] }}
 */
export function scanEditorialMarkup(text) {
  /** @type {string[]} */
  const errors = [];
  /** @type {Array<Record<string, any>>} */
  const segments = [];
  /** @type {Array<{ type: 'token', command: string, start: number, end: number, contentStart: number, contentEnd: number, openEnd: number, closeStart: number }>} */
  const tokens = [];
  /** @type {Set<FontPreset>} */
  const fonts = new Set();
  /** @type {{ command: string, close: string, start: number, openEnd: number, contentStart: number } | null} */
  let open = null;
  let index = 0;

  while (index < text.length) {
    if (text.startsWith('{{', index) || text.startsWith('}}', index)) {
      const source = text.slice(index, index + 2);
      segments.push({ type: 'escape', start: index, end: index + 2, source, rendered: source[0] });
      index += 2;
      continue;
    }

    if (text[index] !== '{') {
      const offset = text.slice(index).search(/\{|}}/);
      const end = offset === -1 ? text.length : index + offset;
      segments.push({ type: 'text', start: index, end, source: text.slice(index, end) });
      index = end;
      continue;
    }

    const closeBrace = text.indexOf('}', index + 1);
    if (closeBrace === -1) {
      errors.push(`Invalid markup near position ${index + 1}.`);
      segments.push({ type: 'delimiter', kind: 'invalid', start: index, end: index + 1, source: '{' });
      index += 1;
      continue;
    }

    const end = closeBrace + 1;
    const source = text.slice(index, end);
    const closing = source.match(/^\{\/([a-z]+)\}$/);
    const font = source.match(/^\{font:([a-z-]+)\}$/);
    const simple = source.match(/^\{([a-z]+)\}$/);
    segments.push({ type: 'delimiter', kind: closing ? 'close' : 'open', start: index, end, source });

    if (closing) {
      const close = closing[1];
      if (!open || open.close !== close) {
        errors.push(`Closing tag {/${close}} does not match open tag {${open?.command ?? 'none'}}.`);
      } else {
        tokens.push({
          type: 'token', command: open.command, start: open.start, end,
          contentStart: open.contentStart, contentEnd: index,
          openEnd: open.openEnd, closeStart: index
        });
        open = null;
      }
    } else if (font) {
      const preset = font[1];
      if (!isFontPreset(preset)) errors.push(`Unknown font preset "${preset}".`);
      else if (open) errors.push(`Nested tag {font:${preset}} is not allowed.`);
      else {
        open = { command: `font:${preset}`, close: 'font', start: index, openEnd: end, contentStart: end };
        fonts.add(preset);
      }
    } else if (simple) {
      const tag = simple[1];
      if (!isEditorialMarkTag(tag)) errors.push(`Unknown tag {${tag}}.`);
      else if (open) errors.push(`Nested tag {${tag}} is not allowed.`);
      else open = { command: tag, close: tag, start: index, openEnd: end, contentStart: end };
    } else {
      errors.push(`Invalid markup near position ${index + 1}.`);
    }
    index = end;
  }

  if (open) errors.push(`Unclosed tag {${open.command}}.`);

  const plainText = segments.map((part) => part.type === 'text' ? part.source : part.type === 'escape' ? part.rendered : '').join('');
  const sourceText = segments.map((part) => part.type === 'text' || part.type === 'escape' ? part.source : '').join('');
  let html = '';
  if (errors.length === 0) {
    for (const part of segments) {
      if (part.type === 'text') html += escapeHtml(part.source);
      else if (part.type === 'escape') html += escapeHtml(part.rendered);
      else if (part.kind === 'open') {
        const command = part.source.slice(1, -1);
        if (command.startsWith('font:')) {
          const preset = command.slice(5);
          html += `<span class="mark-font mark-font-${preset}" style="font-family: ${escapeHtml(fontFamilyCss(preset))}">`;
        } else html += `<span class="${EDITORIAL_MARK_CLASSES[/** @type {EditorialMarkToken} */ (command)]}">`;
      } else if (part.kind === 'close') html += '</span>';
    }
  }

  return {
    ok: errors.length === 0, errors, segments, tokens: tokens.sort((a, b) => a.start - b.start),
    plainText, sourceText, html,
    fontPresets: FONT_PRESET_IDS.filter((preset) => fonts.has(preset))
  };
}

/** @param {...(string | undefined | null)} texts @returns {FontPreset[]} */
export function editorialFontPresets(...texts) {
  const used = new Set();
  for (const text of texts) {
    if (!text) continue;
    const parsed = parseEditorialMarkup(text);
    if (parsed.ok) {
      for (const preset of parsed.fontPresets) used.add(preset);
    }
  }
  return FONT_PRESET_IDS.filter((preset) => used.has(preset));
}

/**
 * @param {string} text
 * @returns {{ ok: true, html: string, plainText: string, sourceText: string, fontPresets: FontPreset[] } | { ok: false, errors: string[], plainText: string, sourceText: string }}
 */
export function parseEditorialMarkup(text) {
  const scanned = scanEditorialMarkup(text ?? '');
  if (!scanned.ok) return { ok: false, errors: scanned.errors, plainText: scanned.plainText, sourceText: scanned.sourceText };
  return { ok: true, html: scanned.html, plainText: scanned.plainText, sourceText: scanned.sourceText, fontPresets: scanned.fontPresets };
}

/**
 * @param {string | undefined | null} text
 */
export function stripEditorialMarkup(text) {
  if (!text) {
    return '';
  }

  const parsed = parseEditorialMarkup(text);
  return parsed.plainText;
}

/**
 * @param {string | undefined | null} text
 * @param {string} fieldLabel
 * @returns {string[]}
 */
export function validateEditorialField(text, fieldLabel) {
  if (!text?.trim() || !hasEditorialMarkup(text)) {
    return [];
  }

  const result = parseEditorialMarkup(text);

  if (!result.ok) {
    return result.errors.map((error) => `${fieldLabel}: ${error}`);
  }

  return [];
}

/**
 * Reject Atelier Mark syntax in fields whose value must remain literal plain text.
 * Literal braces that are not recognized by the shared Atelier Mark tokenizer are allowed.
 *
 * @param {string | undefined | null} text
 * @param {string} fieldLabel
 * @returns {string[]}
 */
export function validatePlainTextField(text, fieldLabel) {
  if (!text?.trim() || !hasEditorialMarkup(text)) {
    return [];
  }

  return [`${fieldLabel}: Atelier Mark is not allowed in plain-text fields.`];
}

/**
 * @param {string | undefined | null} text
 * @param {string} fieldLabel
 * @returns {string[]}
 */
export function validateEditorialParagraphs(text, fieldLabel) {
  if (!text?.trim()) {
    return [];
  }

  /** @type {string[]} */
  const errors = [];
  const paragraphs = text
    .trim()
    .split(/\n\s*\n/)
    .map((paragraph) => paragraph.replace(/\s*\n\s*/g, ' ').trim())
    .filter(Boolean);

  for (const paragraph of paragraphs) {
    errors.push(...validateEditorialField(paragraph, fieldLabel));
  }

  return errors;
}

/**
 * @param {string | undefined | null} text
 * @returns {string[]}
 */
export function splitEditorialParagraphs(text) {
  if (!text?.trim()) {
    return [];
  }

  return text
    .trim()
    .split(/\n\s*\n/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);
}

/**
 * @param {{ tagline?: string, intro_title?: string, hero_intro?: string }} fields
 * @returns {string[]}
 */
export function validateEditorialFields(fields) {
  return [
    ...validateEditorialField(fields.tagline, 'tagline'),
    ...validateEditorialField(fields.intro_title, 'intro_title'),
    ...validateEditorialParagraphs(fields.hero_intro, 'hero_intro')
  ];
}
