import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import {
  applyFilePlan,
  applyUiComponentsIntegrationPlan,
  buildFilePlan,
  buildUiComponentsIntegrationPlan,
  main,
  writeManifest
} from '../scripts/site-upgrade.js';

const kitRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const currentViteConfig = fs.readFileSync(path.join(kitRoot, 'vite.config.js'), 'utf8');
const artifact = 'vendor/giadaware-ui-components/fcdb869/giadaware-ui-components-0.0.0.tgz';
const identity = 'vendor/giadaware-ui-components/fcdb869/integration.json';
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

/** @param {string} clientRoot @param {string} relativePath */
function copyIntegrationFile(clientRoot, relativePath) {
  const target = path.join(clientRoot, relativePath);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.copyFileSync(path.join(kitRoot, relativePath), target);
}

/** @param {string} root */
function snapshotTree(root) {
  /** @type {Record<string, string>} */
  const snapshot = {};
  /** @param {string} directory */
  const walk = (directory) => {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      const absolute = path.join(directory, entry.name);
      if (entry.isDirectory()) walk(absolute);
      if (entry.isFile()) snapshot[path.relative(root, absolute)] = fs.readFileSync(absolute).toString('hex');
    }
  };
  walk(root);
  return snapshot;
}

/** @param {string} clientRoot @param {string | undefined} value */
function setDependency(clientRoot, value) {
  const packagePath = path.join(clientRoot, 'package.json');
  const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
  packageJson.dependencies = packageJson.dependencies || {};
  if (value === undefined) delete packageJson.dependencies['giadaware-ui-components'];
  else packageJson.dependencies['giadaware-ui-components'] = value;
  fs.writeFileSync(packagePath, `${JSON.stringify(packageJson, null, 2)}\n`);
}

/** @param {string} clientRoot @param {string[]} extraArgs @param {{ readPreservedFile?: (filePath: string) => Buffer }} integrationValidation */
async function runMain(clientRoot, extraArgs = ['--yes'], integrationValidation = {}) {
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
    ...extraArgs
  ];
  console.log = (...values) => messages.push(values.join(' '));
  console.warn = (...values) => messages.push(values.join(' '));
  try {
    await main(integrationValidation);
    return messages.join('\n');
  } finally {
    process.argv = originalArgv;
    console.log = originalLog;
    console.warn = originalWarn;
  }
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

test('successfully migrates the fresh issue-169 dependency, identity and artifact', async () => {
  const clientRoot = makeClient();
  try {
    await runMain(clientRoot);
    const clientPackage = JSON.parse(fs.readFileSync(path.join(clientRoot, 'package.json'), 'utf8'));
    assert.equal(clientPackage.dependencies['giadaware-ui-components'], `file:${artifact}`);
    assert.deepEqual(fs.readFileSync(path.join(clientRoot, artifact)), fs.readFileSync(path.join(kitRoot, artifact)));
    assert.deepEqual(fs.readFileSync(path.join(clientRoot, identity)), fs.readFileSync(path.join(kitRoot, identity)));
  } finally { cleanup(clientRoot); }
});

for (const [label, value] of [['missing', undefined], ['wrong', 'file:vendor/wrong.tgz']]) {
  test(`preserved package.json with ${label} dependency aborts with zero mutations`, async () => {
    const clientRoot = makeClient();
    try {
      setDependency(clientRoot, value);
      fs.writeFileSync(path.join(clientRoot, '.atelier-kit-preserve'), 'package.json\n');
      const before = snapshotTree(clientRoot);
      await assert.rejects(
        runMain(clientRoot),
        /preserves package\.json.*Expected "file:vendor\/giadaware-ui-components\/fcdb869\/giadaware-ui-components-0\.0\.0\.tgz".*Remove the package\.json preserve rule/
      );
      assert.deepEqual(snapshotTree(clientRoot), before);
    } finally { cleanup(clientRoot); }
  });
}

