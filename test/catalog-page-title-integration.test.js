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
function writeCatalog(root, extra = {}) {
  fs.writeFileSync(
    path.join(root, 'config/catalog.yaml'),
    stringify({
      catalog: {
        item_name_singular: 'creation',
        item_name_plural: 'creations',
        sort: 'manual',
        ...extra
      }
    })
  );
}

test('catalog page title is Studio-owned with legacy count fallback', async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'atelier-catalog-title-'));
  const originalCwd = process.cwd();
  const originalStudio = process.env.ATELIER_STUDIO;
  let server;

  try {
    copyProject(root);
    writeCatalog(root);

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
      getCatalogConfig
    } = await server.ssrLoadModule('/src/lib/server/showcase.js');

    const {
      loadCatalogForm,
      writeCatalogForm
    } = await server.ssrLoadModule('/src/lib/server/studio-io.js');

    const legacy = getCatalogConfig();

    assert.equal(legacy.title, '');
    assert.equal(loadCatalogForm('en').title, '');

    writeCatalogForm({
      ...loadCatalogForm('en'),
      title: '  {accent}Novels{/accent}  '
    });

    const saved = parse(
      fs.readFileSync(path.join(root, 'config/catalog.yaml'), 'utf8')
    );

    assert.equal(saved.catalog.title, '{accent}Novels{/accent}');
    assert.equal(loadCatalogForm('en').title, '{accent}Novels{/accent}');

    writeCatalogForm({
      ...loadCatalogForm('en'),
      title: ''
    });

    const cleared = parse(
      fs.readFileSync(path.join(root, 'config/catalog.yaml'), 'utf8')
    );

    assert.equal(Object.hasOwn(cleared.catalog, 'title'), false);
    assert.equal(getCatalogConfig().title, '');
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
