import assert from 'node:assert/strict';
import test from 'node:test';

import { localizedAppearancePresets } from '../src/lib/i18n/index.js';
import {
  APPEARANCE_PRESET_OPTIONS,
  APPEARANCE_PRESETS,
  appearanceCssVariables,
  appearanceFromForm,
  isAppearancePreset,
  resolveSiteAppearance
} from '../src/lib/site-appearance.js';
import { fontFamilyCss } from '../src/lib/site-typography.js';

const PRESET_IDS = [
  'warm',
  'neutral',
  'dark',
  'noir',
  'intimate',
  'space',
  'funny-coloured',
  'custom'
];

/** @type {Record<string, any>} */
const NEW_PRESETS = {
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

/** @type {Record<string, any>} */
const RECOMMENDED_FONTS = {
  intimate: 'lora',
  space: 'dm-sans',
  'funny-coloured': 'fraunces'
};

const COLOR_KEYS = [
  'preset',
  'base_color',
  'accent_color',
  'text_color',
  'heading_color',
  'card_color',
  'header_title_color',
  'intro_title_color'
];

/** @param {Record<string, any>} appearance */
function paletteFrom(appearance) {
  return Object.fromEntries(COLOR_KEYS.map((key) => [key, appearance[key]]));
}

test('recognizes every appearance preset and exposes each ID once in the expected order', () => {
  assert.deepEqual(APPEARANCE_PRESET_OPTIONS.map(({ id }) => id), PRESET_IDS);
  assert.equal(new Set(APPEARANCE_PRESET_OPTIONS.map(({ id }) => id)).size, PRESET_IDS.length);

  for (const id of PRESET_IDS) assert.equal(isAppearancePreset(id), true);
  for (const value of ['unknown', '', null, undefined, 42]) {
    assert.equal(isAppearancePreset(value), false);
  }
});

test('localizes every appearance preset in English and Italian', () => {
  for (const locale of ['en', 'it']) {
    const options = localizedAppearancePresets(locale);
    assert.deepEqual(options.map(({ id }) => id), PRESET_IDS);
    assert.ok(options.every(({ label }) => typeof label === 'string' && label.length > 0));
  }
});

test('defines the three approved palettes exactly without embedded fonts', () => {
  const presets = /** @type {Record<string, any>} */ (APPEARANCE_PRESETS);

  for (const [id, palette] of Object.entries(NEW_PRESETS)) {
    assert.deepEqual(presets[id], palette);
    assert.equal('font_preset' in presets[id], false);
  }
});

test('resolves new palettes with the existing font fallback and preserves explicit fonts', () => {
  for (const [id, palette] of Object.entries(NEW_PRESETS)) {
    const resolved = resolveSiteAppearance({ preset: id });
    assert.deepEqual(paletteFrom(resolved), palette);
    assert.equal(resolved.font_preset, 'inter');

    const font_preset = RECOMMENDED_FONTS[id];
    const explicit = resolveSiteAppearance({ preset: id, font_preset });
    assert.deepEqual(paletteFrom(explicit), palette);
    assert.equal(explicit.font_preset, font_preset);
  }
});

test('accepts new presets from forms, applies their defaults and preserves explicit fonts', () => {
  for (const [id, palette] of Object.entries(NEW_PRESETS)) {
    const font = RECOMMENDED_FONTS[id];
    const appearance = appearanceFromForm(id, null, null, null, null, null, null, null, font, null);
    assert.deepEqual(paletteFrom(appearance), palette);
    assert.equal(appearance.font_preset, font);
  }

  const invalid = appearanceFromForm('unknown', null, null, null, null, null, null, null, 'lora', null);
  assert.deepEqual(paletteFrom(invalid), APPEARANCE_PRESETS.warm);
  assert.equal(invalid.font_preset, 'lora');
});

test('emits direct CSS variables for each new preset', () => {
  /** @type {Record<string, string>} */
  const schemes = { intimate: 'light', space: 'dark', 'funny-coloured': 'light' };

  for (const [id, palette] of Object.entries(NEW_PRESETS)) {
    const font = RECOMMENDED_FONTS[id];
    const variables = /** @type {Record<string, string>} */ (
      appearanceCssVariables({ ...palette, font_preset: font })
    );
    assert.deepEqual(
      Object.fromEntries(
        [
          '--site-base-color',
          '--site-accent-color',
          '--site-text-color',
          '--site-heading-color',
          '--site-header-title-color',
          '--site-intro-title-color',
          '--site-card-color',
          '--site-font-family',
          '--site-color-scheme'
        ].map((key) => [key, variables[key]])
      ),
      {
        '--site-base-color': palette.base_color,
        '--site-accent-color': palette.accent_color,
        '--site-text-color': palette.text_color,
        '--site-heading-color': palette.heading_color,
        '--site-header-title-color': palette.header_title_color,
        '--site-intro-title-color': palette.intro_title_color,
        '--site-card-color': palette.card_color,
        '--site-font-family': fontFamilyCss(font),
        '--site-color-scheme': schemes[id]
      }
    );
  }
});

test('keeps legacy, custom and invalid-preset resolution compatible', () => {
  for (const id of /** @type {const} */ (['warm', 'neutral', 'dark', 'noir'])) {
    assert.deepEqual(paletteFrom(resolveSiteAppearance({ preset: id })), APPEARANCE_PRESETS[id]);
  }

  const custom = resolveSiteAppearance({
    preset: 'custom',
    base_color: '#123456',
    accent_color: '#234567',
    text_color: '#345678',
    heading_color: '#456789',
    card_color: '#56789a',
    header_title_color: '#6789ab',
    intro_title_color: '#789abc',
    font_preset: 'lora'
  });
  assert.equal(custom.preset, 'custom');
  assert.equal(custom.base_color, '#123456');
  assert.equal(custom.font_preset, 'lora');

  assert.deepEqual(
    paletteFrom(resolveSiteAppearance({ preset: 'unknown' })),
    APPEARANCE_PRESETS.warm
  );
});