test('preserved package.json with the exact dependency is allowed and never rewritten', async () => {
  const clientRoot = makeClient();
  try {
    setDependency(clientRoot, `file:${artifact}`);
    const packagePath = path.join(clientRoot, 'package.json');
    const before = fs.readFileSync(packagePath);
    fs.writeFileSync(path.join(clientRoot, '.atelier-kit-preserve'), 'package.json\n');
    await runMain(clientRoot);
    assert.deepEqual(fs.readFileSync(packagePath), before);
    assert.equal(fs.existsSync(path.join(clientRoot, artifact)), true);
  } finally { cleanup(clientRoot); }
});

/** @type {{ label: string, relativePath: string, prepare: (clientRoot: string) => void }[]} */
const preservedIntegrationCases = [
  { label: 'missing artifact', relativePath: artifact, prepare: () => {} },
  { label: 'wrong artifact', relativePath: artifact, prepare: (clientRoot) => {
    const target = path.join(clientRoot, artifact);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, 'wrong');
  } },
  { label: 'missing identity', relativePath: identity, prepare: () => {} },
  { label: 'wrong identity', relativePath: identity, prepare: (clientRoot) => {
    const target = path.join(clientRoot, identity);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, '{}\n');
  } },
  { label: 'identity directory', relativePath: identity, prepare: (clientRoot) => {
    fs.mkdirSync(path.join(clientRoot, identity), { recursive: true });
  } }
];

for (const { label, relativePath, prepare } of preservedIntegrationCases) {
  test(`preserved issue-169 ${label} aborts before all target mutations`, async () => {
    const clientRoot = makeClient();
    try {
      prepare(clientRoot);
      fs.writeFileSync(path.join(clientRoot, '.atelier-kit-preserve'), `${relativePath}\n`);
      const before = snapshotTree(clientRoot);
      const expectedDetail = relativePath === artifact
        ? 'required SHA-256: c53b5399520db687f7aef43c15b8b4b6a999a6a80f1bda71e26ff22a35acb7bd'
        : 'exact integration identity/content';
      await assert.rejects(
        runMain(clientRoot),
        new RegExp(`${relativePath.replaceAll('/', '\\/')}.*Required state:.*exactly matches the Atelier-Kit copy.*${expectedDetail}.*Remove or adjust the \\.atelier-kit-preserve rule`)
      );
      assert.deepEqual(snapshotTree(clientRoot), before);
    } finally { cleanup(clientRoot); }
  });
}

test('unreadable preserved issue-169 identity aborts preflight before all mutations', async () => {
  const clientRoot = makeClient();
  const target = path.join(clientRoot, identity);
  try {
    copyIntegrationFile(clientRoot, identity);
    fs.writeFileSync(path.join(clientRoot, '.atelier-kit-preserve'), `${identity}\n`);
    const before = snapshotTree(clientRoot);
    fs.chmodSync(target, 0o000);

    /** @type {((filePath: string) => Buffer) | undefined} */
    let readPreservedFile;
    try {
      fs.readFileSync(target);
      readPreservedFile = (filePath) => {
        if (filePath === target) {
          throw Object.assign(new Error('controlled unreadable preserved identity'), {
            code: 'EACCES'
          });
        }
        return fs.readFileSync(filePath);
      };
    } catch {
      // The real filesystem permission failure will exercise the same validation path.
    }

    await assert.rejects(
      runMain(clientRoot, ['--yes'], { readPreservedFile }),
      (error) => {
        assert.ok(error instanceof Error);
        assert.match(
          error.message,
          new RegExp(`${identity.replaceAll('/', '\\/')}.*readable regular file.*exact integration identity/content.*Remove or adjust the \\.atelier-kit-preserve rule.*restore the exact required file before retrying`)
        );
        const cause = /** @type {{ code?: string }} */ (error.cause);
        assert.equal(cause.code, 'EACCES');
        return true;
      }
    );
    fs.chmodSync(target, 0o600);
    assert.deepEqual(snapshotTree(clientRoot), before);
  } finally {
    try { fs.chmodSync(target, 0o600); } catch {}
    cleanup(clientRoot);
  }
});

