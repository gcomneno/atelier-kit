import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const header = fs.readFileSync(
  path.join(root, 'src/lib/components/SiteHeader.svelte'),
  'utf8'
);
const search = fs.readFileSync(
  path.join(root, 'src/lib/components/SiteSearch.svelte'),
  'utf8'
);

test('mobile visitor header keeps search intrinsic-height and full-width', () => {
  assert.match(
    header,
    /@media\s*\(max-width:\s*720px\)\s*{[\s\S]*?\.header-actions\s*{[^}]*flex-direction:\s*column;/s
  );

  assert.match(
    search,
    /\.site-search\s*{[^}]*flex:\s*1\s+1\s+12rem;[^}]*max-width:\s*18rem;/s
  );

  assert.match(
    search,
    /@media\s*\(max-width:\s*720px\)\s*{[\s\S]*?\.site-search\s*{[^}]*flex:\s*0\s+0\s+auto;[^}]*max-width:\s*none;[^}]*width:\s*100%;/s
  );

  assert.match(
    search,
    /\.site-search-panel\s*{[^}]*position:\s*absolute;/s
  );
});
