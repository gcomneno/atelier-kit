import assert from 'node:assert/strict';
import test from 'node:test';

import {
  parseEditorialMarkup,
  splitEditorialParagraphs,
  stripEditorialMarkup,
  validateEditorialFields,
  validateEditorialParagraphs
} from './editorial-markup.js';

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
