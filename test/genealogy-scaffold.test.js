import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { parse, stringify } from 'yaml';

const kitRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const childEnv = { ...process.env };
delete childEnv.NODE_TEST_CONTEXT;

const DEMO_IDS = [
  'alma-conti',
  'lucia-serra',
  'matteo-serra',
  'nina-galli',
  'renato-galli'
];

/** @typedef {{ label: string }} MetaEntry */
/** @typedef {{ id: string, href: string }} GraphNode */
/** @typedef {{ source: string, target: string, type?: string }} GraphEdge */
/** @typedef {{ item: { id: string } }} RelatedItem */
/** @typedef {{ href: string }} MenuEntry */
/** @typedef {{ loc: string }} SitemapEntry */

/** @param {string} root @param {string} relativePath */
function read(root, relativePath) {
  return fs.readFileSync(path.join(root, relativePath), 'utf8');
}

/** @param {string} root @param {string} relativePath */
function readYaml(root, relativePath) {
  return parse(read(root, relativePath));
}

/** @param {string} root */
function snapshotTree(root) {
  /** @type {Array<[string, string]>} */
  const snapshot = [];

  /** @param {string} directory */
  function visit(directory) {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true }).sort((a, b) =>
      a.name < b.name ? -1 : a.name > b.name ? 1 : 0
    )) {
      const absolutePath = path.join(directory, entry.name);
      const relativePath = path.relative(root, absolutePath).split(path.sep).join('/');

      if (entry.isDirectory()) {
        snapshot.push([relativePath, 'directory']);
        visit(absolutePath);
      } else if (entry.isFile()) {
        snapshot.push([relativePath, fs.readFileSync(absolutePath).toString('base64')]);
      }
    }
  }

  visit(root);
  return snapshot;
}

/** @param {string} target */
function runContentValidation(target) {
  return spawnSync(process.execPath, ['scripts/validate-content.js'], {
    cwd: target,
    encoding: 'utf8',
    env: childEnv
  });
}

/**
 * Load generated visitor route modules against the generated content root.
 * @param {string} target
 * @param {string} cacheDir
 * @param {string[]} [itemIds]
 */
async function loadGeneratedVisitorData(target, cacheDir, itemIds = []) {
  const originalCwd = process.cwd();
  const { createServer } = await import('vite');
  process.chdir(target);
  const server = await createServer({
    root: target,
    cacheDir,
    optimizeDeps: { noDiscovery: true, include: [] },
    ssr: { optimizeDeps: { noDiscovery: true, include: [] } },
    server: { middlewareMode: true, hmr: false },
    appType: 'custom',
    logLevel: 'error'
  });

  try {
    const relationshipPage = await server.ssrLoadModule('/src/routes/relationships/+page.server.js');
    const itemPage = await server.ssrLoadModule('/src/routes/items/[id]/+page.server.js');
    const layout = await server.ssrLoadModule('/src/routes/+layout.server.js');
    const sitemap = await server.ssrLoadModule('/src/lib/server/sitemap.js');
    return {
      graphData: relationshipPage.load(),
      layoutData: layout.load({ url: new URL('https://example.test/relationships') }),
      sitemapUrls: sitemap.buildSitemapUrls('https://example.test'),
      itemDetails: Object.fromEntries(itemIds.map((id) => [
        id,
        itemPage.load({
          params: { id },
          url: new URL(`https://example.test/items/${id}`)
        })
      ]))
    };
  } finally {
    await server.close();
    process.chdir(originalCwd);
  }
}

