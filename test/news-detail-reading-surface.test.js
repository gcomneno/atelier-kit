import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';

const source = readFileSync(
  'src/routes/news/[slug]/+page.svelte',
  'utf8'
);

test('standard News body uses the semantic Visitor reading surface', () => {
  assert.match(
    source,
    /\.body\s*\{[\s\S]*?background:\s*var\(--site-card-color,\s*#fffaf2\);/
  );

  assert.match(
    source,
    /\.body\s*\{[\s\S]*?border:\s*1px solid var\(--site-border-color,\s*#e4d8c7\);/
  );

  assert.match(
    source,
    /\.body\s*\{[\s\S]*?padding:\s*clamp\(1\.25rem,\s*3vw,\s*2rem\);/
  );

  assert.match(
    source,
    /\.body\s*\{[\s\S]*?border-radius:\s*1rem;/
  );
});

test('reading surface remains on the standard News path only', () => {
  assert.match(
    source,
    /\{#if isBookLayout\}[\s\S]*?<BookReading[\s\S]*?\{:else\}[\s\S]*?<div class="body">/
  );

  const bookReader = readFileSync(
    'src/lib/components/BookReading.svelte',
    'utf8'
  );

  assert.doesNotMatch(
    bookReader,
    /news-detail-reading-surface|class="body"/
  );
});

test('standard News body keeps semantic text color and editorial typography', () => {
  assert.match(
    source,
    /\.body :global\(p\)\s*\{[\s\S]*?color:\s*var\(--site-text-color,/
  );

  assert.match(
    source,
    /\.body :global\(p\)\s*\{[\s\S]*?line-height:\s*1\.75;/
  );
});
