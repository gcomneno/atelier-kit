import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { parse, stringify } from 'yaml';

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

/**
 * @param {string} title
 */
function editForm(title) {
  const form = new FormData();

  for (const [name, value] of Object.entries({
    title,
    subtitle: '',
    status: 'draft',
    price_mode: 'hidden',
    description: `${title} description`,
    notice: ''
  })) {
    form.set(name, value);
  }

  form.append('gallery_files', '/images/items/placeholder.svg');
  form.append('gallery_alts', '');
  form.append('gallery_roles', 'cover');

  return form;
}

/**
 * @param {string} id
 * @param {Record<string, unknown>} [overrides]
 */
function fixture(id, overrides = {}) {
  return {
    id,
    title: `${id} before`,
    subtitle: '',
    status: 'draft',
    price_mode: 'hidden',
    image_file: '/images/items/placeholder.svg',
    image_alt: '',
    description: `${id} before description`,
    preview: {
      href: '/documents/example.txt',
      label: 'Open source document'
    },
    external_cta: {
      href: 'https://example.test/item',
      label: 'Open external page'
    },
    material: 'Paper',
    dimensions: 'A4',
    availability: 'Archive',
    ...overrides
  };
}

test('Studio item edits preserve non-form fields and valid manual ordering', async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'atelier-item-save-preservation-'));
  const originalCwd = process.cwd();
  const originalStudio = process.env.ATELIER_STUDIO;
  let server;

  try {
    for (const entry of projectEntries) {
      fs.cpSync(path.join(kitRoot, entry), path.join(root, entry), {
        recursive: true
      });
    }

    fs.symlinkSync(
      path.join(kitRoot, 'node_modules'),
      path.join(root, 'node_modules'),
      'dir'
    );

    const orderedPath = path.join(root, 'content/items/preserved-order.yaml');
    const unorderedPath = path.join(root, 'content/items/without-order.yaml');

    fs.writeFileSync(
      orderedPath,
      stringify(fixture('preserved-order', { sort_order: 70 }))
    );
    fs.writeFileSync(
      unorderedPath,
      stringify(fixture('without-order'))
    );

    process.chdir(root);
    process.env.ATELIER_STUDIO = '1';

    const { createServer } = await import('vite');
    server = await createServer({
      root,
      cacheDir: path.join(root, '.vite-item-save-preservation-cache'),
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

    const studioPage = await server.ssrLoadModule(
      '/src/routes/studio/items/[id]/+page.server.js'
    );

    for (const [id, title] of [
      ['preserved-order', 'Ordered after'],
      ['without-order', 'Unordered after']
    ]) {
      const response = await studioPage.actions.saveItem({
        params: { id },
        request: new Request(`http://localhost/studio/items/${id}`, {
          method: 'POST',
          body: editForm(title)
        })
      });

      assert.notEqual(response?.status, 400, JSON.stringify(response));
    }

    const ordered = parse(fs.readFileSync(orderedPath, 'utf8'));
    const unordered = parse(fs.readFileSync(unorderedPath, 'utf8'));

    assert.equal(ordered.title, 'Ordered after');
    assert.equal(ordered.sort_order, 70);
    assert.deepEqual(ordered.preview, {
      href: '/documents/example.txt',
      label: 'Open source document'
    });
    assert.deepEqual(ordered.external_cta, {
      href: 'https://example.test/item',
      label: 'Open external page'
    });
    assert.equal(ordered.material, 'Paper');
    assert.equal(ordered.dimensions, 'A4');
    assert.equal(ordered.availability, 'Archive');

    assert.equal(unordered.title, 'Unordered after');
    assert.equal(Object.hasOwn(unordered, 'sort_order'), false);
    assert.deepEqual(unordered.preview, {
      href: '/documents/example.txt',
      label: 'Open source document'
    });
    assert.deepEqual(unordered.external_cta, {
      href: 'https://example.test/item',
      label: 'Open external page'
    });
  } finally {
    await server?.close();
    process.chdir(originalCwd);

    if (originalStudio === undefined) {
      delete process.env.ATELIER_STUDIO;
    } else {
      process.env.ATELIER_STUDIO = originalStudio;
    }

    fs.rmSync(root, {
      recursive: true,
      force: true
    });
  }
});
