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
 * @typedef {{
 *   id: string,
 *   external_cta: { href: string, label: string } | null
 * }} ShowcaseItem
 */

/**
 * @typedef {{
 *   getItems: () => ShowcaseItem[]
 * }} ShowcaseModule
 */

/**
 * @param {string} id
 * @param {Record<string, unknown>} [overrides]
 */
function fixture(id, overrides = {}) {
  return {
    id,
    title: `${id} title`,
    subtitle: '',
    status: 'draft',
    price_mode: 'hidden',
    image_file: '/images/items/placeholder.svg',
    image_alt: '',
    description: `${id} description`,
    notice: '',
    ...overrides
  };
}

/**
 * @param {{
 *   title?: string,
 *   externalHref?: string,
 *   externalLabel?: string,
 *   includeExternalFields?: boolean
 * }} [options]
 */
function editForm(options = {}) {
  const {
    title = 'Saved item',
    externalHref = '',
    externalLabel = '',
    includeExternalFields = true
  } = options;

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

  if (includeExternalFields) {
    form.set('external_cta_href', externalHref);
    form.set('external_cta_label', externalLabel);
  }

  form.append('gallery_files', '/images/items/placeholder.svg');
  form.append('gallery_alts', '');
  form.append('gallery_roles', 'cover');

  return form;
}

