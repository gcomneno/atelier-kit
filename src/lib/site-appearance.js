/** @typedef {'warm' | 'neutral' | 'dark' | 'custom'} AppearancePreset */

/** @typedef {{ preset: AppearancePreset, base_color: string, accent_color: string, text_color: string, background_image?: string }} SiteAppearance */

export const APPEARANCE_PRESET_OPTIONS = [
  { id: 'warm', label: 'Warm atelier (default)' },
  { id: 'neutral', label: 'Neutral paper' },
  { id: 'dark', label: 'Dark studio' },
  { id: 'custom', label: 'Custom colors' }
];

/** @type {Record<Exclude<AppearancePreset, 'custom'>, SiteAppearance>} */
export const APPEARANCE_PRESETS = {
  warm: {
    preset: 'warm',
    base_color: '#f8f0e4',
    accent_color: '#d6be9a',
    text_color: '#2f281f'
  },
  neutral: {
    preset: 'neutral',
    base_color: '#f4f2ee',
    accent_color: '#c8c2b8',
    text_color: '#1f1f1f'
  },
  dark: {
    preset: 'dark',
    base_color: '#1c1916',
    accent_color: '#5c4a3a',
    text_color: '#f3ece2'
  }
};

const DEFAULT_APPEARANCE = APPEARANCE_PRESETS.warm;
const HEX_PATTERN = /^#[0-9a-fA-F]{6}$/;

/**
 * @param {unknown} value
 * @returns {value is AppearancePreset}
 */
export function isAppearancePreset(value) {
  return value === 'warm' || value === 'neutral' || value === 'dark' || value === 'custom';
}

/**
 * @param {unknown} value
 * @param {string} fallback
 */
function normalizeHex(value, fallback) {
  if (typeof value !== 'string') {
    return fallback;
  }

  const trimmed = value.trim();

  if (HEX_PATTERN.test(trimmed)) {
    return trimmed.toLowerCase();
  }

  return fallback;
}

/**
 * @param {Record<string, unknown> | undefined | null} appearance
 * @returns {SiteAppearance}
 */
export function resolveSiteAppearance(appearance) {
  if (!appearance || typeof appearance !== 'object' || Array.isArray(appearance)) {
    return { ...DEFAULT_APPEARANCE };
  }

  const preset = isAppearancePreset(appearance.preset) ? appearance.preset : DEFAULT_APPEARANCE.preset;
  const presetDefaults = preset === 'custom' ? DEFAULT_APPEARANCE : APPEARANCE_PRESETS[preset];

  return {
    preset,
    base_color: normalizeHex(appearance.base_color, presetDefaults.base_color),
    accent_color: normalizeHex(appearance.accent_color, presetDefaults.accent_color),
    text_color: normalizeHex(appearance.text_color, presetDefaults.text_color),
    ...(typeof appearance.background_image === 'string' && appearance.background_image.trim() !== ''
      ? { background_image: appearance.background_image.trim() }
      : {})
  };
}

/**
 * @param {SiteAppearance} appearance
 */
export function appearanceCssVariables(appearance) {
  const resolved = resolveSiteAppearance(appearance);

  return {
    '--site-base-color': resolved.base_color,
    '--site-accent-color': resolved.accent_color,
    '--site-text-color': resolved.text_color,
    '--site-surface-color': mixWithWhite(resolved.base_color, 0.72),
    '--site-card-color': mixWithWhite(resolved.base_color, 0.88)
  };
}

/**
 * @param {string} hex
 * @param {number} whiteRatio 0–1 amount of white to mix in
 */
function mixWithWhite(hex, whiteRatio) {
  const rgb = hexToRgb(hex);

  if (!rgb) {
    return '#fffaf2';
  }

  const mix = /** @param {number} channel */ (channel) =>
    Math.round(channel + (255 - channel) * whiteRatio);
  return rgbToHex(mix(rgb.r), mix(rgb.g), mix(rgb.b));
}

/**
 * @param {string} hex
 */
function hexToRgb(hex) {
  const match = /^#([0-9a-fA-F]{6})$/.exec(hex);

  if (!match) {
    return null;
  }

  const value = Number.parseInt(match[1], 16);

  return {
    r: (value >> 16) & 255,
    g: (value >> 8) & 255,
    b: value & 255
  };
}

/**
 * @param {number} r
 * @param {number} g
 * @param {number} b
 */
function rgbToHex(r, g, b) {
  return `#${[r, g, b]
    .map((channel) => channel.toString(16).padStart(2, '0'))
    .join('')}`;
}

/**
 * @param {FormDataEntryValue | null} preset
 * @param {FormDataEntryValue | null} baseColor
 * @param {FormDataEntryValue | null} accentColor
 * @param {FormDataEntryValue | null} textColor
 * @returns {SiteAppearance}
 */
export function appearanceFromForm(preset, baseColor, accentColor, textColor) {
  const presetValue = typeof preset === 'string' && isAppearancePreset(preset) ? preset : 'warm';

  if (presetValue !== 'custom') {
    return { ...APPEARANCE_PRESETS[presetValue] };
  }

  return resolveSiteAppearance({
    preset: 'custom',
    base_color: typeof baseColor === 'string' ? baseColor : DEFAULT_APPEARANCE.base_color,
    accent_color: typeof accentColor === 'string' ? accentColor : DEFAULT_APPEARANCE.accent_color,
    text_color: typeof textColor === 'string' ? textColor : DEFAULT_APPEARANCE.text_color
  });
}
