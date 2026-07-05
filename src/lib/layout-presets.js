/** @typedef {'single-column' | 'catalog-sidebar'} LayoutPreset */

/** @type {LayoutPreset[]} */
export const LAYOUT_PRESETS = ['single-column', 'catalog-sidebar'];

/** @type {LayoutPreset} */
export const DEFAULT_LAYOUT_PRESET = 'single-column';

/** @type {number} */
export const DEFAULT_LATEST_NEWS_COUNT = 3;

/** @type {number} */
export const MAX_LATEST_NEWS_COUNT = 10;

/**
 * @param {unknown} value
 * @returns {value is LayoutPreset}
 */
export function isLayoutPreset(value) {
  return typeof value === 'string' && LAYOUT_PRESETS.includes(/** @type {LayoutPreset} */ (value));
}
