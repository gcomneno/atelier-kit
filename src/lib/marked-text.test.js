// @ts-nocheck
import assert from 'node:assert/strict';
import test from 'node:test';
import { existsSync, readFileSync, unlinkSync, writeFileSync } from 'node:fs';
import {
  MARKED_TEXT_FIELDS,
  assertValidMarkedText,
  markedTextFontPresets,
  markedTextToPlainText,
  notifyMarkedTextEdit,
  transformMarkedTextSelection,
  wrapMarkedTextSelection,
  validateMarkedTextValues
} from './marked-text.js';
import { studioFormDirty } from './studio-form-dirty.js';
import { parseEditorialMarkup, splitEditorialParagraphs } from './editorial-markup.js';
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
    assert.equal(fontEdit.value, '{font:lora}Studio title{/font}');
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

test('selection transformations are safe, predictable and preserve surrounding Unicode text', () => {
  assert.deepEqual(transformMarkedTextSelection('Caffè', 2, 2, 'accent'), {
    value: 'Caffè', selectionStart: 2, selectionEnd: 2, changed: false, status: 'empty'
  });

  const partial = transformMarkedTextSelection('Prima caffè dopo', 6, 11, 'white');
  assert.equal(partial.value, 'Prima {white}caffè{/white} dopo');
  assert.equal(partial.status, 'applied');
  assert.equal(partial.value.slice(partial.selectionStart, partial.selectionEnd), 'caffè');

  const complete = transformMarkedTextSelection('Tutto', 0, 5, 'larger');
  assert.equal(complete.value, '{larger}Tutto{/larger}');

  const same = transformMarkedTextSelection('{accent}Testo{/accent}', 8, 13, 'accent');
  assert.equal(same.changed, false);
  assert.equal(same.status, 'already-applied');

  const replacement = transformMarkedTextSelection('{accent}Testo{/accent}', 8, 13, 'black');
  assert.equal(replacement.value, '{black}Testo{/black}');
  assert.equal(replacement.status, 'replaced');

  const crossing = transformMarkedTextSelection('A {accent}Testo{/accent} B', 4, 18, 'muted');
  assert.equal(crossing.changed, false);
  assert.equal(crossing.status, 'crosses-markup');

  const invalid = transformMarkedTextSelection('{accent}Rotto', 8, 13, 'muted');
  assert.equal(invalid.changed, false);
  assert.equal(invalid.status, 'invalid-markup');
});

test('remove formatting handles inner, complete and whole-field selections without text loss', () => {
  const inner = transformMarkedTextSelection('A {accent}Testo{/accent} B', 10, 15, 'remove');
  assert.equal(inner.value, 'A Testo B');
  assert.equal(inner.value.slice(inner.selectionStart, inner.selectionEnd), 'Testo');

  const whole = '{white}Uno{/white} e {smaller}due{/smaller}';
  const removed = transformMarkedTextSelection(whole, 0, whole.length, 'remove');
  assert.equal(removed.value, 'Uno e due');
  assert.equal(removed.status, 'removed');

  const plain = transformMarkedTextSelection('Solo testo', 0, 10, 'remove');
  assert.equal(plain.value, 'Solo testo');
  assert.equal(plain.status, 'plain');
});

