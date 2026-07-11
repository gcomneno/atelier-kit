import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import {
  MARKED_TEXT_FIELDS,
  assertValidMarkedText,
  markedTextFontPresets,
  markedTextToPlainText,
  validateMarkedTextValues
} from './marked-text.js';
import { splitEditorialParagraphs } from './editorial-markup.js';

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

test('catalog intro regression renders marked paragraphs on home and catalog routes', () => {
  for (const route of ['src/routes/+page.svelte', 'src/routes/catalog/+page.svelte']) {
    const source = readFileSync(route, 'utf8');
    assert.match(source, /splitEditorialParagraphs/);
    assert.match(source, /<EditorialText[^>]+value=\{paragraph\}/);
  }
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
