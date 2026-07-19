// @ts-nocheck
import assert from 'node:assert/strict';
import test from 'node:test';
import { existsSync, readFileSync } from 'node:fs';
import {
  MARKED_TEXT_FIELDS,
  assertValidMarkedText,
  markedTextFontPresets,
  markedTextToPlainText,
  notifyMarkedTextEdit,
  wrapMarkedTextSelection,
  validateMarkedTextValues
} from './marked-text.js';
import { studioFormDirty } from './studio-form-dirty.js';
import { splitEditorialParagraphs } from './editorial-markup.js';
import en from './i18n/messages/en.js';
import it from './i18n/messages/it.js';

function numberedHelpKeys(source, name) {
  const match = source.match(new RegExp(`const ${name} = \\[([^\\]]*)\\]`));
  assert.ok(match, `Missing ${name} Help inventory`);
  return match[1].split(',').map((value) => Number(value.trim()));
}

test('canonical inventory distinguishes single-line and multiline marked fields', () => {
  assert.ok(MARKED_TEXT_FIELDS.some((field) => field.path === 'items.{id}.title' && field.mode === 'single-line'));
  assert.ok(MARKED_TEXT_FIELDS.some((field) => field.path === 'catalog.intro' && field.mode === 'multiline'));
  assert.ok(!MARKED_TEXT_FIELDS.some((field) => /(?:id|slug|date|url|alt|status|preset)$/.test(field.path)));
});

test('single-line and multiline values share valid and invalid Atelier Mark validation', () => {
  assert.deepEqual(validateMarkedTextValues([
    { path: 'title', value: '{accent}Title{/accent}' },
    { path: 'body', value: '{intro}One{/intro}\n\n{font:lora}Two{/font}', mode: 'multiline' }
  ]), []);
  assert.throws(() => assertValidMarkedText([
    { path: 'body', value: 'One\n\n{accent}broken', mode: 'multiline' }
  ]), /body: Unclosed tag/);
});

test('multiline paragraph boundaries remain semantic', () => {
  assert.deepEqual(splitEditorialParagraphs('First line\ncontinued\n\nSecond paragraph'), [
    'First line\ncontinued',
    'Second paragraph'
  ]);
});