test('matching preserved identity and artifact are accepted without rewriting them', async () => {
  const clientRoot = makeClient();
  try {
    copyIntegrationFile(clientRoot, artifact);
    copyIntegrationFile(clientRoot, identity);
    const artifactBefore = fs.readFileSync(path.join(clientRoot, artifact));
    const identityBefore = fs.readFileSync(path.join(clientRoot, identity));
    fs.writeFileSync(path.join(clientRoot, '.atelier-kit-preserve'), `${artifact}\n${identity}\n`);
    await runMain(clientRoot);
    assert.deepEqual(fs.readFileSync(path.join(clientRoot, artifact)), artifactBefore);
    assert.deepEqual(fs.readFileSync(path.join(clientRoot, identity)), identityBefore);
    assert.equal(JSON.parse(fs.readFileSync(path.join(clientRoot, 'package.json'), 'utf8')).dependencies['giadaware-ui-components'], `file:${artifact}`);
  } finally { cleanup(clientRoot); }
});

test('a wrong-checksum source artifact aborts preflight with zero target mutations', () => {
  const clientRoot = makeClient();
  const fakeKit = fs.mkdtempSync(path.join(os.tmpdir(), 'atelier-kit-bad-source-'));
  try {
    fs.mkdirSync(path.join(fakeKit, path.dirname(artifact)), { recursive: true });
    fs.copyFileSync(path.join(kitRoot, 'package.json'), path.join(fakeKit, 'package.json'));
    fs.copyFileSync(path.join(kitRoot, identity), path.join(fakeKit, identity));
    fs.writeFileSync(path.join(fakeKit, artifact), 'wrong source bytes');
    const before = snapshotTree(clientRoot);
    assert.throws(() => buildUiComponentsIntegrationPlan(fakeKit, clientRoot, new Set()), /source artifact.*wrong SHA-256/);
    assert.deepEqual(snapshotTree(clientRoot), before);
  } finally { cleanup(clientRoot); cleanup(fakeKit); }
});

test('repairs a missing artifact before an unrelated normal copy can fail', async () => {
  const clientRoot = makeClient();
  try {
    setDependency(clientRoot, `file:${artifact}`);
    copyIntegrationFile(clientRoot, identity);
    const integrationPlan = buildUiComponentsIntegrationPlan(kitRoot, clientRoot, new Set());
    applyUiComponentsIntegrationPlan(integrationPlan, kitRoot, clientRoot);
    const failingNormalPlan = { add: ['src/injected-missing-file.svelte'], update: [], remove: [] };
    assert.throws(() => applyFilePlan(failingNormalPlan, kitRoot, clientRoot), /ENOENT/);
    assert.equal(crypto.createHash('sha256').update(fs.readFileSync(path.join(clientRoot, artifact))).digest('hex'), 'c53b5399520db687f7aef43c15b8b4b6a999a6a80f1bda71e26ff22a35acb7bd');
    assert.equal(JSON.parse(fs.readFileSync(path.join(clientRoot, 'package.json'), 'utf8')).dependencies['giadaware-ui-components'], `file:${artifact}`);
  } finally { cleanup(clientRoot); }
});

/** @type {{ label: string, hooks: Parameters<typeof applyUiComponentsIntegrationPlan>[4], expected: RegExp }[]} */
const integrationFailureCases = [
  { label: 'temporary artifact write', hooks: { writeArtifactTemp: () => { throw new Error('artifact temp failure'); } }, expected: /artifact temp failure/ },
  { label: 'post-install pre-package step', hooks: { afterArtifactInstalled: () => { throw new Error('before package migration'); } }, expected: /before package migration/ },
  { label: 'atomic package write', hooks: { writePackageTemp: () => { throw new Error('package temp failure'); } }, expected: /package temp failure/ },
  { label: 'atomic package rename', hooks: { beforePackageRename: () => { throw new Error('package rename failure'); } }, expected: /package rename failure/ }
];

