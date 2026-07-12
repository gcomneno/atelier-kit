/** @typedef {'warm' | 'neutral' | 'dark' | 'noir' | 'intimate' | 'space' | 'funny-coloured' | 'custom'} AppearancePreset */
/** @typedef {import('./site-typography.js').FontPreset} FontPreset */

/** @typedef {'top' | 'center' | 'contain'} BackgroundFit */

/** @typedef {{ preset: AppearancePreset, base_color: string, accent_color: string, text_color: string, heading_color: string, card_color: string, font_preset: FontPreset, header_title_color: string, intro_title_color: string, background_image?: string, background_fit?: BackgroundFit }} SiteAppearance */

import { fontFamilyCss, resolveFontPreset } from './site-typography.js';

/** @type {{ id: AppearancePreset, label: string }[]} */
export const APPEARANCE_PRESET_OPTIONS = [
  { id: 'warm', label: 'Warm atelier (default)' },
  { id: 'neutral', label: 'Neutral paper' },
  { id: 'dark', label: 'Dark studio' },
  { id: 'noir', label: 'Noir' },
  { id: 'intimate', label: 'Intimate editorial' },
  { id: 'space', label: 'Shared universe' },
  { id: 'funny-coloured', label: 'Funny coloured' },
  { id: 'custom', label: 'Custom colors' }
];

/** @type {Record<Exclude<AppearancePreset, 'custom'>, Omit<SiteAppearance, 'font_preset' | 'background_image' | 'background_fit'>>} */
export const APPEARANCE_PRESETS = {
  warm: {
    preset: 'warm',
    base_color: '#f8f0e4',
    accent_color: '#d6be9a',
    text_color: '#2f281f',
    heading_color: '#2f281f',
    card_color: '#fefdfc',
    header_title_color: '#2f281f',
    intro_title_color: '#7a4f1a'
  },
  neutral: {
    preset: 'neutral',
    base_color: '#f4f2ee',
    accent_color: '#c8c2b8',
    text_color: '#1f1f1f',
    heading_color: '#1f1f1f',
    card_color: '#fefdfd',
    header_title_color: '#1f1f1f',
    intro_title_color: '#4a5568'
  },
  dark: {
    preset: 'dark',
    base_color: '#13110f',
    accent_color: '#e4c4a0',
    text_color: '#f8f4ec',
    heading_color: '#f8f4ec',
    card_color: '#42413f',
    header_title_color: '#f8f4ec',
    intro_title_color: '#e4c4a0'
  },
  noir: {
    preset: 'noir',
    base_color: '#0f0e0d',
    accent_color: '#8c3a44',
    text_color: '#e8e0d4',
    heading_color: '#f5efe6',
    card_color: '#1c1a18',
    header_title_color: '#f5efe6',
    intro_title_color: '#8c3a44'
  },
  intimate: {
    preset: 'intimate',
    base_color: '#f4eee8',
    accent_color: '#8d4f5b',
    text_color: '#3f3234',
    heading_color: '#2f2428',
    card_color: '#fffaf7',
    header_title_color: '#7f4d5a',
    intro_title_color: '#8a4f5b'
  },
  space: {
    preset: 'space',
    base_color: '#090b1a',
    accent_color: '#6f8cff',
    text_color: '#e8ecff',
    heading_color: '#ffffff',
    card_color: '#151a33',
    header_title_color: '#b6c2ff',
    intro_title_color: '#72d6e8'
  },
  'funny-coloured': {
    preset: 'funny-coloured',
    base_color: '#fff7e8',
    accent_color: '#087f7b',
    text_color: '#2d2a32',
    heading_color: '#31265a',
    card_color: '#ffffff',
    header_title_color: '#6c4bc1',
    intro_title_color: '#c13d46'
  }
};

const DEFAULT_APPEARANCE = APPEARANCE_PRESETS.warm;
const HEX_PATTERN = /^#[0-9a-fA-F]{6}$/;
const BACKGROUND_FIT_IDS = /** @type {const} */ (['top', 'center', 'contain']);

/**
 * @param {unknown} value
 * @returns {value is BackgroundFit}
 */
export function isBackgroundFit(value) {
  return value === 'top' || value === 'center' || value === 'contain';
}

/**
 * @param {unknown} value
 * @returns {BackgroundFit}
 */
export function resolveBackgroundFit(value) {
  return isBackgroundFit(value) ? value : 'top';
}

/**
 * @param {unknown} value
 * @returns {value is AppearancePreset}
 */
