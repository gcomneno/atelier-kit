import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const routePath = new URL('../src/routes/catalog/+page.svelte', import.meta.url);

test('catalog intro has dedicated compact justified editorial typography', async () => {
  const source = await readFile(routePath, 'utf8');

  assert.match(
    source,
    /<EditorialText\s+tag="p"\s+class="catalog-intro"\s+value=\{paragraph\}\s*\/>/,
  );

  assert.match(
    source,
    /:global\(\.catalog-intro\)\s*\{[\s\S]*?font-size:\s*clamp\(0\.95rem,\s*1\.8vw,\s*1\.05rem\);[\s\S]*?line-height:\s*1\.65;[\s\S]*?text-align:\s*justify;[\s\S]*?hyphens:\s*auto;/,
  );

  assert.doesNotMatch(source, /header\s+:global\(p\)/);
});
