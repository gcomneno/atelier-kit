/** @typedef {'single-column' | 'catalog-sidebar'} LayoutPreset */
/** @typedef {'collections' | 'catalog' | 'both'} HomeShowMode */

/** @type {LayoutPreset[]} */
export const LAYOUT_PRESETS = ['single-column', 'catalog-sidebar'];

/** @type {HomeShowMode[]} */
export const HOME_SHOW_MODES = ['collections', 'catalog', 'both'];

/** @type {LayoutPreset} */
export const DEFAULT_LAYOUT_PRESET = 'single-column';

/** @type {HomeShowMode} */
export const DEFAULT_HOME_SHOW = 'catalog';

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

/**
 * @param {unknown} value
 * @returns {value is HomeShowMode}
 */
export function isHomeShowMode(value) {
  return typeof value === 'string' && HOME_SHOW_MODES.includes(/** @type {HomeShowMode} */ (value));
}
