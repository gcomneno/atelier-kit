import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import { applyFilePlan, buildFilePlan, main, writeManifest } from '../scripts/site-upgrade.js';

const kitRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const currentViteConfig = fs.readFileSync(path.join(kitRoot, 'vite.config.js'), 'utf8');
const legacyViteConfig = `import adapter from '@sveltejs/adapter-vercel';
import { sveltekit } from '@sveltejs/kit/vite';
import { readFileSync } from 'node:fs';
import { defineConfig } from 'vite';

/** @returns {string} */
function readLatestChangelogVersion() {
  try {
    const content = readFileSync(new URL('./CHANGELOG.md', import.meta.url), 'utf8');
    const match = content.match(/^## (v[0-9]+\\.[0-9]+\\.[0-9]+)/m);

    return match ? match[1] : '';
  } catch {
    return '';
  }
}

export default defineConfig({
  define: {
    'import.meta.env.KIT_VERSION': JSON.stringify(readLatestChangelogVersion())
  },
  plugins: [
    sveltekit({
      adapter: adapter()
    })
  ]
});
`;

/** @param {string} [viteConfig] */
function makeClient(viteConfig) {
  const clientRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'atelier-kit-upgrade-'));
  fs.mkdirSync(path.join(clientRoot, 'config'), { recursive: true });
  fs.writeFileSync(path.join(clientRoot, 'config/site.yaml'), 'name: Test\n');
  fs.writeFileSync(
    path.join(clientRoot, 'package.json'),
    `${JSON.stringify({ name: 'test-client', private: true, type: 'module', scripts: {} }, null, 2)}\n`
  );
  if (viteConfig !== undefined) fs.writeFileSync(path.join(clientRoot, 'vite.config.js'), viteConfig);
  return clientRoot;
}

/** @param {string} clientRoot */
function cleanup(clientRoot) {
  fs.rmSync(clientRoot, { recursive: true, force: true });
}

test('updates a known standard legacy vite.config.js', () => {
  const clientRoot = makeClient(legacyViteConfig);
  try {
    const plan = buildFilePlan(kitRoot, clientRoot, new Set());
    assert.ok(plan.update.includes('vite.config.js'));
    assert.deepEqual(plan.manualReview, []);
    applyFilePlan(plan, kitRoot, clientRoot);
    assert.equal(fs.readFileSync(path.join(clientRoot, 'vite.config.js'), 'utf8'), currentViteConfig);
  } finally { cleanup(clientRoot); }
});

test('keeps a customized vite.config.js and the client changelog intact', () => {
  const custom = '// client Vite plugins and aliases\n';
  const changelog = '# Client history\n\nNever replace this.\n';
  const clientRoot = makeClient(custom);
  try {
    fs.writeFileSync(path.join(clientRoot, 'CHANGELOG.md'), changelog);
    const plan = buildFilePlan(kitRoot, clientRoot, new Set());
    assert.deepEqual(plan.manualReview, ['vite.config.js']);
    assert.ok(!plan.update.includes('vite.config.js'));
    applyFilePlan(plan, kitRoot, clientRoot);
    writeManifest(clientRoot, kitRoot, 'v0.3.0');
    assert.equal(fs.readFileSync(path.join(clientRoot, 'vite.config.js'), 'utf8'), custom);
    assert.equal(fs.readFileSync(path.join(clientRoot, 'CHANGELOG.md'), 'utf8'), changelog);
    assert.equal(
      JSON.parse(fs.readFileSync(path.join(clientRoot, '.atelier-kit-upgrade.json'), 'utf8'))
        .kitVersion,
      'v0.3.0'
    );
  } finally { cleanup(clientRoot); }
});

test('keeps vite.config.js when explicitly preserved', () => {
  const custom = '// explicitly preserved\n';
  const clientRoot = makeClient(custom);
  try {
    const plan = buildFilePlan(kitRoot, clientRoot, new Set(['vite.config.js']));
    assert.deepEqual(plan.preserve, ['vite.config.js']);
    assert.deepEqual(plan.manualReview, []);
    applyFilePlan(plan, kitRoot, clientRoot);
    assert.equal(fs.readFileSync(path.join(clientRoot, 'vite.config.js'), 'utf8'), custom);
  } finally { cleanup(clientRoot); }
});

test('installs a missing vite.config.js', () => {
  const clientRoot = makeClient();
  try {
    const plan = buildFilePlan(kitRoot, clientRoot, new Set());
    assert.ok(plan.add.includes('vite.config.js'));
    applyFilePlan(plan, kitRoot, clientRoot);
    assert.equal(fs.readFileSync(path.join(clientRoot, 'vite.config.js'), 'utf8'), currentViteConfig);
  } finally { cleanup(clientRoot); }
});

test('dry-run keeps customized Vite config and warns about manual resolver adoption', async () => {
  const custom = '// custom Vite config\n';
  const clientRoot = makeClient(custom);
  try {
    const originalArgv = process.argv;
    const originalLog = console.log;
    const originalWarn = console.warn;
    /** @type {string[]} */
    const messages = [];
    process.argv = [
      process.execPath,
      'site-upgrade.js',
      '--target',
      clientRoot,
      '--from',
      kitRoot,
      '--dry-run'
    ];
    console.log = (...values) => messages.push(values.join(' '));
    console.warn = (...values) => messages.push(values.join(' '));
    try {
      await main();
    } finally {
      process.argv = originalArgv;
      console.log = originalLog;
      console.warn = originalWarn;
    }
    const output = messages.join('\n');
    assert.match(output, /customized or unrecognized; not overwritten/);
    assert.match(output, /adopt the new Kit version resolver manually/);
    assert.match(output, /Dry run only\. No files were changed\./);
    assert.equal(fs.readFileSync(path.join(clientRoot, 'vite.config.js'), 'utf8'), custom);
    assert.equal(fs.existsSync(path.join(clientRoot, '.atelier-kit-upgrade.json')), false);
  } finally { cleanup(clientRoot); }
});