test('external CTA flows through validation, runtime and Studio authoring', async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'atelier-item-external-cta-'));
  const originalCwd = process.cwd();
  const originalStudio = process.env.ATELIER_STUDIO;
  /** @type {import('vite').ViteDevServer | undefined} */
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

    const itemPath = path.join(root, 'content/items/cta-item.yaml');
    const legacyPath = path.join(root, 'content/items/legacy-cta-item.yaml');
    const invalidPath = path.join(root, 'content/items/invalid-cta-item.yaml');

    fs.writeFileSync(
      itemPath,
      stringify(
        fixture('cta-item', {
          preview: {
            href: '/documents/example.txt',
            label: 'Read preview'
          },
          external_cta: {
            href: '  https://example.test/read  ',
            label: '  Read externally  '
          }
        })
      )
    );

    fs.writeFileSync(
      legacyPath,
      stringify(fixture('legacy-cta-item'))
    );

    fs.writeFileSync(
      invalidPath,
      stringify(
        fixture('invalid-cta-item', {
          external_cta: {
            href: '/internal',
            label: ''
          }
        })
      )
    );

    process.chdir(root);

    /** @type {string[]} */
    const diagnostics = [];
    const originalConsoleError = console.error;

    console.error = (...values) => {
      diagnostics.push(values.map(String).join(' '));
    };

    try {
      await import(
        `${pathToFileURL(path.join(root, 'scripts/validate-content.js')).href}?external-cta=${Date.now()}`
      );
    } finally {
      console.error = originalConsoleError;
    }

    assert.equal(process.exitCode, 1);
    process.exitCode = undefined;

    const invalidOutput = diagnostics.join('\n');

    assert.match(
      invalidOutput,
      /invalid-cta-item\.yaml.*external_cta\.href must be an absolute http or https URL/
    );

    assert.match(
      invalidOutput,
      /invalid-cta-item\.yaml.*external_cta\.label must be a non-empty string/
    );

    fs.unlinkSync(invalidPath);

    process.env.ATELIER_STUDIO = '1';

    const { createServer } = await import('vite');

    server = await createServer({
      root,
      cacheDir: path.join(root, '.vite-external-cta-test-cache'),
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

    const showcase = /** @type {ShowcaseModule} */ (
      await server.ssrLoadModule(
        '/src/lib/server/showcase.js'
      )
    );

    let items = showcase.getItems();
    let item = items.find(
      (/** @type {ShowcaseItem} */ entry) => entry.id === 'cta-item'
    );
    const legacy = items.find(
      (/** @type {ShowcaseItem} */ entry) => entry.id === 'legacy-cta-item'
    );

    assert.ok(item);
    assert.ok(legacy);

    assert.deepEqual(item.external_cta, {
      href: 'https://example.test/read',
      label: 'Read externally'
    });

    assert.equal(legacy.external_cta, null);

    const studioPage = await server.ssrLoadModule(
      '/src/routes/studio/items/[id]/+page.server.js'
    );

    const loaded = studioPage.load({
      params: {
        id: 'cta-item'
      }
    });

    assert.equal(
      loaded.itemForm.external_cta_href,
      '  https://example.test/read  '
    );

    assert.equal(
      loaded.itemForm.external_cta_label,
      '  Read externally  '
    );

    const legacyFormResponse = await studioPage.actions.saveItem({
      params: {
        id: 'cta-item'
      },
      request: new Request(
        'http://localhost/studio/items/cta-item',
        {
          method: 'POST',
          body: editForm({
            title: 'Legacy form save',
            includeExternalFields: false
          })
        }
      )
    });

    assert.notEqual(
      legacyFormResponse?.status,
      400,
      JSON.stringify(legacyFormResponse)
    );

    let saved = parse(fs.readFileSync(itemPath, 'utf8'));

    assert.deepEqual(saved.external_cta, {
      href: '  https://example.test/read  ',
      label: '  Read externally  '
    });

    const updateResponse = await studioPage.actions.saveItem({
      params: {
        id: 'cta-item'
      },
      request: new Request(
        'http://localhost/studio/items/cta-item',
        {
          method: 'POST',
          body: editForm({
            title: 'Updated CTA',
            externalHref: '  https://shop.example.test/item  ',
            externalLabel: '  Buy externally  '
          })
        }
      )
    });

    assert.notEqual(
      updateResponse?.status,
      400,
      JSON.stringify(updateResponse)
    );

    saved = parse(fs.readFileSync(itemPath, 'utf8'));

    assert.deepEqual(saved.external_cta, {
      href: 'https://shop.example.test/item',
      label: 'Buy externally'
    });

    items = showcase.getItems();
    item = items.find(
      (/** @type {ShowcaseItem} */ entry) => entry.id === 'cta-item'
    );

    assert.deepEqual(item?.external_cta, {
      href: 'https://shop.example.test/item',
      label: 'Buy externally'
    });

    const beforeRejectedSave = fs.readFileSync(itemPath, 'utf8');

    const rejected = await studioPage.actions.saveItem({
      params: {
        id: 'cta-item'
      },
      request: new Request(
        'http://localhost/studio/items/cta-item',
        {
          method: 'POST',
          body: editForm({
            title: 'Must not be written',
            externalHref: '/internal',
            externalLabel: 'Invalid destination'
          })
        }
      )
    });

    assert.equal(rejected?.status, 400, JSON.stringify(rejected));

    assert.equal(
      fs.readFileSync(itemPath, 'utf8'),
      beforeRejectedSave
    );

    assert.equal(
      rejected?.data?.itemForm?.external_cta_href,
      '/internal'
    );

    assert.equal(
      rejected?.data?.itemForm?.external_cta_label,
      'Invalid destination'
    );

    const removeResponse = await studioPage.actions.saveItem({
      params: {
        id: 'cta-item'
      },
      request: new Request(
        'http://localhost/studio/items/cta-item',
        {
          method: 'POST',
          body: editForm({
            title: 'CTA removed',
            externalHref: '',
            externalLabel: ''
          })
        }
      )
    });

    assert.notEqual(
      removeResponse?.status,
      400,
      JSON.stringify(removeResponse)
    );

    saved = parse(fs.readFileSync(itemPath, 'utf8'));

    assert.equal(
      Object.hasOwn(saved, 'external_cta'),
      false
    );

    items = showcase.getItems();
    item = items.find(
      (/** @type {ShowcaseItem} */ entry) => entry.id === 'cta-item'
    );

    assert.equal(item?.external_cta, null);
  } finally {
    if (server) {
      await server.close();
    }

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

test('visitor item page presents external CTA before preview', () => {
  const source = fs.readFileSync(
    path.join(
      kitRoot,
      'src/routes/items/[id]/+page.svelte'
    ),
    'utf8'
  );

  const externalIndex = source.indexOf('{#if item.external_cta}');
  const previewIndex = source.indexOf(
    '{#if item.preview}',
    externalIndex
  );

  assert.notEqual(externalIndex, -1);
  assert.notEqual(previewIndex, -1);
  assert.ok(externalIndex < previewIndex);

  assert.match(
    source,
    /class="item-action primary-action"[\s\S]*href=\{item\.external_cta\.href\}/
  );

  assert.match(
    source,
    /class:primary-action=\{!item\.external_cta\}/
  );

  assert.match(
    source,
    /class:secondary-action=\{Boolean\(item\.external_cta\)\}/
  );
});