test('selection contract covers normalized ranges, token boundaries, escapes and commands', () => {
  const cases = [
    ['empty', 'Testo', 2, 2, 'accent', 'Testo', 'empty', false],
    ['clamped', 'Testo', -20, 99, 'accent', '{accent}Testo{/accent}', 'applied', true],
    ['reversed', 'Testo', 5, 0, 'accent', '{accent}Testo{/accent}', 'applied', true],
    ['unicode', 'Caffè lungo', 0, 5, 'muted', '{muted}Caffè{/muted} lungo', 'applied', true],
    ['emoji', 'A 🍋 B', 2, 4, 'larger', 'A {larger}🍋{/larger} B', 'applied', true],
    ['inner whole', '{accent}Testo{/accent}', 8, 13, 'black', '{black}Testo{/black}', 'replaced', true],
    ['inner partial', '{accent}Testo lungo{/accent}', 8, 13, 'black', '{accent}Testo lungo{/accent}', 'crosses-markup', false],
    ['inner partial remove', '{accent}Testo lungo{/accent}', 8, 13, 'remove', '{accent}Testo lungo{/accent}', 'crosses-markup', false],
    ['whole token', '{accent}Testo{/accent}', 0, 22, 'black', '{black}Testo{/black}', 'replaced', true],
    ['partial delimiter', '{accent}Testo{/accent}', 1, 13, 'black', '{accent}Testo{/accent}', 'crosses-markup', false],
    ['multiple tokens', '{accent}Uno{/accent} e {heading}Due{/heading}', 0, 47, 'black', '{black}Uno e Due{/black}', 'replaced', true],
    ['adjacent tokens', '{accent}Uno{/accent}{heading}Due{/heading}', 0, 44, 'remove', 'UnoDue', 'removed', true],
    ['same inner', '{accent}Testo{/accent}', 8, 13, 'accent', '{accent}Testo{/accent}', 'already-applied', false],
    ['same whole', '{accent}Testo{/accent}', 0, 22, 'accent', '{accent}Testo{/accent}', 'already-applied', false],
    ['remove token', '{accent}Testo{/accent}', 0, 22, 'remove', 'Testo', 'removed', true],
    ['escaped whole', '{{accent}}', 0, 10, 'muted', '{muted}{{accent}}{/muted}', 'applied', true],
    ['escaped open cut', '{{accent}}', 1, 10, 'muted', '{{accent}}', 'crosses-markup', false],
    ['escaped close cut', '{{accent}}', 0, 9, 'muted', '{{accent}}', 'crosses-markup', false],
    ['valid font', 'Testo', 0, 5, 'font:lora', '{font:lora}Testo{/font}', 'applied', true],
    ['invalid font', 'Testo', 0, 5, 'font:non-esiste', 'Testo', 'invalid-command', false],
    ['invalid command', 'Testo', 0, 5, 'rainbow', 'Testo', 'invalid-command', false],
    ['invalid source', '{accent}rotto', 8, 13, 'black', '{accent}rotto', 'invalid-markup', false]
  ];

  for (const [label, value, start, end, command, expected, status, changed] of cases) {
    const result = transformMarkedTextSelection(value, start, end, command);
    assert.equal(result.value, expected, label);
    assert.equal(result.status, status, label);
    assert.equal(result.changed, changed, label);
    if (result.changed) assert.equal(parseEditorialMarkup(result.value).ok, true, label);
  }
});

test('complete-token removal preserves escaped source for subsequent valid rendering', () => {
  const source = '{accent}Usa {{graffe}} letterali{/accent}';
  const result = transformMarkedTextSelection(source, 0, source.length, 'remove');
  assert.equal(result.value, 'Usa {{graffe}} letterali');
  assert.equal(parseEditorialMarkup(result.value).ok, true);
  assert.equal(markedTextToPlainText(result.value), 'Usa {graffe} letterali');
});

test('legacy wrapper delegates cursor and safety to the structural transformer', () => {
  assert.deepEqual(wrapMarkedTextSelection('Testo', 0, 5, 'accent'), {
    value: '{accent}Testo{/accent}', cursor: 22
  });
  assert.deepEqual(wrapMarkedTextSelection('{accent}Testo{/accent}', 8, 13, 'black'), {
    value: '{black}Testo{/black}', cursor: 20
  });
  assert.deepEqual(wrapMarkedTextSelection('{accent}Testo{/accent}', 8, 13, 'accent'), {
    value: '{accent}Testo{/accent}', cursor: 13
  });
  assert.deepEqual(wrapMarkedTextSelection('Testo', 0, 5, 'font:non-esiste'), {
    value: 'Testo', cursor: 5
  });
  assert.deepEqual(wrapMarkedTextSelection('{accent}rotto', 8, 13, 'black'), {
    value: '{accent}rotto', cursor: 13
  });
});

