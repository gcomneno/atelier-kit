export const NEWS_CANONICAL_EDIT_FIELDS = Object.freeze([
  'id',
  'title',
  'date',
  'body',
  'excerpt',
  'image_file',
  'image_alt'
]);

const NEWS_CANONICAL_EDIT_FIELD_SET = new Set(NEWS_CANONICAL_EDIT_FIELDS);

/**
 * @param {unknown} value
 * @returns {value is Record<string, unknown>}
 */
function isRecord(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

/**
 * Merge normalized Local Studio News edit values into an existing parsed News
 * document while preserving client-owned unrelated top-level YAML data.
 *
 * @param {Record<string, unknown>} existingNews
 * @param {Record<string, unknown>} canonicalNews
 * @returns {Record<string, unknown>}
 */
export function mergeNewsCanonicalEditValues(existingNews, canonicalNews) {
  if (!isRecord(existingNews) || !isRecord(canonicalNews)) {
    throw new TypeError('News edit merge requires parsed News objects.');
  }

  const merged = { ...existingNews };

  for (const field of NEWS_CANONICAL_EDIT_FIELDS) {
    delete merged[field];
  }

  for (const [field, value] of Object.entries(canonicalNews)) {
    if (NEWS_CANONICAL_EDIT_FIELD_SET.has(field)) {
      merged[field] = value;
    }
  }

  return merged;
}