test('genealogy scaffold generates validated multi-generation people and the generic graph overview', async () => {
  const parent = fs.mkdtempSync(path.join(os.tmpdir(), 'atelier-genealogy-scaffold-'));
  const target = path.join(parent, 'family-site');

  try {
    const scaffold = spawnSync(
      process.execPath,
      [path.join(kitRoot, 'scripts/scaffold-client.js'), target, '--template', 'genealogy'],
      { cwd: kitRoot, encoding: 'utf8', env: childEnv }
    );
    assert.equal(scaffold.status, 0, `${scaffold.stdout}\n${scaffold.stderr}`);
    const firstGeneration = snapshotTree(target);
    const forcedScaffold = spawnSync(
      process.execPath,
      [path.join(kitRoot, 'scripts/scaffold-client.js'), target, '--template', 'genealogy', '--force'],
      { cwd: kitRoot, encoding: 'utf8', env: childEnv }
    );
    assert.equal(forcedScaffold.status, 0, `${forcedScaffold.stdout}\n${forcedScaffold.stderr}`);
    assert.deepEqual(snapshotTree(target), firstGeneration);

    const site = readYaml(target, 'config/site.yaml').site;
    const catalog = readYaml(target, 'config/catalog.yaml').catalog;
    assert.equal(site.name, 'The Conti–Serra Family Archive');
    assert.equal(site.appearance.preset, 'intimate');
    assert.equal(site.appearance.font_preset, 'lora');
    assert.match(site.notice, /living person.*informed consent/i);
    assert.deepEqual(
      { singular: catalog.item_name_singular, plural: catalog.item_name_plural },
      { singular: 'person', plural: 'people' }
    );

    const itemFiles = fs.readdirSync(path.join(target, 'content/items')).sort();
    assert.deepEqual(itemFiles, DEMO_IDS.map((id) => `${id}.yaml`).sort());
    const people = itemFiles.map((file) => readYaml(target, `content/items/${file}`));

    for (const person of people) {
      assert.match(person.description, /fictional|demo/i);
      const meta = /** @type {MetaEntry[]} */ (person.meta);
      assert.ok(meta.some((entry) => entry.label === 'Dates'));
      assert.ok(meta.some((entry) => entry.label === 'Places'));
      assert.equal(person.images[0].file, '/images/items/placeholder.svg');
      assert.equal(person.preview.href, '/documents/genealogy/sample-archive-note.txt');
      assert.ok(Array.isArray(person.relations) && person.relations.length > 0);
    }
    assert.equal(
      fs.existsSync(path.join(target, 'static/documents/genealogy/sample-archive-note.txt')),
      true
    );

    const relationPage = read(target, 'src/routes/relationships/+page.svelte');
    const relationLoader = read(target, 'src/routes/relationships/+page.server.js');
    assert.match(
      relationPage,
      /import \{ RelationshipGraph \} from 'giadaware-ui-components\/visitor'/
    );
    assert.doesNotMatch(relationPage, /from 'giadaware-ui-components'/);
    assert.match(relationPage, /nodes=\{data\.graph\.nodes\}/);
    assert.match(relationPage, /edges=\{data\.graph\.edges\}/);
    assert.match(relationLoader, /projectItemRelationshipGraph\(getItems\(\)\)/);
    for (const id of DEMO_IDS) assert.doesNotMatch(relationLoader, new RegExp(id));

    fs.symlinkSync(path.join(kitRoot, 'node_modules'), path.join(target, 'node_modules'), 'dir');
    const validation = runContentValidation(target);
    assert.equal(validation.status, 0, `${validation.stdout}\n${validation.stderr}`);
    assert.match(validation.stdout, /content validation OK/i);

    const { graphData, layoutData, sitemapUrls, itemDetails } = await loadGeneratedVisitorData(
      target,
      path.join(parent, '.vite-genealogy'),
      DEMO_IDS
    );
    const nodes = /** @type {GraphNode[]} */ (graphData.graph.nodes);
    const edges = /** @type {GraphEdge[]} */ (graphData.graph.edges);
    assert.deepEqual(nodes.map((node) => node.id), [...DEMO_IDS].sort());
    assert.deepEqual(
      nodes.map(({ id, href }) => [id, href]),
      [...DEMO_IDS].sort().map((id) => [id, `/items/${id}`])
    );
    assert.ok(layoutData.menuNav.some((/** @type {MenuEntry} */ entry) =>
      entry.href === '/relationships'
    ));
    assert.ok(sitemapUrls.some((/** @type {SitemapEntry} */ entry) =>
      entry.loc === 'https://example.test/relationships'
    ));

    /** @param {string} source */
    const parentTargets = (source) => edges
      .filter((edge) => edge.source === source && edge.type === 'parent')
      .map((edge) => edge.target)
      .sort();
    assert.deepEqual(parentTargets('lucia-serra'), ['alma-conti', 'matteo-serra']);
    assert.deepEqual(parentTargets('nina-galli'), ['lucia-serra', 'renato-galli']);
    assert.ok(edges.some((edge) => edge.source === 'lucia-serra' && edge.target === 'renato-galli' && edge.type === 'spouse'));
    assert.ok(edges.some((edge) => edge.source === 'renato-galli' && edge.target === 'lucia-serra' && edge.type === 'spouse'));

    for (const id of DEMO_IDS) {
      const detail = itemDetails[id];
      assert.equal(detail.item.id, id);
      assert.ok(detail.relatedItems.length > 0);
      assert.ok(
        (/** @type {RelatedItem[]} */ (detail.relatedItems))
          .every((entry) => entry.item.id !== id)
      );
    }

    const relationCore = read(kitRoot, 'src/lib/item-relations.js');
    const validatorCore = read(kitRoot, 'scripts/validate-content.js');
    assert.doesNotMatch(relationCore, /\b(?:parent|spouse)\b/i);
    assert.doesNotMatch(validatorCore, /\b(?:parent|spouse)\b/i);

    for (const id of DEMO_IDS) fs.rmSync(path.join(target, `content/items/${id}.yaml`));
    fs.rmSync(path.join(target, 'content/collections/family-archive.yaml'));
    fs.rmSync(path.join(target, 'static/documents/genealogy'), { recursive: true });
    fs.writeFileSync(path.join(target, 'content/items/archive-entry.yaml'), stringify({
      id: 'archive-entry',
      title: 'Archive Entry',
      image_file: '/images/items/placeholder.svg',
      image_alt: 'Replacement image',
      description: 'A clean replacement record without genealogy-specific fields.'
    }));
    fs.writeFileSync(path.join(target, 'content/collections/archive.yaml'), stringify({
      id: 'archive',
      title: 'Archive',
      description: 'Replacement collection.',
      items: ['archive-entry']
    }));

    const replacementValidation = runContentValidation(target);
    assert.equal(
      replacementValidation.status,
      0,
      `${replacementValidation.stdout}\n${replacementValidation.stderr}`
    );

    const replacement = await loadGeneratedVisitorData(
      target,
      path.join(parent, '.vite-genealogy-replacement')
    );
    assert.deepEqual(replacement.graphData.graph, {
      nodes: [{ id: 'archive-entry', label: 'Archive Entry', href: '/items/archive-entry' }],
      edges: []
    });
    assert.equal(
      replacement.layoutData.menuNav.some((/** @type {MenuEntry} */ entry) =>
        entry.href === '/relationships'
      ),
      false
    );
    assert.equal(
      replacement.sitemapUrls.some((/** @type {SitemapEntry} */ entry) =>
        entry.loc === 'https://example.test/relationships'
      ),
      false
    );
  } finally {
    fs.rmSync(parent, { recursive: true, force: true });
  }
});