test('toolbar DOM exposes ordered accessible non-submit controls and live feedback', () => {
  const source = readFileSync('src/lib/components/MarkedTextField.svelte', 'utf8');
  assert.match(source, /role="group"/);
  assert.doesNotMatch(source, /role="toolbar"/);
  assert.match(source, /type="button"[\s\S]*aria-label=[\s\S]*disabled=/);
  assert.match(source, /\$props\.id\(\)/);
  assert.match(source, /aria-describedby=\{feedbackId\}/);
  assert.match(source, /id=\{feedbackId\}[\s\S]*role="status" aria-live="polite"/);
  assert.match(source, /selectionStart === selectionEnd[\s\S]*selectionRequired[\s\S]*: ''/);
  assert.match(source, /EDITORIAL_MARK_TAGS[\s\S]*inlineFont[\s\S]*studio\.editorial\.remove/);
  assert.match(source, /flex-wrap:\s*wrap/);
  assert.match(source, /\.toolbar-button:not\(:disabled\):hover/);
  assert.match(source, /\.toolbar-button:disabled,[\s\S]*\.toolbar-select:disabled[\s\S]*cursor:\s*default[\s\S]*opacity:/);
  assert.match(source, /event\.currentTarget\.value = ''/);
  assert.doesNotMatch(source, /tagline_display|quoteColor|taglineWrap/);
});

test('toolbar to validation to renderer integration consumes the same controlled value', () => {
  const edit = transformMarkedTextSelection('Firma atelier', 0, 5, 'larger');
  assert.equal(edit.value, '{larger}Firma{/larger} atelier');
  assert.deepEqual(validateMarkedTextValues([
    { path: 'site.hero_signature', value: edit.value, mode: 'multiline' }
  ]), []);
  const parsed = parseEditorialMarkup(edit.value);
  assert.equal(parsed.ok, true);
  if (parsed.ok) {
    assert.equal(parsed.html, '<span class="mark-larger">Firma</span> atelier');
    assert.doesNotMatch(parsed.html, /\{\/?larger\}/);
  }
});

test('shared EditorialText SSR renders controlled classes, escapes and safe invalid fallback', async (context) => {
  let compile;
  let render;
  try {
    ({ compile } = await import('svelte/compiler'));
    ({ render } = await import('svelte/server'));
  } catch (error) {
    if (error?.code !== 'ERR_MODULE_NOT_FOUND') throw error;
    context.skip('Svelte is not installed in the portable upgrade-test fixture.');
    return;
  }
  const sourceUrl = new URL('./components/EditorialText.svelte', import.meta.url);
  const generatedUrl = new URL(`./components/.editorial-text-ssr-${process.pid}.mjs`, import.meta.url);
  const compiled = compile(readFileSync(sourceUrl, 'utf8'), { filename: sourceUrl.pathname, generate: 'server' });
  writeFileSync(generatedUrl, compiled.js.code.replace("'$lib/editorial-markup.js'", "'../editorial-markup.js'"));
  try {
    const component = (await import(`${generatedUrl.href}?v=${Date.now()}`)).default;
    const ssr = (value, className = 'editorial-preview') => render(component, {
      props: { value, tag: 'p', class: className }
    }).body;
    const valid = ssr('{white}W{/white} {black}B{/black} {larger}L{/larger} {smaller}S{/smaller} {accent}{{x}} & <b>{/accent}');
    for (const className of ['mark-white', 'mark-black', 'mark-larger', 'mark-smaller', 'mark-accent']) {
      assert.match(valid, new RegExp(`class="${className}"`));
    }
    assert.match(valid, /\{x\} &amp; &lt;b&gt;/);
    assert.doesNotMatch(valid, /<b>/);
    assert.match(valid, /class="editorial-preview"/);
    assert.match(ssr('{accent}Visitor{/accent}', 'hero-signature'), /class="mark-accent"/);
    assert.match(ssr('{accent}Visitor{/accent}'), /class="mark-accent"/);
    const invalid = ssr('{{nota}} {accent}rotto <script>');
    assert.match(invalid, /\{nota\} rotto &lt;script(?:&gt;|>)/);
    assert.doesNotMatch(invalid, /\{accent\}|<script>/);
  } finally {
    unlinkSync(generatedUrl);
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