for (const { label, hooks, expected } of integrationFailureCases) {
  test(`rolls back issue-169 state on failure during ${label}`, () => {
    const clientRoot = makeClient();
    try {
      const before = snapshotTree(clientRoot);
      const plan = buildUiComponentsIntegrationPlan(kitRoot, clientRoot, new Set());
      assert.throws(() => applyUiComponentsIntegrationPlan(plan, kitRoot, clientRoot, [], hooks), expected);
      assert.deepEqual(snapshotTree(clientRoot), before);
    } finally { cleanup(clientRoot); }
  });
}

test('successfully repairs a bad artifact when the dependency is already correct', async () => {
  const clientRoot = makeClient();
  try {
    setDependency(clientRoot, `file:${artifact}`);
    const target = path.join(clientRoot, artifact);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, 'bad target');
    await runMain(clientRoot);
    assert.deepEqual(fs.readFileSync(target), fs.readFileSync(path.join(kitRoot, artifact)));
    assert.equal(JSON.parse(fs.readFileSync(path.join(clientRoot, 'package.json'), 'utf8')).dependencies['giadaware-ui-components'], `file:${artifact}`);
  } finally { cleanup(clientRoot); }
});

test('prints npm install before dependency-consuming validation commands', async () => {
  const clientRoot = makeClient();
  try {
    const output = await runMain(clientRoot);
    const install = output.indexOf('  npm install');
    const check = output.indexOf('  npm run check');
    const build = output.indexOf('  npm run build');
    assert.ok(install > -1, output);
    assert.ok(install < check && check < build, output);
  } finally { cleanup(clientRoot); }
});

test('does not request npm install when issue-169 dependency and artifact are unchanged', async () => {
  const clientRoot = makeClient(currentViteConfig);
  try {
    copyIntegrationFile(clientRoot, artifact);
    copyIntegrationFile(clientRoot, identity);
    fs.cpSync(path.join(kitRoot, 'src'), path.join(clientRoot, 'src'), { recursive: true });
    fs.cpSync(path.join(kitRoot, 'scripts'), path.join(clientRoot, 'scripts'), { recursive: true });
    fs.appendFileSync(path.join(clientRoot, 'scripts/site-upgrade.js'), '\n// changed client copy\n');
    const kitPackage = JSON.parse(fs.readFileSync(path.join(kitRoot, 'package.json'), 'utf8'));
    const clientPackagePath = path.join(clientRoot, 'package.json');
    const clientPackage = JSON.parse(fs.readFileSync(clientPackagePath, 'utf8'));
    clientPackage.scripts = kitPackage.scripts;
    clientPackage.dependencies = {
      'giadaware-ui-components': `file:${artifact}`
    };
    fs.writeFileSync(clientPackagePath, `${JSON.stringify(clientPackage, null, 2)}\n`);

    const output = await runMain(clientRoot);
    assert.doesNotMatch(output, /npm install/);
    assert.match(output, /npm run check[\s\S]*npm run build/);
    assert.deepEqual(fs.readFileSync(path.join(clientRoot, 'scripts/site-upgrade.js')), fs.readFileSync(path.join(kitRoot, 'scripts/site-upgrade.js')));
  } finally { cleanup(clientRoot); }
});

test('dry-run keeps customized Vite config and warns about manual resolver adoption', async () => {
  const custom = '// custom Vite config\n';
  const clientRoot = makeClient(custom);
  try {
    const output = await runMain(clientRoot, ['--dry-run']);
    assert.match(output, /customized or unrecognized; not overwritten/);
    assert.match(output, /adopt the new Kit version resolver manually/);
    assert.match(output, /Dry run only\. No files were changed\./);
    assert.equal(fs.readFileSync(path.join(clientRoot, 'vite.config.js'), 'utf8'), custom);
    assert.equal(fs.existsSync(path.join(clientRoot, '.atelier-kit-upgrade.json')), false);
  } finally { cleanup(clientRoot); }
});
