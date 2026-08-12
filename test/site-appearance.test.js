import assert from 'node:assert/strict';
import test from 'node:test';

import { localizedAppearancePresets } from '../src/lib/i18n/index.js';
import {
  APPEARANCE_PRESET_OPTIONS,
  APPEARANCE_PRESETS,
  appearanceCssVariables,
  appearanceFromForm,
  appearanceThemePreset,
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

test('maps canonical named palettes to GIADA semantic theme tokens', () => {
  const presets = /** @type {Record<string, any>} */ (APPEARANCE_PRESETS);

  for (const id of ['warm', 'neutral', 'dark', 'noir', 'intimate', 'space', 'funny-coloured']) {
    const palette = presets[id];
    const font = RECOMMENDED_FONTS[id] ?? 'inter';
    const variables = /** @type {Record<string, string>} */ (
      appearanceCssVariables({ ...palette, font_preset: font })
    );

    assert.equal(appearanceThemePreset({ preset: id }), id);
    assert.equal(variables['--site-base-color'], 'var(--giu-theme-base)');
    assert.equal(variables['--site-accent-color'], 'var(--giu-theme-accent)');
    assert.equal(variables['--site-text-color'], 'var(--giu-theme-text)');
    assert.equal(variables['--site-heading-color'], 'var(--giu-theme-heading)');
    assert.equal(variables['--site-card-color'], 'var(--giu-theme-card)');
    assert.equal(variables['--site-muted-text-color'], 'var(--giu-theme-muted)');
    assert.equal(variables['--site-surface-color'], 'var(--giu-theme-surface)');
    assert.equal(variables['--site-border-color'], 'var(--giu-theme-border)');
    assert.equal(variables['--site-color-scheme'], 'var(--giu-theme-color-scheme)');
    assert.equal(variables['--site-header-title-color'], palette.header_title_color);
    assert.equal(variables['--site-intro-title-color'], palette.intro_title_color);
    assert.equal(variables['--site-font-family'], fontFamilyCss(font));
    assert.equal('--giu-theme-base' in variables, false);
  }
});

test('preserves edited named palettes by overriding the GIADA semantic contract', () => {
  const variables = /** @type {Record<string, string>} */ (
    appearanceCssVariables({
      ...APPEARANCE_PRESETS.warm,
      base_color: '#123456',
      text_color: '#fefefe',
      font_preset: 'inter'
    })
  );

  assert.equal(appearanceThemePreset({ preset: 'warm' }), 'warm');
  assert.equal(variables['--giu-theme-base'], '#123456');
  assert.equal(variables['--giu-theme-text'], '#fefefe');
  assert.equal(variables['--site-base-color'], 'var(--giu-theme-base)');
  assert.equal(variables['--site-text-color'], 'var(--giu-theme-text)');
  assert.match(variables['--giu-theme-muted'], /^#[0-9a-f]{6}$/);
  assert.match(variables['--giu-theme-border'], /^#[0-9a-f]{6}$/);
});

test('custom palettes use a neutral GIADA baseline and override all generic semantic tokens', () => {
  const custom = {
    preset: 'custom',
    base_color: '#123456',
    accent_color: '#234567',
    text_color: '#f5f5f5',
    heading_color: '#ffffff',
    card_color: '#345678',
    header_title_color: '#eeeeee',
    intro_title_color: '#dddddd',
    font_preset: 'lora'
  };
  const variables = /** @type {Record<string, string>} */ (appearanceCssVariables(custom));

  assert.equal(appearanceThemePreset(custom), 'neutral');
  assert.equal(variables['--giu-theme-base'], '#123456');
  assert.equal(variables['--giu-theme-accent'], '#234567');
  assert.equal(variables['--giu-theme-text'], '#f5f5f5');
  assert.equal(variables['--giu-theme-heading'], '#ffffff');
  assert.equal(variables['--giu-theme-card'], '#345678');
  assert.equal(variables['--giu-theme-color-scheme'], 'dark');
  assert.equal(variables['--site-font-family'], fontFamilyCss('lora'));
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