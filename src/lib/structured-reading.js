/**
 * Canonical, product-neutral block types supported by the structured reader.
 */
export const STRUCTURED_READING_BLOCK_TYPES = Object.freeze([
  'lead',
  'intro',
  'section-title',
  'chapter-title',
  'epigraph',
  'dateline',
  'paragraph',
  'dialogue',
  'staccato',
  'ornament',
  'cta',
  'note',
  'colophon'
]);

/**
 * Canonical publishing roles supported inside a colophon.
 */
export const STRUCTURED_READING_COLOPHON_ROLES = Object.freeze([
  'title',
  'series',
  'author',
  'imprint',
  'body',
  'epigraph',
  'tagline'
]);

const BLOCK_TYPE_SET = new Set(STRUCTURED_READING_BLOCK_TYPES);
const COLOPHON_ROLE_SET = new Set(STRUCTURED_READING_COLOPHON_ROLES);

/**
 * @typedef {'lead' | 'intro' | 'section-title' | 'chapter-title' | 'epigraph' | 'dateline' | 'paragraph' | 'dialogue' | 'staccato' | 'ornament' | 'cta' | 'note'} StructuredReadingTextBlockType
 */

/**
 * @typedef {'title' | 'series' | 'author' | 'imprint' | 'body' | 'epigraph' | 'tagline'} StructuredReadingColophonRole
 */

/**
 * @typedef {{
 *   type: StructuredReadingTextBlockType,
 *   text: string,
 *   dropCap?: boolean
 * } | {
 *   type: 'ornament'
 * } | {
 *   type: 'colophon',
 *   role: StructuredReadingColophonRole,
 *   text: string
 * }} StructuredReadingBlock
 */

/**
 * Convert explicit structured-reading input to the narrow canonical block
 * contract consumed by the renderer.
 *
 * Unknown but readable entries degrade to ordinary paragraphs. Empty or
 * non-readable entries are omitted.
 *
 * @param {unknown} input
 * @returns {StructuredReadingBlock[]}
 */
export function normalizeStructuredReadingBlocks(input) {
  if (!Array.isArray(input)) {
    return [];
  }

  /** @type {StructuredReadingBlock[]} */
  const blocks = [];

  for (const entry of input) {
    const normalized = normalizeStructuredReadingBlock(entry);

    if (normalized) {
      blocks.push(normalized);
    }
  }

  return blocks;
}

/**
 * @param {unknown} entry
 * @returns {StructuredReadingBlock | null}
 */
function normalizeStructuredReadingBlock(entry) {
  if (typeof entry === 'string') {
    return createFallbackParagraph(entry);
  }

  if (!entry || typeof entry !== 'object' || Array.isArray(entry)) {
    return null;
  }

  const record = /** @type {Record<string, unknown>} */ (entry);
  const type = typeof record.type === 'string' ? record.type.trim() : '';
  const text = normalizeReadableText(record.text);

  if (type === 'ornament') {
    return { type: 'ornament' };
  }

  if (type === 'colophon') {
    const role = typeof record.role === 'string' ? record.role.trim() : '';

    if (COLOPHON_ROLE_SET.has(role) && text) {
      return {
        type: 'colophon',
        role: /** @type {StructuredReadingColophonRole} */ (role),
        text
      };
    }

    return text ? { type: 'paragraph', text } : null;
  }

  if (!BLOCK_TYPE_SET.has(type)) {
    return text ? { type: 'paragraph', text } : null;
  }

  if (!text) {
    return null;
  }

  if (type === 'paragraph') {
    return {
      type: 'paragraph',
      text,
      ...(record.drop_cap === true || record.dropCap === true ? { dropCap: true } : {})
    };
  }

  return {
    type: /** @type {StructuredReadingTextBlockType} */ (type),
    text
  };
}

/**
 * @param {unknown} value
 * @returns {string | null}
 */
function normalizeReadableText(value) {
  if (typeof value !== 'string') {
    return null;
  }

  const text = value.trim();

  return text === '' ? null : text;
}

/**
 * @param {string} value
 * @returns {StructuredReadingBlock | null}
 */
function createFallbackParagraph(value) {
  const text = normalizeReadableText(value);

  return text ? { type: 'paragraph', text } : null;
}
