import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const source = fs.readFileSync(
  fileURLToPath(new URL('./[id]/+page.svelte', import.meta.url)),
  'utf8'
);

test('collapsed synopsis toggle stays in normal layout flow', () => {
  assert.match(
    source,
    /\.description-actions\s*\{[^}]*display:\s*flex;[^}]*justify-content:\s*flex-end;/s
  );

  assert.doesNotMatch(
    source,
    /\.description-shell:not\(\.expanded\)\s+\.description-actions\s*\{[^}]*position:\s*absolute;/s
  );

  assert.match(
    source,
    /\.description-shell\.truncated::after\s*\{[^}]*position:\s*absolute;[^}]*inset:\s*auto 0 1\.85rem;/s
  );
});
