import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { parse, stringify } from 'yaml';
import { createServer } from 'vite';

const kitRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
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

/** @param {string} root */
function copyProject(root) {
  for (const entry of projectEntries) {
    fs.cpSync(path.join(kitRoot, entry), path.join(root, entry), { recursive: true });
  }

  fs.symlinkSync(path.join(kitRoot, 'node_modules'), path.join(root, 'node_modules'), 'dir');
}

/** @param {string} root */
function writeCollectionsFixture(root) {
  fs.mkdirSync(path.join(root, 'config'), { recursive: true });
  fs.writeFileSync(
    path.join(root, 'config/collections.yaml'),
    stringify({
      collections: {
        home_eyebrow: 'Home series',
        page_eyebrow: 'Page archive',
        title: 'Series archive',
        intro: 'Grouped by theme or series.',
        future_field: 'Keep me'
      }
    })
  );
}

test('collections editorial load/save preserves future fields and resolves fallbacks', async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'atelier-collections-editorial-'));
  const originalCwd = process.cwd();
  const originalStudio = process.env.ATELIER_STUDIO;
  let server;

  try {
    copyProject(root);
    writeCollectionsFixture(root);
    process.chdir(root);
    process.env.ATELIER_STUDIO = '1';

    server = await createServer({
      root,
      cacheDir: path.join(root, '.vite-test-cache'),
      optimizeDeps: {
        noDiscovery: true,
        include: []
      },
      ssr: {
        optimizeDeps: {
          noDiscovery: true,
          include: []
        }
      },
      server: {
        middlewareMode: true,
        hmr: false
      },
      appType: 'custom',
      logLevel: 'error'
    });

    const {
      loadCollectionsEditorialForm,
      writeCollectionsEditorialForm
    } = await server.ssrLoadModule('/src/lib/server/studio-io.js');
    const {
      normalizeCollectionsEditorialConfig,
      resolveCollectionsPageEyebrow,
      resolveCollectionsPageIntro,
      resolveCollectionsPageTitle
    } = await server.ssrLoadModule('/src/lib/collections-editorial.js');

    assert.deepEqual(loadCollectionsEditorialForm('en'), {
      home_eyebrow: 'Home series',
      page_eyebrow: 'Page archive',
      title: 'Series archive',
      intro: 'Grouped by theme or series.'
    });

    writeCollectionsEditorialForm(
      {
        home_eyebrow: '  New home  ',
        page_eyebrow: '',
        title: '  New title  ',
        intro: '  New intro  '
      },
      'en'
    );

    const saved = parse(fs.readFileSync(path.join(root, 'config/collections.yaml'), 'utf8'));

    assert.deepEqual(saved.collections, {
      home_eyebrow: 'New home',
      title: 'New title',
      intro: 'New intro',
      future_field: 'Keep me'
    });

    const empty = normalizeCollectionsEditorialConfig(null);
    assert.equal(resolveCollectionsPageTitle(empty, 'en'), 'Collections');
    assert.equal(resolveCollectionsPageTitle(empty, 'it'), 'Collezioni');
    assert.equal(
      resolveCollectionsPageIntro(empty, 'items', 'en'),
      'Groups of items selected by theme or series.'
    );
    assert.equal(
      resolveCollectionsPageIntro(empty, 'oggetti', 'it'),
      'Gruppi di oggetti selezionati per tema o serie.'
    );
    assert.equal(
      resolveCollectionsPageEyebrow(empty, 'Structural label', 'en'),
      'Structural label'
    );
  } finally {
    await server?.close();
    process.chdir(originalCwd);

    if (originalStudio === undefined) {
      delete process.env.ATELIER_STUDIO;
    } else {
      process.env.ATELIER_STUDIO = originalStudio;
    }

    fs.rmSync(root, { recursive: true, force: true });
  }
});
