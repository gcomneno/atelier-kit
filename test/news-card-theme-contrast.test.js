import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';

const source = readFileSync(
  new URL('../src/routes/news/+page.svelte', import.meta.url),
  'utf8'
);

test('News cards bind background foreground and border to semantic site tokens', () => {
  assert.match(
    source,
    /\.post-link\s*\{[\s\S]*?border:\s*1px solid var\(--site-border-color,[^)]+\);/
  );

  assert.match(
    source,
    /\.post-link\s*\{[\s\S]*?background:\s*var\(--site-card-color,[^)]+\);/
  );

  assert.match(
    source,
    /\.post-link\s*\{[\s\S]*?color:\s*var\(--site-text-color,[^)]+\);/
  );
});

test('News secondary copy uses the semantic muted text token', () => {
  assert.match(
    source,
    /time\s*\{[\s\S]*?color:\s*var\(--site-muted-text-color,[^)]+\);/
  );

  assert.match(
    source,
    /\.post-copy p\s*\{[\s\S]*?color:\s*var\(--site-muted-text-color,[^)]+\);/
  );
});

test('News cards no longer force a light background while inheriting foreground', () => {
  assert.doesNotMatch(
    source,
    /\.post-link\s*\{[\s\S]*?background:\s*rgb\(255 250 242/
  );

  assert.doesNotMatch(
    source,
    /\.post-link\s*\{[\s\S]*?color:\s*inherit;/
  );
});