test('plain projection removes tokens and preserves existing plain strings', () => {
  assert.equal(markedTextToPlainText('{accent}Visible{/accent} {font:lora}copy{/font}'), 'Visible copy');
  assert.equal(markedTextToPlainText('Existing plain copy'), 'Existing plain copy');
  assert.doesNotMatch(markedTextToPlainText('{heading}SEO{/heading}'), /\{\/?(?:heading|font)/);
});

test('font discovery includes non-identity marked values', () => {
  assert.deepEqual(markedTextFontPresets(['Catalog', '{font:lora}Collection description{/font}']), ['lora']);
});

test('MarkedTextField exposes single-line, multiline and paragraph-aware preview modes', () => {
  const source = readFileSync('src/lib/components/MarkedTextField.svelte', 'utf8');
  assert.match(source, /\{#if multiline\}[\s\S]*<textarea/);
  assert.match(source, /\{:else\}[\s\S]*<input/);
  assert.match(source, /previewParagraphs[\s\S]*split\(\/\\n\\s\*\\n\//);
});

test('decorative quote controls and rendering are absent while plain tagline text remains', () => {
  const field = readFileSync('src/lib/components/MarkedTextField.svelte', 'utf8');
  const renderer = readFileSync('src/lib/components/EditorialText.svelte', 'utf8');
  const home = readFileSync('src/routes/+page.svelte', 'utf8');
  const studio = readFileSync('src/routes/studio/site/identity/+page.svelte', 'utf8');

  for (const source of [field, renderer, home, studio]) {
    assert.doesNotMatch(source, /tagline_display_(?:wrap|quote_color)|epigraph-quote|component-quotes/);
  }
  assert.doesNotMatch(home, /hero-epigraph|content:\s*['"](?:«|\\202f)/);
  assert.match(home, /<EditorialText[\s\S]*value=\{data\.site\.tagline\}/);
});

test('new scaffolds and active operator copy do not advertise retired quote configuration', () => {
  const scaffold = readFileSync('scripts/scaffold-client.js', 'utf8');
  assert.doesNotMatch(scaffold, /tagline_display|quote_color/);

  for (const path of [
    'docs/usage/editorial-markup.md',
    'docs/usage/configuration.md',
    'docs/usage/studio.md',
    'src/lib/i18n/messages/en.js',
    'src/lib/i18n/messages/it.js'
  ]) {
    if (!existsSync(path)) continue;
    const source = readFileSync(path, 'utf8');
    assert.doesNotMatch(source, /Epigraph quotes|Colore virgolette|Quote color|taglineWrap|quoteColor/);
  }

});

test('Studio Help does not reference retired Atelier Mark epigraph copy', {
  skip: !existsSync('src/routes/studio/help/+page.svelte')
}, () => {
  const help = readFileSync('src/routes/studio/help/+page.svelte', 'utf8');
  assert.doesNotMatch(help, /atelierMark\.epigraphNote|taglineWrap|quoteColor/);
  const studioKeys = numberedHelpKeys(help, 'atelierMarkStudio');
  assert.deepEqual(studioKeys, [1, 2, 3]);
  for (const messages of [en, it]) {
    assert.deepEqual(studioKeys, Object.keys(messages.studio.help.atelierMark.studio).map(Number));
    assert.equal(messages.studio.help.atelierMark.epigraphNote, undefined);
  }
  const whereKeys = numberedHelpKeys(help, 'atelierMarkWhere');
  assert.deepEqual(whereKeys, [1, 2, 3, 4]);
  for (const messages of [en, it]) {
    assert.deepEqual(whereKeys, Object.keys(messages.studio.help.atelierMark.where).map(Number));
    assert.match(messages.studio.help.atelierMark.where[4], /signature|Firma/i);
  }
});

test('toolbar markup and font edits update the successful value before marking the form dirty', async () => {
  const originalFormData = globalThis.FormData;
  const form = new EventTarget();
  const field = {
    name: 'header_title',
    value: 'Studio title',
    dispatchEvent(event) {
      return form.dispatchEvent(event);
    }
  };
  const dirtyStates = [];
  const serializedValues = [];
  const dirtyControl = {};

  globalThis.FormData = class {
    constructor(node) {
      assert.equal(node, form);
    }

    *entries() {
      serializedValues.push(field.value);
      yield [field.name, field.value];
    }
  };

  try {
    const action = studioFormDirty(form, {
      setDirty: (dirty) => dirtyStates.push(dirty),
      dirtyControl
    });
    await Promise.resolve();

    const markupEdit = wrapMarkedTextSelection(field.value, 0, 6, 'accent');
    assert.deepEqual(markupEdit, {
      value: '{accent}Studio{/accent} title',
      cursor: 23
    });
    notifyMarkedTextEdit(field, markupEdit.value);
    assert.equal(dirtyStates.at(-1), true);
    assert.equal(serializedValues.at(-1), markupEdit.value);

    dirtyControl.resetBaseline();
    assert.equal(dirtyStates.at(-1), false);

    const fontEdit = wrapMarkedTextSelection(field.value, 0, field.value.length, 'font:lora');
    assert.equal(fontEdit.value, '{font:lora}{accent}Studio{/accent} title{/font}');
    notifyMarkedTextEdit(field, fontEdit.value);
    assert.equal(dirtyStates.at(-1), true);
    assert.equal(serializedValues.at(-1), fontEdit.value);

    dirtyControl.resetBaseline();
    field.value += '!';
    field.dispatchEvent(new Event('input', { bubbles: true }));
    assert.equal(dirtyStates.at(-1), true);

    action.destroy();
  } finally {
    globalThis.FormData = originalFormData;
  }
});

test('catalog intro regression renders marked paragraphs on home and catalog routes', () => {
  for (const route of ['src/routes/+page.svelte', 'src/routes/catalog/+page.svelte']) {
    const source = readFileSync(route, 'utf8');
    assert.match(source, /splitEditorialParagraphs/);
    assert.match(source, /<EditorialText[^>]+value=\{paragraph\}/);
  }
});

test('hero signature shares Studio validation, preview and safe visitor rendering', () => {
  const validTokens = [
    '{accent}Firma{/accent}',
    '{intro}Firma{/intro}',
    '{heading}Firma{/heading}',
    '{muted}Firma{/muted}',
    '{font:lora}Firma{/font}',
    'Firma semplice',
    ''
  ];
  for (const value of validTokens) {
    assert.deepEqual(validateMarkedTextValues([
      { path: 'site.hero_signature', value, mode: 'multiline' }
    ]), []);
  }
  for (const value of ['{unknown}Firma{/unknown}', '{accent}Firma', '{accent}{muted}Firma{/muted}{/accent}', '<b>Firma</b> {bad}']) {
    assert.ok(validateMarkedTextValues([
      { path: 'site.hero_signature', value, mode: 'multiline' }
    ]).length > 0);
  }

  const identity = readFileSync('src/routes/studio/site/identity/+page.svelte', 'utf8');
  const home = readFileSync('src/routes/+page.svelte', 'utf8');
  assert.match(identity, /name="hero_signature"[\s\S]*onvaluechange=\{updateEditorialDraft\}/);
  assert.match(home, /<EditorialText tag="p" class="hero-signature" value=\{data\.site\.hero_signature\} \/>/);
  assert.doesNotMatch(home, /class="hero-signature">\{data\.site\.hero_signature\}/);
});

test('plain consumer modules use the canonical projection', () => {
  for (const modulePath of [
    'src/lib/server/search-index.js',
    'src/lib/server/json-ld.js',
    'src/lib/server/rss.js'
  ]) {
    assert.match(readFileSync(modulePath, 'utf8'), /markedTextToPlainText/);
  }
});
