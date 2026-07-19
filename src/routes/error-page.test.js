import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const source = fs.readFileSync(fileURLToPath(new URL('./+error.svelte', import.meta.url)), 'utf8');

test('error content shares a centered responsive column', () => {
  assert.match(source, /<main class="error-page">\s*<div class="error-content">/);
  assert.match(source, /main\s*\{[^}]*place-items:\s*center;/s);
  assert.match(
    source,
    /\.error-content\s*\{[^}]*display:\s*grid;[^}]*justify-items:\s*center;[^}]*width:\s*min\(100%, 36rem\);/s
  );
});
