import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { stringify } from 'yaml';

const kitRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const childEnv = { ...process.env };
delete childEnv.NODE_TEST_CONTEXT;

const projectEntries = [
  'config',
  'content',
  'scripts',
  'src',
  'static',
  'vendor',
  'jsconfig.json',
  'package.json',
  'package-lock.json',
  'vite.config.js'
];

test('explicit reading blocks flow through loading and malformed authoring is rejected', async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'atelier-structured-reading-'));
  const originalCwd = process.cwd();
  /** @type {import('vite').ViteDevServer | undefined} */
  let server;

  try {
    for (const entry of projectEntries) {
      fs.cpSync(path.join(kitRoot, entry), path.join(root, entry), { recursive: true });
    }

    fs.symlinkSync(
      path.join(kitRoot, 'node_modules'),
      path.join(root, 'node_modules'),
      process.platform === 'win32' ? 'junction' : 'dir'
    );

    fs.mkdirSync(path.join(root, 'content/news'), { recursive: true });

    const readingBlocks = [
      { type: 'colophon', role: 'title', text: 'Neutral title' },
      { type: 'colophon', role: 'author', text: 'Neutral author' },
      { type: 'ornament' },
      { type: 'chapter-title', text: 'Chapter One' },
      { type: 'paragraph', text: 'Chapter content', drop_cap: true }
    ];

    fs.writeFileSync(
      path.join(root, 'content/news/structured-reading-contract.yaml'),
      stringify({
        id: 'structured-reading-contract',
        title: 'Structured reading contract',
        date: '2026-08-05',
        excerpt: 'Neutral publication',
        body: 'Legacy fallback body',
        reading_format: 'book',
        reading_blocks: readingBlocks
      })
    );

    process.chdir(root);

    const { createServer } = await import('vite');
    server = await createServer({
      root,
      cacheDir: path.join(root, '.vite-structured-reading-test-cache'),
      optimizeDeps: { noDiscovery: true, include: [] },
      ssr: { optimizeDeps: { noDiscovery: true, include: [] } },
      server: { middlewareMode: true, hmr: false },
      appType: 'custom',
      logLevel: 'error'
    });

    const showcase = await server.ssrLoadModule('/src/lib/server/showcase.js');
    const post = showcase
      .getNewsPosts()
      .find(
        (/** @type {{ id: string }} */ entry) =>
          entry.id === 'structured-reading-contract'
      );

    assert.ok(post);
    assert.deepEqual(post.reading_blocks, readingBlocks);
    assert.equal(post.body, 'Legacy fallback body');
    assert.equal(post.reading_format, 'book');

    const validValidation = spawnSync(
      process.execPath,
      ['scripts/validate-content.js'],
      {
        cwd: root,
        encoding: 'utf8',
        env: childEnv
      }
    );

    assert.equal(
      validValidation.status,
      0,
      `${validValidation.stdout}\n${validValidation.stderr}`
    );

    fs.writeFileSync(
      path.join(root, 'content/news/structured-reading-contract.yaml'),
      stringify({
        id: 'structured-reading-contract',
        title: 'Structured reading contract',
        date: '2026-08-05',
        body: 'Legacy fallback body',
        reading_format: 'book',
        reading_blocks: [
          null,
          { type: 'client-special', text: 'Unknown block' },
          { type: 'colophon', role: 'future-role', text: 'Unknown role' },
          { type: 'paragraph', text: '   ' },
          { type: 'paragraph', text: 'Readable paragraph', drop_cap: 'yes' },
          { type: 'chapter-title', text: 'Chapter title', drop_cap: true },
          { type: 'paragraph', role: 'title', text: 'Ordinary paragraph' }
        ]
      })
    );

    const invalidValidation = spawnSync(
      process.execPath,
      ['scripts/validate-content.js'],
      {
        cwd: root,
        encoding: 'utf8',
        env: childEnv
      }
    );

    const invalidOutput =
      `${invalidValidation.stdout}\n${invalidValidation.stderr}`;

    assert.equal(invalidValidation.status, 1);
    assert.match(
      invalidOutput,
      /reading_blocks\[0\].*block must be an object/i
    );
    assert.match(
      invalidOutput,
      /reading_blocks\[1\].*type.*client-special/i
    );
    assert.match(
      invalidOutput,
      /reading_blocks\[2\].*role.*future-role/i
    );
    assert.match(
      invalidOutput,
      /reading_blocks\[3\].*text.*non-empty string/i
    );
    assert.match(
      invalidOutput,
      /reading_blocks\[4\].*drop_cap.*boolean/i
    );
    assert.match(
      invalidOutput,
      /reading_blocks\[5\].*drop_cap.*only.*paragraph/i
    );
    assert.match(
      invalidOutput,
      /reading_blocks\[6\].*role.*only.*colophon/i
    );

    fs.writeFileSync(
      path.join(root, 'content/news/structured-reading-contract.yaml'),
      stringify({
        id: 'structured-reading-contract',
        title: 'Structured reading contract',
        date: '2026-08-05',
        body: 'Legacy fallback body',
        reading_format: 'book',
        reading_blocks: []
      })
    );

    const emptyValidation = spawnSync(
      process.execPath,
      ['scripts/validate-content.js'],
      {
        cwd: root,
        encoding: 'utf8',
        env: childEnv
      }
    );

    const emptyOutput =
      `${emptyValidation.stdout}\n${emptyValidation.stderr}`;

    assert.equal(emptyValidation.status, 1);
    assert.match(
      emptyOutput,
      /reading_blocks.*at least one block/i
    );
  } finally {
    await server?.close();
    process.chdir(originalCwd);
    fs.rmSync(root, { recursive: true, force: true });
  }
});
