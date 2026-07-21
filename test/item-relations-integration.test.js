import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { pathToFileURL } from 'node:url';
import { parse, stringify } from 'yaml';

/** @typedef {{ id: string, title: string, image_file: string, image_alt: string, description: string }} ItemFixture */
/** @typedef {{ type: string, target: string, label?: string }} ItemRelation */
/** @typedef {{ id: string, relations: ItemRelation[] }} ShowcaseItem */
/** @typedef {{ getItems: () => ShowcaseItem[] }} ShowcaseModule */
/** @typedef {{ status?: number }} StudioActionResponse */
/** @typedef {{ actions: { saveItem: (event: { params: { id: string }, request: Request }) => Promise<StudioActionResponse> } }} StudioPageModule */

const kitRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const projectEntries = [
  'config', 'content', 'scripts', 'src', 'static', 'vendor',
  'jsconfig.json', 'package.json', 'package-lock.json', 'vite.config.js'
];

test('relations flow through loading, validation and Studio preservation', async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'atelier-item-relations-'));
  const originalCwd = process.cwd();
  const originalStudio = process.env.ATELIER_STUDIO;
  /** @type {import('vite').ViteDevServer | undefined} */
  let server;

  try {
    for (const entry of projectEntries) {
      fs.cpSync(path.join(kitRoot, entry), path.join(root, entry), { recursive: true });
    }
    fs.symlinkSync(path.join(kitRoot, 'node_modules'), path.join(root, 'node_modules'), 'dir');

    /**
     * @param {string} id
     * @param {string} title
     * @returns {ItemFixture}
     */
    const fixture = (id, title) => ({
      id, title, image_file: '/images/items/placeholder.svg', image_alt: '',
      description: `${title} description`
    });
    fs.writeFileSync(path.join(root, 'content/items/legacy-item.yaml'), stringify(fixture('legacy-item', 'Legacy')));
    const malformedIdFixtures = [
      { filename: 'missing-id', id: undefined },
      { filename: 'non-string-id', id: 42 },
      { filename: 'blank-id', id: '   ' }
    ];
    for (const { filename, id } of malformedIdFixtures) {
      /** @type {Record<string, unknown>} */
      const malformed = {
        ...fixture(filename, filename),
        relations: [{ type: 'same-as', target: filename }]
      };
      if (id === undefined) delete malformed.id;
      else malformed.id = id;
      fs.writeFileSync(path.join(root, `content/items/${filename}.yaml`), stringify(malformed));
    }
    fs.writeFileSync(path.join(root, 'content/items/related-item.yaml'), stringify({
      ...fixture('related-item', 'Related'),
      relations: [
        { type: '  inspired-by ', target: ' missing-work ', label: ' Inspiration ' },
        { type: 'part-of', target: 'related-item' },
        { type: 'part-of', target: 'related-item' },
        ...malformedIdFixtures.map(({ filename }) => ({ type: 'related-to', target: filename }))
      ]
    }));
    const invalidPath = path.join(root, 'content/items/invalid-item.yaml');
    fs.writeFileSync(invalidPath, stringify({
      ...fixture('invalid-item', 'Invalid'),
      relations: [null, [], 'bad', 4, {}, { type: 2, target: [] },
        { type: ' ', target: ' ' }, { type: 'ok', target: 'ok', label: false }]
    }));
    process.chdir(root);
    /** @type {string[]} */
    const diagnostics = [];
    const originalConsoleError = console.error;
    console.error = (.../** @type {unknown[]} */ values) => diagnostics.push(values.map(String).join(' '));
    try {
      await import(`${pathToFileURL(path.join(root, 'scripts/validate-content.js')).href}?relations=${Date.now()}`);
    } finally {
      console.error = originalConsoleError;
    }
    const invalidOutput = diagnostics.join('\n');
    assert.equal(process.exitCode, 1);
    process.exitCode = undefined;
    assert.match(invalidOutput, /related-item\.yaml:relations\[0\].*targets missing item "missing-work"/);
    assert.match(invalidOutput, /related-item\.yaml:relations\[1\].*cannot target itself/);
    assert.match(invalidOutput, /related-item\.yaml:relations\[2\].*cannot target itself/);
    assert.match(invalidOutput, /related-item\.yaml:relations\[2\].*duplicates target "related-item" from relations\[1\]/);
    malformedIdFixtures.forEach(({ filename }, offset) => {
      assert.match(invalidOutput, new RegExp(`related-item\\.yaml:relations\\[${offset + 3}\\].*targets missing item "${filename}"`));
      assert.match(invalidOutput, new RegExp(`${filename}\\.yaml:relations\\[0\\].*targets missing item "${filename}"`));
      assert.doesNotMatch(invalidOutput, new RegExp(`${filename}\\.yaml:relations\\[0\\].*cannot target itself`));
    });
    for (const index of [0, 1, 2, 3, 4, 5, 6, 7]) {
      assert.match(invalidOutput, new RegExp(`content/items/invalid-item\\.yaml:relations\\[${index}\\]`));
    }
    assert.match(invalidOutput, /relation must be an object/);
    assert.match(invalidOutput, /type must be a non-empty string/);
    assert.match(invalidOutput, /target must be a non-empty string/);
    assert.match(invalidOutput, /label must be a string/);

    /** @type {string[]} */
    const doctorOutput = [];
    const originalConsoleLog = console.log;
    console.log = (.../** @type {unknown[]} */ values) => doctorOutput.push(values.map(String).join(' '));
    try {
      await import(`${pathToFileURL(path.join(root, 'scripts/content-doctor.js')).href}?relations=${Date.now()}`);
    } finally {
      console.log = originalConsoleLog;
    }
    const renderedDoctorOutput = doctorOutput.join('\n');
    assert.match(renderedDoctorOutput, /Item relationship target/);
    assert.match(renderedDoctorOutput, /Duplicate item relationship/);
    malformedIdFixtures.forEach(({ filename }) => {
      assert.match(renderedDoctorOutput, new RegExp(`Item relationship target[\\s\\S]*?${filename}\\.yaml:relations\\[0\\]`));
      assert.doesNotMatch(renderedDoctorOutput, new RegExp(`Item relationship points to itself\\n[^\\n]*${filename}\\.yaml:relations\\[0\\]`));
      fs.unlinkSync(path.join(root, `content/items/${filename}.yaml`));
    });
    fs.unlinkSync(invalidPath);

    process.env.ATELIER_STUDIO = '1';
    const { createServer } = await import('vite');
    server = await createServer({
      root, cacheDir: path.join(root, '.vite-relations-test-cache'),
      optimizeDeps: { noDiscovery: true, include: [] },
      ssr: { optimizeDeps: { noDiscovery: true, include: [] } },
      server: { middlewareMode: true, hmr: false }, appType: 'custom', logLevel: 'error'
    });
    const showcase = /** @type {ShowcaseModule} */ (
      await server.ssrLoadModule('/src/lib/server/showcase.js')
    );
    const items = showcase.getItems();
    const legacyItem = items.find((/** @type {ShowcaseItem} */ item) => item.id === 'legacy-item');
    const relatedItem = items.find((/** @type {ShowcaseItem} */ item) => item.id === 'related-item');
    assert.ok(legacyItem);
    assert.ok(relatedItem);
    assert.deepEqual(legacyItem.relations, []);
    assert.deepEqual(relatedItem.relations, [
      { type: 'inspired-by', target: 'missing-work', label: 'Inspiration' },
      { type: 'part-of', target: 'related-item' },
      { type: 'part-of', target: 'related-item' },
      { type: 'related-to', target: 'missing-id' },
      { type: 'related-to', target: 'non-string-id' },
      { type: 'related-to', target: 'blank-id' }
    ]);

    fs.writeFileSync(invalidPath, stringify({ ...fixture('invalid-item', 'Invalid'), relations: null }));
    assert.throws(() => showcase.getItems(), /content\/items\/invalid-item\.yaml: relations must be an array/);
    fs.unlinkSync(invalidPath);

    const studioPage = /** @type {StudioPageModule} */ (
      await server.ssrLoadModule('/src/routes/studio/items/[id]/+page.server.js')
    );
    const form = new FormData();
    for (const [name, value] of Object.entries({
      title: 'Related saved', subtitle: '', status: 'draft', price_mode: 'hidden',
      description: 'Saved description', notice: ''
    })) form.set(name, value);
    form.append('gallery_files', '/images/items/placeholder.svg');
    form.append('gallery_alts', '');
    form.append('gallery_roles', 'cover');
    const response = await studioPage.actions.saveItem({
      params: { id: 'related-item' },
      request: new Request('http://localhost/studio/items/related-item', { method: 'POST', body: form })
    });
    assert.notEqual(response?.status, 400, JSON.stringify(response));
    const saved = /** @type {Record<string, unknown>} */ (
      parse(fs.readFileSync(path.join(root, 'content/items/related-item.yaml'), 'utf8'))
    );
    assert.deepEqual(saved.relations, [
      { type: '  inspired-by ', target: ' missing-work ', label: ' Inspiration ' },
      { type: 'part-of', target: 'related-item' },
      { type: 'part-of', target: 'related-item' },
      { type: 'related-to', target: 'missing-id' },
      { type: 'related-to', target: 'non-string-id' },
      { type: 'related-to', target: 'blank-id' }
    ]);
    assert.equal(saved.title, 'Related saved');
  } finally {
    if (server) await server.close();
    process.chdir(originalCwd);
    if (originalStudio === undefined) delete process.env.ATELIER_STUDIO;
    else process.env.ATELIER_STUDIO = originalStudio;
    fs.rmSync(root, { recursive: true, force: true });
  }
});
