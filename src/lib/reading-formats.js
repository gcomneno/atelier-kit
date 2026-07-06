/** @typedef {'book'} ReadingFormat */

/** @type {ReadingFormat[]} */
export const READING_FORMAT_IDS = ['book'];

/**
 * @param {unknown} value
 * @returns {value is ReadingFormat}
 */
export function isReadingFormat(value) {
  return typeof value === 'string' && READING_FORMAT_IDS.includes(/** @type {ReadingFormat} */ (value));
}
