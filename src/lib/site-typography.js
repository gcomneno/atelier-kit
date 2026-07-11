/** @typedef {'system' | 'inter' | 'source-serif' | 'fraunces' | 'dm-sans' | 'lora'} FontPreset */

/** @type {FontPreset[]} */
export const FONT_PRESET_IDS = ['system', 'inter', 'source-serif', 'fraunces', 'dm-sans', 'lora'];

/** @type {Record<FontPreset, { family: string, googleFontsHref: string | null }>} */
export const FONT_PRESETS = {
  system: {
    family:
      'ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    googleFontsHref: null
  },
  inter: {
    family:
      '"Inter", ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    googleFontsHref: 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap'
  },
  'source-serif': {
    family: '"Source Serif 4", ui-serif, Georgia, "Times New Roman", serif',
    googleFontsHref:
      'https://fonts.googleapis.com/css2?family=Source+Serif+4:ital,opsz,wght@0,8..60,400;0,8..60,600;0,8..60,700;1,8..60,400&display=swap'
  },
  fraunces: {
    family: '"Fraunces", ui-serif, Georgia, "Times New Roman", serif',
    googleFontsHref:
      'https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,400;0,9..144,600;0,9..144,700;1,9..144,400&display=swap'
  },
  'dm-sans': {
    family: '"DM Sans", ui-sans-serif, system-ui, sans-serif',
    googleFontsHref:
      'https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700;1,9..40,400&display=swap'
  },
  lora: {
    family: '"Lora", ui-serif, Georgia, "Times New Roman", serif',
    googleFontsHref:
      'https://fonts.googleapis.com/css2?family=Lora:ital,wght@0,400;0,500;0,600;0,700;1,400&display=swap'
  }
};

const DEFAULT_FONT_PRESET = /** @type {FontPreset} */ ('inter');

/**
 * @param {unknown} value
 * @returns {value is FontPreset}
 */
export function isFontPreset(value) {
  return typeof value === 'string' && value in FONT_PRESETS;
}

/**
 * @param {unknown} value
 * @returns {FontPreset}
 */
export function resolveFontPreset(value) {
  return isFontPreset(value) ? value : DEFAULT_FONT_PRESET;
}

/**
 * @param {FontPreset | unknown} preset
 */
export function fontFamilyCss(preset) {
  return FONT_PRESETS[resolveFontPreset(preset)].family;
}

/**
 * @param {FontPreset | unknown} preset
 * @returns {string | null}
 */
export function fontStylesheetHref(preset) {
  return FONT_PRESETS[resolveFontPreset(preset)].googleFontsHref;
}

/** @param {Iterable<FontPreset>} presets @returns {string[]} */
export function fontStylesheetHrefs(presets) {
  return [...new Set([...presets].map(fontStylesheetHref).filter((href) => href !== null))];
}
