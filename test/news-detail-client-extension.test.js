import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';

const serverRoute = readFileSync(
  'src/routes/news/[slug]/+page.server.js',
  'utf8'
);

const pageRoute = readFileSync(
  'src/routes/news/[slug]/+page.svelte',
  'utf8'
);

const serverAdapter = readFileSync(
  'src/lib/client-extension/news-detail.server.js',
  'utf8'
);

const afterBodyAdapter = readFileSync(
  'src/lib/client-extension/NewsDetailAfterBody.svelte',
  'utf8'
);

test('managed News server route delegates post resolution through the bounded adapter', () => {
  assert.match(
    serverRoute,
    /import \{ resolveNewsDetailPost \} from '\$lib\/client-extension\/news-detail\.server\.js';/
  );

  assert.match(
    serverRoute,
    /const post = resolveNewsDetailPost\(params\.slug\);/
  );
});

test('default News server adapter preserves canonical Atelier-Kit resolution', () => {
  assert.match(
    serverAdapter,
    /import \{ getNewsPost \} from '\$lib\/server\/showcase\.js';/
  );

  assert.match(
    serverAdapter,
    /return getNewsPost\(id\);/
  );
});

test('managed standard News route renders post-body adapter after the reading body', () => {
  const bodyIndex = pageRoute.indexOf('<div class="body">');
  const extensionIndex = pageRoute.indexOf(
    '<NewsDetailAfterBody post={data.post} />'
  );
  const articleCloseIndex = pageRoute.indexOf(
    '</article>',
    extensionIndex
  );

  assert.notEqual(bodyIndex, -1);
  assert.notEqual(extensionIndex, -1);
  assert.notEqual(articleCloseIndex, -1);

  assert.ok(bodyIndex < extensionIndex);
  assert.ok(extensionIndex < articleCloseIndex);
});

test('post-body adapter remains outside the BookReading path', () => {
  const bookBranchIndex = pageRoute.indexOf('{#if isBookLayout}');
  const elseIndex = pageRoute.indexOf('{:else}', bookBranchIndex);
  const extensionIndex = pageRoute.indexOf(
    '<NewsDetailAfterBody post={data.post} />'
  );

  assert.notEqual(bookBranchIndex, -1);
  assert.notEqual(elseIndex, -1);
  assert.notEqual(extensionIndex, -1);

  assert.ok(extensionIndex > elseIndex);
});

test('default post-body adapter has no visible rendering contract', () => {
  assert.match(
    afterBodyAdapter,
    /let \{ post: _post \} = \$props\(\);/
  );

  assert.doesNotMatch(
    afterBodyAdapter,
    /<(div|section|aside|article|p|span|a|iframe|img)\b/
  );
});

test('existing theme-safe News reading surface remains present', () => {
  assert.match(
    pageRoute,
    /\.body\s*\{[\s\S]*?background:\s*var\(--site-card-color,\s*#fffaf2\);/
  );

  assert.match(
    pageRoute,
    /\.body\s*\{[\s\S]*?border:\s*1px solid var\(--site-border-color,\s*#e4d8c7\);/
  );
});
