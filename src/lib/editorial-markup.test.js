import assert from 'node:assert/strict';
import test from 'node:test';

import {
  editorialFontPresets,
  parseEditorialMarkup,
  splitEditorialParagraphs,
  stripEditorialMarkup,
  validateEditorialFields,
  validateEditorialParagraphs
} from './editorial-markup.js';
import { fontStylesheetHrefs } from './site-typography.js';

test('plain text passes through escaped', () => {
  const result = parseEditorialMarkup('Narrativa breve & seriale');

  assert.equal(result.ok, true);
  if (result.ok) {
    assert.equal(result.html, 'Narrativa breve &amp; seriale');
  }
});

test('accent tag renders mark span', () => {
  const result = parseEditorialMarkup('{accent}Narrativa breve{/accent}');

  assert.equal(result.ok, true);
  if (result.ok) {
    assert.equal(
      result.html,
      '<span class="mark-accent">Narrativa breve</span>'
    );
  }
});

test('font tag renders a whitelisted preset family', () => {
  const result = parseEditorialMarkup('{font:fraunces}Titolo{/font}');
  assert.equal(result.ok, true);
  if (result.ok) {
    assert.equal(
      result.html,
      '<span class="mark-font mark-font-fraunces" style="font-family: &quot;Fraunces&quot;, ui-serif, Georgia, &quot;Times New Roman&quot;, serif">Titolo</span>'
    );
    assert.deepEqual(result.fontPresets, ['fraunces']);
  }
});

test('system font renders safely without an external stylesheet', () => {
  const result = parseEditorialMarkup('{font:system}Testo{/font}');
  assert.equal(result.ok, true);
  if (result.ok) {
    assert.match(result.html, /style="font-family: ui-sans-serif,/);
    assert.deepEqual(result.fontPresets, ['system']);
    assert.deepEqual(fontStylesheetHrefs(result.fontPresets), []);
  }
});

test('rejects unknown and arbitrary inline font values', () => {
  assert.equal(parseEditorialMarkup('{font:comic-sans}No{/font}').ok, false);
  assert.equal(parseEditorialMarkup('{font:https://example.com/font}No{/font}').ok, false);
  assert.equal(parseEditorialMarkup('{font:Fraunces; color:red}No{/font}').ok, false);
});

test('font tags cannot nest with color tags', () => {
  assert.equal(parseEditorialMarkup('{font:lora}{accent}No{/accent}{/font}').ok, false);
  assert.equal(parseEditorialMarkup('{accent}{font:lora}No{/font}{/accent}').ok, false);
});

test('rejects unclosed and incorrectly closed font tags', () => {
  assert.equal(parseEditorialMarkup('{font:lora}No').ok, false);
  assert.equal(parseEditorialMarkup('{font:lora}No{/accent}').ok, false);
  assert.equal(parseEditorialMarkup('{accent}No{/font}').ok, false);
});

test('escaped font syntax stays literal and does not load a font', () => {
  const result = parseEditorialMarkup('{{font:lora}}');
  assert.equal(result.ok, true);
  if (result.ok) {
    assert.equal(result.html, '{font:lora}');
    assert.deepEqual(result.fontPresets, []);
  }
  assert.deepEqual(editorialFontPresets('{{font:lora}}'), []);
});

test('collects fonts only from wholly valid markup', () => {
  assert.deepEqual(
    editorialFontPresets(
      '{font:fraunces}Valid{/font}',
      '{font:lora}{accent}Nested{/accent}{/font}',
      '{font:dm-sans}Unclosed'
    ),
    ['fraunces']
  );
});

test('collects used presets while system has no external stylesheet', () => {
  const presets = editorialFontPresets(
    '{font:system}A{/font}',
    '{font:lora}B{/font}',
    '{font:nope}C{/font}'
  );
  assert.deepEqual(presets, ['system', 'lora']);
  assert.deepEqual(fontStylesheetHrefs(presets), [
    'https://fonts.googleapis.com/css2?family=Lora:ital,wght@0,400;0,500;0,600;0,700;1,400&display=swap'
  ]);
});

test('deduplicates the global font and valid inline fonts', () => {
  const inline = editorialFontPresets(
    '{font:lora}One{/font} {font:fraunces}Two{/font} {font:lora}Three{/font}'
  );
  assert.deepEqual(inline, ['fraunces', 'lora']);
  assert.equal(fontStylesheetHrefs(['lora', ...inline]).length, 2);
});

test('escaped braces stay literal', () => {
  const result = parseEditorialMarkup('Use {{accent}} for emphasis');

  assert.equal(result.ok, true);
  if (result.ok) {
    assert.equal(result.html, 'Use {accent} for emphasis');
  }
});

test('rejects unknown tags', () => {
  const result = parseEditorialMarkup('{bold}Hi{/bold}');

  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.match(result.errors.join(' '), /Unknown tag/);
  }
});

test('rejects nested tags', () => {
  const result = parseEditorialMarkup('{accent}{intro}Hi{/intro}{/accent}');

  assert.equal(result.ok, false);
});

test('rejects unclosed tags', () => {
  const result = parseEditorialMarkup('{accent}Hi');

  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.match(result.errors.join(' '), /Unclosed tag/);
  }
});

test('stripEditorialMarkup removes tags', () => {
  assert.equal(
    stripEditorialMarkup('{accent}Narrativa{/accent} breve'),
    'Narrativa breve'
  );
});

test('stripEditorialMarkup removes inline font tags', () => {
  assert.equal(stripEditorialMarkup('{font:fraunces}Titolo{/font}'), 'Titolo');
});

test('stripEditorialMarkup preserves escaped tag syntax as literal text', () => {
  assert.equal(stripEditorialMarkup('{{font:lora}}'), '{font:lora}');
  assert.equal(stripEditorialMarkup('{{accent}}'), '{accent}');
});

test('stripEditorialMarkup handles valid and escaped tokens together', () => {
  assert.equal(
    stripEditorialMarkup('{accent}Enfasi{/accent} e {{font:lora}}'),
    'Enfasi e {font:lora}'
  );
});

test('stripEditorialMarkup preserves HTML characters and literal braces', () => {
  assert.equal(
    stripEditorialMarkup('A & B < C > D: {{accent}} e {{x}}'),
    'A & B < C > D: {accent} e {x}'
  );
});

test('validateEditorialParagraphs checks each paragraph', () => {
  const errors = validateEditorialParagraphs('{accent}One{/accent}\n\n{bad}Two{/bad}', 'hero_intro');

  assert.ok(errors.length > 0);
});

test('splitEditorialParagraphs splits on blank lines', () => {
  assert.deepEqual(splitEditorialParagraphs('One\n\nTwo'), ['One', 'Two']);
});

test('validateEditorialFields aggregates field errors', () => {
  const errors = validateEditorialFields({
    tagline: '{accent}Ok{/accent}',
    intro_title: '{nope}Bad{/nope}',
    hero_intro: ''
  });

  assert.ok(errors.length >= 1);
  assert.ok(errors.every((error) => error.startsWith('intro_title:')));
});