test('guided client creation accepts the genealogy template and patches its starter records', () => {
  const parent = fs.mkdtempSync(path.join(os.tmpdir(), 'atelier-genealogy-wizard-'));
  const target = path.join(parent, 'guided-family-site');

  try {
    const wizard = spawnSync(
      process.execPath,
      [
        path.join(kitRoot, 'scripts/site-wizard.js'),
        '--yes',
        '--template', 'genealogy',
        '--target', target,
        '--site-title', 'Guided Family Archive',
        '--tagline', 'A reviewed public history',
        '--email', 'archive@example.test',
        '--first-item-title', 'Lucia Demo Replacement',
        '--collection-title', 'Reviewed Family Records'
      ],
      { cwd: kitRoot, encoding: 'utf8', env: childEnv }
    );

    assert.equal(wizard.status, 0, `${wizard.stdout}\n${wizard.stderr}`);
    assert.equal(readYaml(target, 'config/site.yaml').site.name, 'Guided Family Archive');
    assert.equal(
      readYaml(target, 'content/items/lucia-serra.yaml').title,
      'Lucia Demo Replacement'
    );
    assert.equal(
      readYaml(target, 'content/collections/family-archive.yaml').title,
      'Reviewed Family Records'
    );
  } finally {
    fs.rmSync(parent, { recursive: true, force: true });
  }
});
