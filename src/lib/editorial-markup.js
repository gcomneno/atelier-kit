import { FONT_PRESET_IDS, fontFamilyCss, isFontPreset } from './site-typography.js';

/** @typedef {import('./site-typography.js').FontPreset} FontPreset */
/** @typedef {'accent' | 'intro' | 'heading' | 'muted' | 'text'} EditorialMarkToken */

/** @typedef {'none' | 'epigraph'} TaglineWrap */

/** @typedef {'text' | 'accent' | 'heading' | 'intro'} TaglineQuoteColor */

/** @typedef {{ wrap?: TaglineWrap, quote_color?: TaglineQuoteColor }} TaglineDisplay */

export const EDITORIAL_MARK_TAGS = /** @type {const} */ (['accent', 'intro', 'heading', 'muted']);

export const TAGLINE_WRAP_IDS = /** @type {const} */ (['none', 'epigraph']);

export const TAGLINE_QUOTE_COLOR_IDS = /** @type {const} */ (['text', 'accent', 'heading', 'intro']);

/** @type {Record<EditorialMarkToken, string>} */
export const EDITORIAL_MARK_CLASSES = {
  accent: 'mark-accent',
  intro: 'mark-intro',
  heading: 'mark-heading',
  muted: 'mark-muted',
  text: 'mark-text'
};

/**
 * @param {unknown} value
 * @returns {value is EditorialMarkToken}
 */
export function isEditorialMarkTag(value) {
  return value === 'accent' || value === 'intro' || value === 'heading' || value === 'muted';
}

/**
 * @param {unknown} value
 * @returns {TaglineWrap}
 */
export function resolveTaglineWrap(value) {
  return value === 'epigraph' ? 'epigraph' : 'none';
}

/**
 * @param {unknown} value
 * @returns {TaglineQuoteColor}
 */
export function resolveTaglineQuoteColor(value) {
  return TAGLINE_QUOTE_COLOR_IDS.includes(/** @type {TaglineQuoteColor} */ (value))
    ? /** @type {TaglineQuoteColor} */ (value)
    : 'text';
}

/**
 * @param {unknown} record
 * @returns {TaglineDisplay | null}
 */
export function parseTaglineDisplay(record) {
  if (!record || typeof record !== 'object' || Array.isArray(record)) {
    return null;
  }

  const wrap = resolveTaglineWrap(/** @type {Record<string, unknown>} */ (record).wrap);
  const quote_color = resolveTaglineQuoteColor(
    /** @type {Record<string, unknown>} */ (record).quote_color
  );

  if (wrap === 'none' && quote_color === 'text') {
    return null;
  }

  return { wrap, quote_color };
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
 * @returns {{ ok: true, html: string, plainText: string, fontPresets: FontPreset[] } | { ok: false, errors: string[] }}
 */
export function parseEditorialMarkup(text) {
  if (!text) {
    return { ok: true, html: '', plainText: '', fontPresets: [] };
  }

  if (!hasEditorialMarkup(text)) {
    return { ok: true, html: escapeHtml(text), plainText: text, fontPresets: [] };
  }

  /** @type {string[]} */
  const errors = [];
  /** @type {string[]} */
  const output = [];
  /** @type {string[]} */
  const plainOutput = [];
  /** @type {Set<FontPreset>} */
  const fontPresets = new Set();
  /** @type {{ close: string, label: string } | null} */
  let openTag = null;
  let index = 0;

  while (index < text.length) {
    if (text.startsWith('{{', index)) {
      output.push(escapeHtml('{'));
      plainOutput.push('{');
      index += 2;
      continue;
    }

    if (text.startsWith('}}', index)) {
      output.push(escapeHtml('}'));
      plainOutput.push('}');
      index += 2;
      continue;
    }

    if (text[index] === '{') {
      const closeMatch = text.slice(index).match(/^\{\/([a-z]+)\}/);

      if (closeMatch) {
        const tag = closeMatch[1];

        if (tag === 'font') {
          if (openTag?.close !== 'font') {
            errors.push(`Closing tag {/font} does not match open tag {${openTag?.label ?? 'none'}}.`);
          } else {
            output.push('</span>');
            openTag = null;
          }
        } else if (!isEditorialMarkTag(tag)) {
          errors.push(`Unknown closing tag {/${tag}}.`);
        } else if (openTag?.close !== tag) {
          errors.push(`Closing tag {/${tag}} does not match open tag {${openTag?.label ?? 'none'}}.`);
        } else {
          output.push('</span>');
          openTag = null;
        }

        index += closeMatch[0].length;
        continue;
      }

      const fontMatch = text.slice(index).match(/^\{font:([a-z-]+)\}/);
      if (fontMatch) {
        const preset = fontMatch[1];
        if (!isFontPreset(preset)) {
          errors.push(`Unknown font preset "${preset}".`);
        } else if (openTag) {
          errors.push(`Nested tag {font:${preset}} is not allowed.`);
        } else {
          openTag = { close: 'font', label: `font:${preset}` };
          fontPresets.add(preset);
          output.push(
            `<span class="mark-font mark-font-${preset}" style="font-family: ${escapeHtml(fontFamilyCss(preset))}">`
          );
        }
        index += fontMatch[0].length;
        continue;
      }

      const openMatch = text.slice(index).match(/^\{([a-z]+)\}/);

      if (openMatch) {
        const tag = openMatch[1];

        if (!isEditorialMarkTag(tag)) {
          errors.push(`Unknown tag {${tag}}.`);
        } else if (openTag) {
          errors.push(`Nested tag {${tag}} is not allowed.`);
        } else {
          openTag = { close: tag, label: tag };
          output.push(`<span class="${EDITORIAL_MARK_CLASSES[tag]}">`);
        }

        index += openMatch[0].length;
        continue;
      }

      errors.push(`Invalid markup near position ${index + 1}.`);
      output.push(escapeHtml('{'));
      plainOutput.push('{');
      index += 1;
      continue;
    }

    const nextSpecial = text.slice(index).search(/[{}]/);

    if (nextSpecial === -1) {
      output.push(escapeHtml(text.slice(index)));
      plainOutput.push(text.slice(index));
      break;
    }

    if (nextSpecial > 0) {
      output.push(escapeHtml(text.slice(index, index + nextSpecial)));
      plainOutput.push(text.slice(index, index + nextSpecial));
      index += nextSpecial;
      continue;
    }

    output.push(escapeHtml(text[index]));
    plainOutput.push(text[index]);
    index += 1;
  }

  if (openTag) {
    errors.push(`Unclosed tag {${openTag.label}}.`);
  }

  if (errors.length > 0) {
    return { ok: false, errors };
  }

  return {
    ok: true,
    html: output.join(''),
    plainText: plainOutput.join(''),
    fontPresets: FONT_PRESET_IDS.filter((preset) => fontPresets.has(preset))
  };
}

/**
 * @param {string | undefined | null} text
 */
export function stripEditorialMarkup(text) {
  if (!text) {
    return '';
  }

  const parsed = parseEditorialMarkup(text);
  return parsed.ok ? parsed.plainText : text;
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
