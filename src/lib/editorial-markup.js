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

  return /\{(?:\/?[a-z]+|{)/.test(text);
}

/**
 * @param {string} text
 * @returns {{ ok: true, html: string } | { ok: false, errors: string[] }}
 */
export function parseEditorialMarkup(text) {
  if (!text) {
    return { ok: true, html: '' };
  }

  if (!hasEditorialMarkup(text)) {
    return { ok: true, html: escapeHtml(text) };
  }

  /** @type {string[]} */
  const errors = [];
  /** @type {string[]} */
  const output = [];
  /** @type {EditorialMarkToken | null} */
  let openTag = null;
  let index = 0;

  while (index < text.length) {
    if (text.startsWith('{{', index)) {
      output.push(escapeHtml('{'));
      index += 2;
      continue;
    }

    if (text.startsWith('}}', index)) {
      output.push(escapeHtml('}'));
      index += 2;
      continue;
    }

    if (text[index] === '{') {
      const closeMatch = text.slice(index).match(/^\{\/([a-z]+)\}/);

      if (closeMatch) {
        const tag = closeMatch[1];

        if (!isEditorialMarkTag(tag)) {
          errors.push(`Unknown closing tag {/${tag}}.`);
        } else if (openTag !== tag) {
          errors.push(`Closing tag {/${tag}} does not match open tag {${openTag ?? 'none'}}.`);
        } else {
          output.push('</span>');
          openTag = null;
        }

        index += closeMatch[0].length;
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
          openTag = tag;
          output.push(`<span class="${EDITORIAL_MARK_CLASSES[tag]}">`);
        }

        index += openMatch[0].length;
        continue;
      }

      errors.push(`Invalid markup near position ${index + 1}.`);
      index += 1;
      continue;
    }

    const nextSpecial = text.slice(index).search(/[{}]/);

    if (nextSpecial === -1) {
      output.push(escapeHtml(text.slice(index)));
      break;
    }

    if (nextSpecial > 0) {
      output.push(escapeHtml(text.slice(index, index + nextSpecial)));
      index += nextSpecial;
      continue;
    }

    index += 1;
  }

  if (openTag) {
    errors.push(`Unclosed tag {${openTag}}.`);
  }

  if (errors.length > 0) {
    return { ok: false, errors };
  }

  return { ok: true, html: output.join('') };
}

/**
 * @param {string | undefined | null} text
 */
export function stripEditorialMarkup(text) {
  if (!text) {
    return '';
  }

  let stripped = text;

  for (const tag of EDITORIAL_MARK_TAGS) {
    stripped = stripped.replaceAll(`{/${tag}}`, '');
    stripped = stripped.replaceAll(`{${tag}}`, '');
  }

  return stripped.replaceAll('{{', '{').replaceAll('}}', '}');
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
