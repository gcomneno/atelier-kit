import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';

import {
  EDITORIAL_MARK_CLASSES,
  EDITORIAL_MARK_TAGS,
  EDITORIAL_MARK_TOKENS,
  parseEditorialMarkup,
  stripEditorialMarkup
} from '../src/lib/editorial-markup.js';
import {
  markedTextToPlainText,
  transformMarkedTextSelection
} from '../src/lib/marked-text.js';
import en from '../src/lib/i18n/messages/en.js';
import it from '../src/lib/i18n/messages/it.js';

test('strong and em are first-class fixed Atelier Mark tokens', () => {
  assert.ok(EDITORIAL_MARK_TAGS.includes('strong'));
  assert.ok(EDITORIAL_MARK_TAGS.includes('em'));

  assert.deepEqual(
    EDITORIAL_MARK_TOKENS
      .filter(({ id }) => id === 'strong' || id === 'em')
      .map(({ id, className, kind }) => ({ id, className, kind })),
    [
      { id: 'strong', className: 'mark-strong', kind: 'semantic-emphasis' },
      { id: 'em', className: 'mark-em', kind: 'semantic-emphasis' }
    ]
  );

  assert.equal(EDITORIAL_MARK_CLASSES.strong, 'mark-strong');
  assert.equal(EDITORIAL_MARK_CLASSES.em, 'mark-em');
});

test('strong and em render only fixed controlled mark spans', () => {
  const strong = parseEditorialMarkup('{strong}Strong{/strong}');
  const em = parseEditorialMarkup('{em}Italic{/em}');

  assert.equal(strong.ok, true);
  assert.equal(em.ok, true);

  if (strong.ok) {
    assert.equal(strong.html, '<span class="mark-strong">Strong</span>');
  }
  if (em.ok) {
    assert.equal(em.html, '<span class="mark-em">Italic</span>');
  }
});

test('strong and em preserve canonical plain-text projection', () => {
  const value = '{strong}Uno{/strong} e {em}due{/em}';

  assert.equal(stripEditorialMarkup(value), 'Uno e due');
  assert.equal(markedTextToPlainText(value), 'Uno e due');
});

test('strong and em reject arbitrary values, nesting and malformed markup', () => {
  for (const value of [
    '{strong:x}No{/strong}',
    '{em:x}No{/em}',
    '{strong}{accent}No{/accent}{/strong}',
    '{accent}{strong}No{/strong}{/accent}',
    '{em}{font:lora}No{/font}{/em}',
    '{font:lora}{em}No{/em}{/font}',
    '{strong}No',
    '{em}No{/strong}'
  ]) {
    assert.equal(parseEditorialMarkup(value).ok, false, value);
  }
});

test('selection transformation applies replaces and removes semantic emphasis', () => {
  const strong = transformMarkedTextSelection('Testo', 0, 5, 'strong');
  assert.equal(strong.value, '{strong}Testo{/strong}');
  assert.equal(strong.status, 'applied');

  const em = transformMarkedTextSelection('Testo', 0, 5, 'em');
  assert.equal(em.value, '{em}Testo{/em}');
  assert.equal(em.status, 'applied');

  const toStrong = transformMarkedTextSelection(
    '{accent}Testo{/accent}',
    8,
    13,
    'strong'
  );
  assert.equal(toStrong.value, '{strong}Testo{/strong}');
  assert.equal(toStrong.status, 'replaced');

  const toAccent = transformMarkedTextSelection(
    '{em}Testo{/em}',
    4,
    9,
    'accent'
  );
  assert.equal(toAccent.value, '{accent}Testo{/accent}');
  assert.equal(toAccent.status, 'replaced');

  const removed = transformMarkedTextSelection(
    '{strong}Testo{/strong}',
    0,
    '{strong}Testo{/strong}'.length,
    'remove'
  );
  assert.equal(removed.value, 'Testo');
  assert.equal(removed.status, 'removed');
});

test('shared renderer owns the semantic emphasis CSS contract', () => {
  const source = readFileSync(
    'src/lib/components/EditorialText.svelte',
    'utf8'
  );

  assert.match(
    source,
    /:global\(\.mark-strong\)\s*\{[\s\S]*?font-weight:\s*700;[\s\S]*?\}/
  );
  assert.match(
    source,
    /:global\(\.mark-em\)\s*\{[\s\S]*?font-style:\s*italic;[\s\S]*?\}/
  );
});

test('Studio toolbar remains registry-driven and labels both semantic tokens', () => {
  const source = readFileSync(
    'src/lib/components/MarkedTextField.svelte',
    'utf8'
  );

  assert.match(source, /\{#each EDITORIAL_MARK_TAGS as tag \(tag\)\}/);
  assert.doesNotMatch(
    source,
    /(?:const|let)\s+(?:toolbar|tokens|tags)\s*=\s*\[[^\]]*(?:strong|em)/
  );

  assert.equal(en.studio.editorial.tags.strong, 'Strong');
  assert.equal(en.studio.editorial.tags.em, 'Emphasis');
  assert.equal(it.studio.editorial.tags.strong, 'Grassetto');
  assert.equal(it.studio.editorial.tags.em, 'Corsivo');

  const helpSource = readFileSync(
    'src/routes/studio/help/+page.svelte',
    'utf8'
  );

  assert.match(
    helpSource,
    /const atelierMarkSyntax = \[1, 2, 3, 4, 5, 6, 7, 8\];/
  );
});
