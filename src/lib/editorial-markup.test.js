import assert from 'node:assert/strict';
import test from 'node:test';

import {
  editorialFontPresets,
  parseTaglineDisplay,
  parseEditorialMarkup,
  scanEditorialMarkup,
  splitEditorialParagraphs,
  stripEditorialMarkup,
  validateEditorialFields,
  validateEditorialParagraphs,
  validatePlainTextField
} from './editorial-markup.js';
import { fontStylesheetHrefs } from './site-typography.js';

test('plain text passes through escaped', () => {
  const result = parseEditorialMarkup('Narrativa breve & seriale');

  assert.equal(result.ok, true);
  if (result.ok) {
    assert.equal(result.html, 'Narrativa breve &amp; seriale');
  }
});

test('legacy tagline display configuration is tolerated and normalized to no display effect', () => {
  assert.equal(parseTaglineDisplay({ wrap: 'epigraph', quote_color: 'accent' }), null);
  assert.equal(parseTaglineDisplay({ wrap: 'unknown', quote_color: '#fff' }), null);
  assert.equal(parseTaglineDisplay(null), null);
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

test('canonical color and size tokens render only fixed safe classes', () => {
  const expected = {
    accent: 'mark-accent', intro: 'mark-intro', heading: 'mark-heading', muted: 'mark-muted',
    white: 'mark-white', black: 'mark-black', larger: 'mark-larger', smaller: 'mark-smaller'
  };
  for (const [tag, className] of Object.entries(expected)) {
    const result = parseEditorialMarkup(`{${tag}}Testo{/${tag}}`);
    assert.equal(result.ok, true);
    if (result.ok) assert.equal(result.html, `<span class="${className}">Testo</span>`);
  }
});

test('size and explicit color tokens reject values, nesting and broken closures', () => {
  for (const value of [
    '{larger:42}No{/larger}', '{white:#fff}No{/white}',
    '{larger}{smaller}No{/smaller}{/larger}', '{black}No{/white}', '{smaller}No'
  ]) assert.equal(parseEditorialMarkup(value).ok, false);
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
    assert.equal(result.plainText, 'Hi');
  }
});

test('invalid markup fallback preserves editorial text without exposing raw tag syntax', () => {
  const result = parseEditorialMarkup('{accent}Testo incompleto');
  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.equal(result.plainText, 'Testo incompleto');
    assert.doesNotMatch(result.plainText, /[{}]/);
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

test('stripEditorialMarkup removes every controlled token without losing text', () => {
  assert.equal(
    stripEditorialMarkup('{white}Bianco{/white} {black}nero{/black} {larger}più{/larger} {smaller}meno{/smaller}'),
    'Bianco nero più meno'
  );
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

test('scanner exposes canonical token ranges, escapes and both plain projections', () => {
  const value = '{font:lora}Usa {{graffe}}{/font}';
  const scan = scanEditorialMarkup(value);
  assert.equal(scan.ok, true);
  assert.deepEqual(scan.tokens, [{
    type: 'token', command: 'font:lora', start: 0, end: value.length,
    contentStart: 11, contentEnd: 25, openEnd: 11, closeStart: 25
  }]);
  assert.ok(scan.segments.some((part) => part.type === 'escape' && part.source === '{{'));
  assert.ok(scan.segments.some((part) => part.type === 'escape' && part.source === '}}'));
  assert.equal(scan.plainText, 'Usa {graffe}');
  assert.equal(scan.sourceText, 'Usa {{graffe}}');
});

test('invalid markup always has a safe plain projection without raw control tags', () => {
  const cases = new Map([
    ['{{nota}} {accent}rotto', '{nota} rotto'],
    ['{accent}rotto', 'rotto'],
    ['{unknown}Testo{/unknown}', 'Testo'],
    ['{font:non-esiste}Testo{/font}', 'Testo'],
    ['{larger:42}Testo{/larger}', 'Testo']
  ]);
  for (const [value, expected] of cases) {
    const parsed = parseEditorialMarkup(value);
    assert.equal(parsed.ok, false, value);
    assert.equal(parsed.plainText, expected, value);
    assert.equal(stripEditorialMarkup(value), expected, value);
    assert.doesNotMatch(parsed.plainText, /\{\/?(?:accent|unknown|font|larger)(?::[^}]*)?\}/, value);
  }
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

test('plain-text validation rejects Atelier Mark but permits unrelated literal braces', () => {
  assert.deepEqual(validatePlainTextField('Portrait {front view}', 'image_alt'), []);
  assert.deepEqual(validatePlainTextField('Work from {2026}', 'image_alt'), []);
  assert.match(
    validatePlainTextField('{muted}Portrait{/muted}', 'image_alt').join(' '),
    /image_alt: Atelier Mark is not allowed/
  );
});