export function isAppearancePreset(value) {
  return typeof value === 'string' && APPEARANCE_PRESET_OPTIONS.some(({ id }) => id === value);
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
    return resolveSiteAppearance({ preset: 'warm' });
  }

  const preset = isAppearancePreset(appearance.preset) ? appearance.preset : DEFAULT_APPEARANCE.preset;
  const presetDefaults = preset === 'custom' ? DEFAULT_APPEARANCE : APPEARANCE_PRESETS[preset];
  const base_color = normalizeHex(appearance.base_color, presetDefaults.base_color);
  const accent_color = normalizeHex(appearance.accent_color, presetDefaults.accent_color);
  const text_color = normalizeHex(appearance.text_color, presetDefaults.text_color);
  const heading_color = normalizeHex(
    appearance.heading_color,
    presetDefaults.heading_color ?? text_color
  );

  return {
    preset,
    base_color,
    accent_color,
    text_color,
    heading_color,
    card_color: normalizeHex(
      appearance.card_color,
      presetDefaults.card_color ?? deriveCardColor(base_color)
    ),
    header_title_color: normalizeHex(
      appearance.header_title_color,
      presetDefaults.header_title_color ?? heading_color
    ),
    intro_title_color: normalizeHex(
      appearance.intro_title_color,
      presetDefaults.intro_title_color ?? heading_color
    ),
    font_preset: resolveFontPreset(appearance.font_preset),
    background_fit: resolveBackgroundFit(appearance.background_fit),
    ...(typeof appearance.background_image === 'string' && appearance.background_image.trim() !== ''
      ? { background_image: appearance.background_image.trim() }
      : {})
  };
}

/**
 * @param {string} hex
 */
function relativeLuminance(hex) {
  const rgb = hexToRgb(hex);

  if (!rgb) {
    return 1;
  }

  const channel = (/** @type {number} */ value) => {
    const normalized = value / 255;
    return normalized <= 0.03928
      ? normalized / 12.92
      : ((normalized + 0.055) / 1.055) ** 2.4;
  };

  return (
    0.2126 * channel(rgb.r) +
    0.7152 * channel(rgb.g) +
    0.0722 * channel(rgb.b)
  );
}

/**
 * @param {string} hexA
 * @param {string} hexB
 * @param {number} ratioOfB
 */
function mixHex(hexA, hexB, ratioOfB) {
  const a = hexToRgb(hexA);
  const b = hexToRgb(hexB);

  if (!a || !b) {
    return hexA;
  }

  const mix = (/** @type {number} */ channelA, /** @type {number} */ channelB) =>
    Math.round(channelA + (channelB - channelA) * ratioOfB);

  return rgbToHex(mix(a.r, b.r), mix(a.g, b.g), mix(a.b, b.b));
}

/**
 * @param {string} baseColor
 */
export function deriveCardColor(baseColor) {
  const darkBase = relativeLuminance(baseColor) < 0.2;
  return darkBase ? mixWithWhite(baseColor, 0.2) : mixWithWhite(baseColor, 0.88);
}

/**
 * @param {SiteAppearance} appearance
 */
export function appearanceCssVariables(appearance) {
  const resolved = resolveSiteAppearance(appearance);
  const darkBase = relativeLuminance(resolved.base_color) < 0.2;

  return {
    '--site-base-color': resolved.base_color,
    '--site-accent-color': resolved.accent_color,
    '--site-text-color': resolved.text_color,
    '--site-heading-color': resolved.heading_color,
    '--site-header-title-color': resolved.header_title_color,
    '--site-intro-title-color': resolved.intro_title_color,
    '--site-font-family': fontFamilyCss(resolved.font_preset),
    '--site-color-scheme': darkBase ? 'dark' : 'light',
    '--site-muted-text-color': mixHex(
      resolved.text_color,
      resolved.base_color,
      darkBase ? 0.28 : 0.42
    ),
    '--site-surface-color': darkBase
      ? mixWithWhite(resolved.base_color, 0.12)
      : mixWithWhite(resolved.base_color, 0.72),
    '--site-card-color': resolved.card_color,
    '--site-border-color': darkBase
      ? mixWithWhite(resolved.base_color, 0.34)
      : mixWithWhite(resolved.base_color, 0.55)
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
 * @param {FormDataEntryValue | null} headingColor
 * @param {FormDataEntryValue | null} cardColor
 * @param {FormDataEntryValue | null} cardColor
 * @param {FormDataEntryValue | null} headerTitleColor
 * @param {FormDataEntryValue | null} introTitleColor
 * @param {FormDataEntryValue | null} fontPreset
 * @param {FormDataEntryValue | null} backgroundFit
 * @returns {SiteAppearance}
 */
export function appearanceFromForm(
  preset,
  baseColor,
  accentColor,
  textColor,
  headingColor,
  cardColor,
  headerTitleColor,
  introTitleColor,
  fontPreset,
  backgroundFit
) {
  const presetValue = typeof preset === 'string' && isAppearancePreset(preset) ? preset : 'warm';
  const presetDefaults =
    presetValue === 'custom' ? DEFAULT_APPEARANCE : APPEARANCE_PRESETS[presetValue];

  return resolveSiteAppearance({
    preset: presetValue,
    base_color: typeof baseColor === 'string' ? baseColor : presetDefaults.base_color,
    accent_color: typeof accentColor === 'string' ? accentColor : presetDefaults.accent_color,
    text_color: typeof textColor === 'string' ? textColor : presetDefaults.text_color,
    heading_color: typeof headingColor === 'string' ? headingColor : presetDefaults.heading_color,
    card_color: typeof cardColor === 'string' ? cardColor : presetDefaults.card_color,
    header_title_color:
      typeof headerTitleColor === 'string' ? headerTitleColor : presetDefaults.header_title_color,
    intro_title_color:
      typeof introTitleColor === 'string' ? introTitleColor : presetDefaults.intro_title_color,
    font_preset: typeof fontPreset === 'string' ? fontPreset : undefined,
    background_fit: typeof backgroundFit === 'string' ? backgroundFit : undefined
  });
}
