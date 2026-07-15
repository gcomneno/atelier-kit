import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import {
  HISTORICAL_TEST_COMMANDS,
  applyFilePlan,
  applyUiComponentsIntegrationPlan,
  buildFilePlan,
  buildUiComponentsIntegrationPlan,
  canonicalManagedTestPath,
  deriveManagedTestsFromClient,
  hashRegularFileNoFollow,
  isHistoricalTestCommand,
  loadManagedTestBaseline,
  main,
  writeManifest
} from '../scripts/site-upgrade.js';

const kitRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const childEnv = { ...process.env };
delete childEnv.NODE_TEST_CONTEXT;
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
  /** @type {Record<string, { type: string, mode: number, bytes?: string, target?: string }>} */
  const snapshot = {};
  /** @param {string} directory */
  const walk = (directory) => {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      const absolute = path.join(directory, entry.name);
      const relative = path.relative(root, absolute);
      const stat = fs.lstatSync(absolute);
      if (stat.isSymbolicLink()) {
        snapshot[relative] = { type: 'symlink', mode: stat.mode & 0o7777, target: fs.readlinkSync(absolute) };
      } else if (stat.isDirectory()) {
        snapshot[relative] = { type: 'directory', mode: stat.mode & 0o7777 };
        walk(absolute);
      } else if (stat.isFile()) {
        snapshot[relative] = { type: 'file', mode: stat.mode & 0o7777, bytes: fs.readFileSync(absolute).toString('hex') };
      } else {
        snapshot[relative] = { type: 'other', mode: stat.mode & 0o7777 };
      }
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

/** @param {string} clientRoot @param {string[]} extraArgs @param {{ readPreservedFile?: (filePath: string) => Buffer, transactionHooks?: any }} integrationValidation */
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
    assert.equal(fs.readFileSync(path.join(clientRoot, '.atelier-kit-version'), 'utf8'), 'v0.3.0\n');
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
    const originalMode = fs.statSync(target).mode & 0o7777;
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
    fs.chmodSync(target, originalMode);
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
    assert.equal(fs.existsSync(path.join(clientRoot, '.atelier-kit-version')), false);
  } finally { cleanup(clientRoot); }
});

test('upgrade installs the existing-file test runner without requiring a root test directory', async () => {
  const clientRoot = makeClient();
  try {
    await runMain(clientRoot);
    const clientPackage = JSON.parse(fs.readFileSync(path.join(clientRoot, 'package.json'), 'utf8'));
    assert.equal(clientPackage.scripts.test, 'node scripts/run-tests.js');
    assert.doesNotMatch(clientPackage.scripts.test, /test\/\*\.test\.js/);
    assert.equal(fs.existsSync(path.join(clientRoot, 'test')), false);

    const result = await import('node:child_process').then(({ spawnSync }) =>
      spawnSync(process.execPath, ['scripts/run-tests.js'], { cwd: clientRoot, encoding: 'utf8', env: childEnv })
    );
    assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
  } finally { cleanup(clientRoot); }
});

test('upgrade retains client tests and adds newly managed src tests', async () => {
  const clientRoot = makeClient();
  try {
    fs.mkdirSync(path.join(clientRoot, 'src/client'), { recursive: true });
    fs.writeFileSync(path.join(clientRoot, 'src/client/custom.test.js'), "import test from 'node:test'; test('client', () => {});\n");
    await runMain(clientRoot);
    assert.equal(fs.existsSync(path.join(clientRoot, 'src/client/custom.test.js')), true);
    assert.equal(fs.existsSync(path.join(clientRoot, 'src/lib/about-config.test.js')), true);
    const result = await import('node:child_process').then(({ spawnSync }) =>
      spawnSync(process.execPath, ['scripts/run-tests.js'], { cwd: clientRoot, encoding: 'utf8', env: childEnv })
    );
    assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
  } finally { cleanup(clientRoot); }
});

test('test-related dry-run is mutation-free', async () => {
  const clientRoot = makeClient();
  try {
    fs.mkdirSync(path.join(clientRoot, 'src/client'), { recursive: true });
    fs.writeFileSync(path.join(clientRoot, 'src/client/custom.test.js'), '// client test\n');
    const before = snapshotTree(clientRoot);
    const output = await runMain(clientRoot, ['--dry-run']);
    assert.match(output, /scripts\.test/);
    assert.deepEqual(snapshotTree(clientRoot), before);
  } finally { cleanup(clientRoot); }
});

test('differing same-path client test is preserved and reported as a conflict', async () => {
  const clientRoot = makeClient();
  try {
    const rel = 'src/lib/about-config.test.js';
    fs.mkdirSync(path.dirname(path.join(clientRoot, rel)), { recursive: true });
    fs.writeFileSync(path.join(clientRoot, rel), "throw new Error('client-owned');\n");
    const output = await runMain(clientRoot, ['--dry-run']);
    assert.match(output, /src\/lib\/about-config\.test\.js \(client test differs from the recorded managed baseline; preserved, not overwritten or deleted\)/);
    assert.equal(fs.readFileSync(path.join(clientRoot, rel), 'utf8'), "throw new Error('client-owned');\n");
  } finally { cleanup(clientRoot); }
});

test('managed test baselines permit updates and proven unchanged obsolete removals', () => {
  const clientRoot = makeClient();
  const oldKit = fs.mkdtempSync(path.join(os.tmpdir(), 'atelier-old-kit-'));
  try {
    fs.mkdirSync(path.join(oldKit, 'src/lib'), { recursive: true });
    fs.mkdirSync(path.join(oldKit, 'scripts'), { recursive: true });
    fs.writeFileSync(path.join(oldKit, 'src/lib/about-config.test.js'), '// historical managed\n');
    fs.writeFileSync(path.join(oldKit, 'src/lib/obsolete.test.js'), '// obsolete managed\n');
    fs.copyFileSync(path.join(kitRoot, 'vite.config.js'), path.join(oldKit, 'vite.config.js'));
    fs.mkdirSync(path.join(clientRoot, 'src/lib'), { recursive: true });
    fs.copyFileSync(path.join(oldKit, 'src/lib/about-config.test.js'), path.join(clientRoot, 'src/lib/about-config.test.js'));
    fs.copyFileSync(path.join(oldKit, 'src/lib/obsolete.test.js'), path.join(clientRoot, 'src/lib/obsolete.test.js'));
    writeManifest(clientRoot, oldKit, 'old');
    const plan = buildFilePlan(kitRoot, clientRoot, new Set());
    assert.ok(plan.update.includes('src/lib/about-config.test.js'));
    assert.ok(plan.remove.includes('src/lib/obsolete.test.js'));
    applyFilePlan(plan, kitRoot, clientRoot);
    assert.deepEqual(fs.readFileSync(path.join(clientRoot, 'src/lib/about-config.test.js')), fs.readFileSync(path.join(kitRoot, 'src/lib/about-config.test.js')));
    assert.equal(fs.existsSync(path.join(clientRoot, 'src/lib/obsolete.test.js')), false);
  } finally { cleanup(clientRoot); cleanup(oldKit); }
});

test('obsolete managed test removal requires an unchanged baseline; client-only tests remain', () => {
  const clientRoot = makeClient();
  const oldKit = fs.mkdtempSync(path.join(os.tmpdir(), 'atelier-old-kit-'));
  try {
    fs.mkdirSync(path.join(oldKit, 'src/lib'), { recursive: true });
    fs.mkdirSync(path.join(oldKit, 'scripts'), { recursive: true });
    fs.writeFileSync(path.join(oldKit, 'src/lib/obsolete.test.js'), '// baseline\n');
    fs.copyFileSync(path.join(kitRoot, 'vite.config.js'), path.join(oldKit, 'vite.config.js'));
    fs.mkdirSync(path.join(clientRoot, 'src/lib'), { recursive: true });
    fs.writeFileSync(path.join(clientRoot, 'src/lib/obsolete.test.js'), '// baseline\n');
    fs.writeFileSync(path.join(clientRoot, 'src/lib/client-only.test.js'), '// client\n');
    writeManifest(clientRoot, oldKit, 'old');
    fs.writeFileSync(path.join(clientRoot, 'src/lib/obsolete.test.js'), '// client changed\n');
    const plan = buildFilePlan(kitRoot, clientRoot, new Set());
    assert.ok(plan.manualReview.includes('src/lib/obsolete.test.js'));
    assert.ok(!plan.remove.includes('src/lib/obsolete.test.js'));
    assert.ok(!plan.remove.includes('src/lib/client-only.test.js'));
  } finally { cleanup(clientRoot); cleanup(oldKit); }
});

test('historical Kit test command migrates, while a custom command is preserved and reported', async () => {
  const historical = makeClient();
  const custom = makeClient();
  try {
    for (const [root, command] of [
      [historical, 'node --test src/lib/editorial-markup.test.js src/lib/item-images.test.js src/lib/studio-item-gallery.test.js src/lib/site-branding.test.js src/lib/studio-signal-clouds.test.js src/lib/signal-cloud-faq.test.js test/*.test.js'],
      [custom, 'node custom-tests.mjs --flag']
    ]) {
      const packagePath = path.join(root, 'package.json');
      const pkg = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
      pkg.scripts.test = command;
      fs.writeFileSync(packagePath, `${JSON.stringify(pkg, null, 2)}\n`);
    }
    await runMain(historical);
    assert.equal(JSON.parse(fs.readFileSync(path.join(historical, 'package.json'), 'utf8')).scripts.test, 'node scripts/run-tests.js');
    const output = await runMain(custom);
    const customPkg = JSON.parse(fs.readFileSync(path.join(custom, 'package.json'), 'utf8'));
    assert.equal(customPkg.scripts.test, 'node custom-tests.mjs --flag');
    assert.equal(customPkg.scripts['test:kit'], undefined);
    assert.match(output, /scripts\.test \(custom command preserved\)/);
    const before = snapshotTree(custom);
    const second = await runMain(custom);
    assert.match(second, /custom command preserved/);
    assert.deepEqual(snapshotTree(custom), before);
  } finally { cleanup(historical); cleanup(custom); }
});

test('a failing retained client test propagates through the upgraded portable runner', async () => {
  const clientRoot = makeClient();
  try {
    fs.mkdirSync(path.join(clientRoot, 'src/lib'), { recursive: true });
    fs.writeFileSync(path.join(clientRoot, 'src/lib/failing client test.test.js'), "import test from 'node:test'; test('failure', () => { throw new Error('client failure'); });\n");
    await runMain(clientRoot);
    const result = await import('node:child_process').then(({ spawnSync }) =>
      spawnSync(process.execPath, ['scripts/run-tests.js'], { cwd: clientRoot, encoding: 'utf8', env: childEnv })
    );
    assert.notEqual(result.status, 0);
  } finally { cleanup(clientRoot); }
});

test('historical command identity is exact and custom test:kit remains client-owned', async () => {
  for (const command of HISTORICAL_TEST_COMMANDS) assert.equal(isHistoricalTestCommand(`  ${command.replaceAll(' ', '  ')} `), true);
  for (const command of ['node --test src/client-owned.test.js', 'node --test src/lib/about-config.test.js test/*.test.js', 'node --test src/lib/editorial-markup.test.js --watch']) {
    assert.equal(isHistoricalTestCommand(command), false, command);
  }
  const clientRoot = makeClient();
  try {
    const packagePath = path.join(clientRoot, 'package.json');
    const pkg = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
    pkg.scripts = { test: 'node --test src/client-owned.test.js', 'test:kit': 'node custom-kit-tests.js' };
    fs.writeFileSync(packagePath, `${JSON.stringify(pkg, null, 2)}\n`);
    const output = await runMain(clientRoot);
    const finalPkg = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
    assert.equal(finalPkg.scripts.test, 'node --test src/client-owned.test.js');
    assert.equal(finalPkg.scripts['test:kit'], 'node custom-kit-tests.js');
    assert.match(output, /custom command preserved/);
  } finally { cleanup(clientRoot); }
});

test('managed-test identities canonicalize conservatively and conflicting duplicates authorize nothing', () => {
  assert.equal(canonicalManagedTestPath('.\\src\\lib\\safe.test.js'), 'src/lib/safe.test.js');
  for (const value of ['', '/src/lib/a.test.js', 'C:\\src\\lib\\a.test.js', '\\\\host\\share\\a.test.js', '../src/lib/a.test.js', 'src/lib/x/../../a.test.js', 'src/lib/a.js', 'src/content/a.test.js', 'src/lib/a.test.js\0x']) {
    assert.equal(canonicalManagedTestPath(value), null, value);
  }
  const clientRoot = makeClient();
  try {
    fs.writeFileSync(path.join(clientRoot, '.atelier-kit-upgrade.json'), JSON.stringify({ managedTests: {
      './src/lib/safe.test.js': 'a'.repeat(64),
      'src\\lib\\safe.test.js': 'b'.repeat(64),
      '../escape.test.js': 'c'.repeat(64),
      'src/lib/bad.test.js': 'not-a-hash'
    } }));
    const reports = [];
    const loaded = loadManagedTestBaseline(clientRoot, (message) => reports.push(message));
    assert.deepEqual([...loaded], []);
    assert.ok(reports.length >= 3);
  } finally { cleanup(clientRoot); }
});

test('applied same-path conflict stays byte-identical, unproven in metadata, and stable on a second upgrade', async () => {
  const clientRoot = makeClient();
  const rel = 'src/lib/editorial-markup.test.js';
  try {
    fs.mkdirSync(path.dirname(path.join(clientRoot, rel)), { recursive: true });
    const custom = "// Nero Quotidiano preserved conflict\n";
    fs.writeFileSync(path.join(clientRoot, rel), custom);
    const first = await runMain(clientRoot);
    assert.match(first, /Keep customized/);
    assert.equal(fs.readFileSync(path.join(clientRoot, rel), 'utf8'), custom);
    const manifestPath = path.join(clientRoot, '.atelier-kit-upgrade.json');
    assert.equal(JSON.parse(fs.readFileSync(manifestPath, 'utf8')).managedTests[rel], undefined);
    const before = snapshotTree(clientRoot);
    const second = await runMain(clientRoot);
    assert.match(second, /Keep customized/);
    assert.deepEqual(snapshotTree(clientRoot), before);
  } finally { cleanup(clientRoot); }
});

test('complete upgrade transaction rolls back every affected byte for injected failures', async () => {
  const cases = [
    { beforeCopy: (/** @type {string} */ rel) => { if (rel.endsWith('.test.js')) throw new Error('copy test failure'); } },
    { afterPackage: () => { throw new Error('after package failure'); } },
    { writePointer: () => { throw new Error('pointer failure'); } },
    { writeMetadata: () => { throw new Error('metadata failure'); } },
    { afterVersionWritten: () => { throw new Error('version failure'); } },
    { afterProvenanceComputed: () => { throw new Error('provenance boundary failure'); } }
  ];
  for (const transactionHooks of cases) {
    const clientRoot = makeClient();
    try {
      const before = snapshotTree(clientRoot);
      await assert.rejects(runMain(clientRoot, ['--yes'], { transactionHooks }), /failure/);
      assert.deepEqual(snapshotTree(clientRoot), before);
    } finally { cleanup(clientRoot); }
  }
});

test('upgrade writes the tracked version and is idempotent when it is already correct', async () => {
  const clientRoot = makeClient();
  try {
    await runMain(clientRoot);
    const versionPath = path.join(clientRoot, '.atelier-kit-version');
    assert.equal(fs.readFileSync(versionPath, 'utf8'), 'v0.4.0\n');
    const before = snapshotTree(clientRoot);
    const output = await runMain(clientRoot);
    assert.match(output, /Already up to date\./);
    assert.deepEqual(snapshotTree(clientRoot), before);
  } finally { cleanup(clientRoot); }
});

test('tracked version is restored when a later transactional write fails', async () => {
  const clientRoot = makeClient();
  try {
    fs.writeFileSync(path.join(clientRoot, '.atelier-kit-version'), 'v0.3.0\n');
    const before = snapshotTree(clientRoot);
    await assert.rejects(runMain(clientRoot, ['--yes'], { transactionHooks: {
      afterVersionWritten: () => { throw new Error('failure after tracked version write'); }
    } }), /failure after tracked version write/);
    assert.deepEqual(snapshotTree(clientRoot), before);
  } finally { cleanup(clientRoot); }
});

test('obsolete managed-test removal failure restores the entire client', async () => {
  const clientRoot = makeClient();
  const rel = 'src/lib/obsolete.test.js';
  try {
    fs.mkdirSync(path.dirname(path.join(clientRoot, rel)), { recursive: true });
    fs.writeFileSync(path.join(clientRoot, rel), '// proven old managed test\n');
    const hash = crypto.createHash('sha256').update(fs.readFileSync(path.join(clientRoot, rel))).digest('hex');
    fs.writeFileSync(path.join(clientRoot, '.atelier-kit-upgrade.json'), `${JSON.stringify({ managedTests: { [rel]: hash } }, null, 2)}\n`);
    const before = snapshotTree(clientRoot);
    await assert.rejects(runMain(clientRoot, ['--yes'], { transactionHooks: {
      beforeRemove: (/** @type {string} */ candidate) => { if (candidate === rel) throw new Error('remove test failure'); }
    } }), /remove test failure/);
    assert.deepEqual(snapshotTree(clientRoot), before);
  } finally { cleanup(clientRoot); }
});

test('final managed provenance is derived after copying from exact client bytes', async () => {
  const clientRoot = makeClient();
  const rel = 'src/lib/editorial-markup.test.js';
  const target = path.join(clientRoot, rel);
  try {
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, '// historical managed bytes\n');
    const oldHash = crypto.createHash('sha256').update(fs.readFileSync(target)).digest('hex');
    fs.writeFileSync(path.join(clientRoot, '.atelier-kit-upgrade.json'), `${JSON.stringify({ managedTests: { [rel]: oldHash } }, null, 2)}\n`);
    const changed = '// changed at the last mutation boundary\n';
    await runMain(clientRoot, ['--yes'], { transactionHooks: {
      afterProvenanceComputed: () => fs.writeFileSync(target, changed)
    } });
    const manifest = JSON.parse(fs.readFileSync(path.join(clientRoot, '.atelier-kit-upgrade.json'), 'utf8'));
    const kitHash = crypto.createHash('sha256').update(fs.readFileSync(path.join(kitRoot, rel))).digest('hex');
    assert.equal(fs.readFileSync(target, 'utf8'), changed);
    assert.equal(manifest.managedTests[rel], undefined);
    assert.ok(!Object.values(manifest.managedTests).includes(kitHash));
    const beforeSecond = snapshotTree(clientRoot);
    const second = await runMain(clientRoot);
    assert.match(second, /client test differs from the recorded managed baseline; preserved/);
    assert.deepEqual(snapshotTree(clientRoot), beforeSecond);
  } finally { cleanup(clientRoot); }
});

test('writeMetadata mutation precedes final provenance and remains unmanaged on a second upgrade', async () => {
  const clientRoot = makeClient();
  const rel = 'src/lib/editorial-markup.test.js';
  const target = path.join(clientRoot, rel);
  try {
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.copyFileSync(path.join(kitRoot, rel), target);
    const managedHash = crypto.createHash('sha256').update(fs.readFileSync(target)).digest('hex');
    fs.writeFileSync(path.join(clientRoot, '.atelier-kit-upgrade.json'), `${JSON.stringify({ managedTests: { [rel]: managedHash } }, null, 2)}\n`);
    const changed = '// changed by the pre-final writeMetadata hook\n';
    await runMain(clientRoot, ['--yes'], { transactionHooks: {
      writeMetadata: () => fs.writeFileSync(target, changed)
    } });
    const manifest = JSON.parse(fs.readFileSync(path.join(clientRoot, '.atelier-kit-upgrade.json'), 'utf8'));
    const kitHash = crypto.createHash('sha256').update(fs.readFileSync(path.join(kitRoot, rel))).digest('hex');
    assert.equal(fs.readFileSync(target, 'utf8'), changed);
    assert.equal(manifest.managedTests[rel], undefined);
    assert.ok(!Object.values(manifest.managedTests).includes(kitHash));
    await runMain(clientRoot);
    assert.equal(fs.readFileSync(target, 'utf8'), changed);
  } finally { cleanup(clientRoot); }
});

test('writeMetadata manifest symlink is rejected without touching its target or leaving metadata temporary files', async (t) => {
  const clientRoot = makeClient();
  const metadata = path.join(clientRoot, '.atelier-kit-upgrade.json');
  const external = path.join(os.tmpdir(), `atelier-kit-metadata-sentinel-${process.pid}-${Date.now()}`);
  try {
    fs.writeFileSync(metadata, '{"managedTests":{}}\n');
    fs.chmodSync(metadata, 0o640);
    fs.writeFileSync(external, 'external sentinel bytes\n');
    fs.chmodSync(external, 0o604);
    const before = snapshotTree(clientRoot);
    const sentinelBytes = fs.readFileSync(external);
    const sentinelMode = fs.statSync(external).mode & 0o7777;
    await assert.rejects(runMain(clientRoot, ['--yes'], { transactionHooks: {
      writeMetadata: () => {
        fs.rmSync(metadata);
        fs.symlinkSync(external, metadata);
      }
    } }), /symbolic link/);
    assert.deepEqual(fs.readFileSync(external), sentinelBytes);
    assert.equal(fs.statSync(external).mode & 0o7777, sentinelMode);
    assert.deepEqual(snapshotTree(clientRoot), before);
    assert.deepEqual(
      fs.readdirSync(clientRoot).filter((entry) => entry.startsWith('.atelier-kit-upgrade.json.') && entry.endsWith('.tmp')),
      []
    );
  } catch (error) {
    if (/** @type {NodeJS.ErrnoException} */ (error).code === 'EPERM') t.skip('symlinks unavailable');
    else throw error;
  } finally { cleanup(clientRoot); fs.rmSync(external, { force: true }); }
});

test('normal managed provenance equals final client and current Kit SHA-256', async () => {
  const clientRoot = makeClient();
  const rel = 'src/lib/editorial-markup.test.js';
  try {
    await runMain(clientRoot);
    const clientHash = crypto.createHash('sha256').update(fs.readFileSync(path.join(clientRoot, rel))).digest('hex');
    const kitHash = crypto.createHash('sha256').update(fs.readFileSync(path.join(kitRoot, rel))).digest('hex');
    const manifest = JSON.parse(fs.readFileSync(path.join(clientRoot, '.atelier-kit-upgrade.json'), 'utf8'));
    assert.equal(manifest.managedTests[rel], clientHash);
    assert.equal(clientHash, kitHash);
    assert.deepEqual(deriveManagedTestsFromClient(clientRoot, kitRoot), manifest.managedTests);
  } finally { cleanup(clientRoot); }
});

test('rollback failure is surfaced as AggregateError with both causes', async () => {
  const clientRoot = makeClient();
  try {
    await assert.rejects(
      runMain(clientRoot, ['--yes'], { transactionHooks: {
        afterFilesApplied: () => { throw new Error('original upgrade failure'); },
        beforeRollbackRestore: () => { throw new Error('rollback restoration failure'); }
      } }),
      (error) => {
        assert.ok(error instanceof AggregateError);
        assert.match(error.message, /rollback was incomplete/);
        assert.deepEqual(error.errors.map((entry) => entry.message), [
          'original upgrade failure', 'rollback restoration failure'
        ]);
        return true;
      }
    );
  } finally { cleanup(clientRoot); }
});

test('late failure restores additions, updates, removals, modes, symlinks, preserved and protected paths', async (t) => {
  const clientRoot = makeClient();
  const obsolete = 'src/lib/obsolete.test.js';
  try {
    fs.mkdirSync(path.join(clientRoot, 'scripts'), { recursive: true });
    fs.mkdirSync(path.join(clientRoot, 'src/lib'), { recursive: true });
    fs.writeFileSync(path.join(clientRoot, 'scripts/run-tests.js'), '// old runner\n');
    fs.chmodSync(path.join(clientRoot, 'scripts/run-tests.js'), 0o640);
    fs.writeFileSync(path.join(clientRoot, 'src/lib/about-config.js'), '// old managed source\n');
    fs.chmodSync(path.join(clientRoot, 'src/lib/about-config.js'), 0o600);
    fs.writeFileSync(path.join(clientRoot, obsolete), '// obsolete managed test\n');
    fs.chmodSync(path.join(clientRoot, obsolete), 0o604);
    const obsoleteHash = crypto.createHash('sha256').update(fs.readFileSync(path.join(clientRoot, obsolete))).digest('hex');
    fs.writeFileSync(path.join(clientRoot, '.atelier-kit-upgrade.json'), `${JSON.stringify({ managedTests: { [obsolete]: obsoleteHash } }, null, 2)}\n`);
    fs.writeFileSync(path.join(clientRoot, '.atelier-kit-preserve'), 'src/lib/preserved-client.js\n');
    fs.writeFileSync(path.join(clientRoot, 'src/lib/preserved-client.js'), '// preserved\n');
    fs.writeFileSync(path.join(clientRoot, 'config/protected.txt'), 'protected\n');
    fs.writeFileSync(path.join(clientRoot, 'package-lock.json'), '{"lockfileVersion":3,"client":"unchanged"}\n');
    fs.chmodSync(path.join(clientRoot, 'package-lock.json'), 0o640);
    const artifactTarget = path.join(clientRoot, artifact);
    const identityTarget = path.join(clientRoot, identity);
    fs.mkdirSync(path.dirname(artifactTarget), { recursive: true });
    fs.writeFileSync(artifactTarget, 'old artifact bytes');
    fs.writeFileSync(identityTarget, '{"old":true}\n');
    fs.chmodSync(artifactTarget, 0o600);
    fs.chmodSync(identityTarget, 0o604);
    const before = snapshotTree(clientRoot);
    await assert.rejects(runMain(clientRoot, ['--yes'], { transactionHooks: {
      afterProvenanceComputed: () => { throw new Error('late transaction failure'); }
    } }), /late transaction failure/);
    assert.deepEqual(snapshotTree(clientRoot), before);
  } finally { cleanup(clientRoot); }
});

test('every historical test command migrates end-to-end and remains stable', async () => {
  for (const command of HISTORICAL_TEST_COMMANDS) {
    const clientRoot = makeClient();
    try {
      const packagePath = path.join(clientRoot, 'package.json');
      const pkg = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
      pkg.scripts.test = command;
      fs.writeFileSync(packagePath, `${JSON.stringify(pkg, null, 2)}\n`);
      await runMain(clientRoot);
      assert.equal(JSON.parse(fs.readFileSync(packagePath, 'utf8')).scripts.test, 'node scripts/run-tests.js', command);
      const beforeSecond = snapshotTree(clientRoot);
      await runMain(clientRoot);
      assert.deepEqual(snapshotTree(clientRoot), beforeSecond, command);
    } finally { cleanup(clientRoot); }
  }
});

test('missing, normalized historical, and near-match test commands behave end-to-end', async () => {
  const cases = [
    { command: undefined, expected: 'node scripts/run-tests.js' },
    { command: `  ${[...HISTORICAL_TEST_COMMANDS][0].replaceAll(' ', '  ')}  `, expected: 'node scripts/run-tests.js' },
    { command: 'node --test src/client-owned.test.js', expected: 'node --test src/client-owned.test.js' },
    { command: 'node --test src/lib/site-branding.test.js --watch', expected: 'node --test src/lib/site-branding.test.js --watch' },
    { command: 'node --test src/lib/site-branding-renamed.test.js', expected: 'node --test src/lib/site-branding-renamed.test.js' },
    { command: 'node --test src/lib/site-branding.test.js && echo done', expected: 'node --test src/lib/site-branding.test.js && echo done' },
    { command: 'node --test src/lib/site-branding.test.js src/lib/editorial-markup.test.js', expected: 'node --test src/lib/site-branding.test.js src/lib/editorial-markup.test.js' }
  ];
  for (const { command, expected } of cases) {
    const clientRoot = makeClient();
    try {
      const packagePath = path.join(clientRoot, 'package.json');
      const pkg = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
      if (command !== undefined) pkg.scripts.test = command;
      fs.writeFileSync(packagePath, `${JSON.stringify(pkg, null, 2)}\n`);
      await runMain(clientRoot);
      assert.equal(JSON.parse(fs.readFileSync(packagePath, 'utf8')).scripts.test, expected);
    } finally { cleanup(clientRoot); }
  }
});

test('malformed and prototype-style metadata cannot authorize test mutation', async () => {
  const clientRoot = makeClient();
  const conflict = 'src/lib/about-config.test.js';
  const obsolete = 'src/lib/obsolete-client.test.js';
  const outside = path.join(path.dirname(clientRoot), `${path.basename(clientRoot)}-outside.test.js`);
  try {
    fs.mkdirSync(path.join(clientRoot, 'src/lib'), { recursive: true });
    fs.writeFileSync(path.join(clientRoot, conflict), '// client conflict\n');
    fs.writeFileSync(path.join(clientRoot, obsolete), '// obsolete client test\n');
    fs.writeFileSync(outside, '// outside sentinel\n');
    const entries = Object.create(null);
    Object.assign(entries, {
      [conflict]: 'bad-hash',
      [obsolete]: 'a'.repeat(63),
      'src/lib/partial.test.js': null,
      '/src/lib/absolute.test.js': 'a'.repeat(64),
      'C:\\src\\lib\\drive.test.js': 'a'.repeat(64),
      '\\\\server\\share\\unc.test.js': 'a'.repeat(64),
      '../outside.test.js': 'a'.repeat(64),
      'src/lib/x/../../embedded.test.js': 'a'.repeat(64),
      'src/lib/nul.test.js\0tail': 'a'.repeat(64),
      constructor: 'a'.repeat(64),
      prototype: 'a'.repeat(64)
    });
    entries.__proto__ = 'a'.repeat(64);
    fs.writeFileSync(path.join(clientRoot, '.atelier-kit-upgrade.json'), JSON.stringify({ managedTests: entries }));
    await runMain(clientRoot);
    assert.equal(fs.readFileSync(path.join(clientRoot, conflict), 'utf8'), '// client conflict\n');
    assert.equal(fs.readFileSync(path.join(clientRoot, obsolete), 'utf8'), '// obsolete client test\n');
    assert.equal(fs.readFileSync(outside, 'utf8'), '// outside sentinel\n');
    const finalEntries = JSON.parse(fs.readFileSync(path.join(clientRoot, '.atelier-kit-upgrade.json'), 'utf8')).managedTests;
    assert.equal(finalEntries[conflict], undefined);
    assert.equal(finalEntries[obsolete], undefined);
    for (const key of Object.keys(entries)) assert.equal(Object.hasOwn(finalEntries, key), false, key);
  } finally { cleanup(clientRoot); fs.rmSync(outside, { force: true }); }
});

test('safe Windows baseline canonicalizes while conflicting duplicates have no authority', () => {
  const safe = makeClient();
  const conflict = makeClient();
  const rel = 'src/lib/about-config.test.js';
  try {
    for (const root of [safe, conflict]) fs.mkdirSync(path.join(root, 'src/lib'), { recursive: true });
    fs.writeFileSync(path.join(safe, rel), '// safe baseline\n');
    const safeHash = crypto.createHash('sha256').update(fs.readFileSync(path.join(safe, rel))).digest('hex');
    fs.writeFileSync(path.join(safe, '.atelier-kit-upgrade.json'), JSON.stringify({ managedTests: { 'src\\lib\\about-config.test.js': safeHash } }));
    assert.ok(buildFilePlan(kitRoot, safe, new Set()).update.includes(rel));

    fs.writeFileSync(path.join(conflict, rel), '// conflicting baseline\n');
    const actual = crypto.createHash('sha256').update(fs.readFileSync(path.join(conflict, rel))).digest('hex');
    fs.writeFileSync(path.join(conflict, '.atelier-kit-upgrade.json'), JSON.stringify({ managedTests: {
      './src/lib/about-config.test.js': actual,
      'src\\lib\\about-config.test.js': 'f'.repeat(64)
    } }));
    const plan = buildFilePlan(kitRoot, conflict, new Set());
    assert.ok(plan.manualReview.includes(rel));
    assert.ok(!plan.update.includes(rel));
  } finally { cleanup(safe); cleanup(conflict); }
});

test('a preserved managed-test symlink is rejected without following it', async (t) => {
  const clientRoot = makeClient();
  const rel = 'src/lib/editorial-markup.test.js';
  const outside = path.join(path.dirname(clientRoot), `${path.basename(clientRoot)}-symlink-target.test.js`);
  try {
    fs.mkdirSync(path.dirname(path.join(clientRoot, rel)), { recursive: true });
    fs.writeFileSync(outside, '// external client bytes\n');
    try { fs.symlinkSync(outside, path.join(clientRoot, rel)); } catch (error) {
      t.skip(`symlinks unavailable: ${error instanceof Error ? error.message : error}`);
      return;
    }
    fs.writeFileSync(path.join(clientRoot, '.atelier-kit-preserve'), `${rel}\n`);
    const before = snapshotTree(clientRoot);
    await assert.rejects(runMain(clientRoot), /symbolic link/);
    assert.equal(fs.lstatSync(path.join(clientRoot, rel)).isSymbolicLink(), true);
    assert.equal(fs.readFileSync(outside, 'utf8'), '// external client bytes\n');
    assert.deepEqual(snapshotTree(clientRoot), before);
  } finally { cleanup(clientRoot); fs.rmSync(outside, { force: true }); }
});

test('descriptor provenance hashing refuses deterministic pathname replacement and closes its descriptor', (t) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'atelier-kit-hash-race-'));
  const candidate = path.join(root, 'candidate.test.js');
  const outside = path.join(root, 'outside.txt');
  try {
    fs.writeFileSync(candidate, 'managed bytes\n');
    fs.writeFileSync(outside, 'external secret\n');
    assert.equal(hashRegularFileNoFollow(candidate), crypto.createHash('sha256').update('managed bytes\n').digest('hex'));
    for (const failingHook of [
      { fstat: () => { throw new Error('injected fstat failure'); } },
      { read: () => { throw new Error('injected read failure'); } }
    ]) {
      let failureClosed = 0;
      assert.throws(() => hashRegularFileNoFollow(candidate, {
        ...failingHook,
        close: (descriptor) => { failureClosed += 1; fs.closeSync(descriptor); }
      }), /injected (fstat|read) failure/);
      assert.equal(failureClosed, 1);
    }
    let closed = 0;
    assert.throws(() => hashRegularFileNoFollow(candidate, {
      afterPathValidated: () => { fs.rmSync(candidate); fs.symlinkSync(outside, candidate); },
      close: (descriptor) => { closed += 1; fs.closeSync(descriptor); }
    }), /ELOOP|changed|regular file/);
    assert.equal(closed, process.platform === 'win32' ? 1 : 0);
    assert.equal(fs.readFileSync(outside, 'utf8'), 'external secret\n');
    fs.rmSync(candidate);
    fs.mkdirSync(candidate);
    assert.throws(() => hashRegularFileNoFollow(candidate), /regular file/);
  } catch (error) {
    if (/** @type {NodeJS.ErrnoException} */ (error).code === 'EPERM') t.skip('symlinks unavailable');
    else throw error;
  } finally { cleanup(root); }
});

test('final provenance pathname race aborts and rolls back without hashing the symlink target', async (t) => {
  const clientRoot = makeClient();
  const rel = 'src/lib/editorial-markup.test.js';
  const candidate = path.join(clientRoot, rel);
  const outside = path.join(path.dirname(clientRoot), `${path.basename(clientRoot)}-race-target`);
  try {
    fs.writeFileSync(outside, 'external secret that must not be managed\n');
    const before = snapshotTree(clientRoot);
    let replaced = false;
    await assert.rejects(runMain(clientRoot, ['--yes'], { transactionHooks: {
      provenanceHashHooks: { afterPathValidated: (/** @type {string} */ filePath) => {
        if (!replaced && filePath === candidate) {
          replaced = true;
          fs.rmSync(filePath);
          fs.symlinkSync(outside, filePath);
        }
      } }
    } }), /ELOOP|changed|regular file/);
    assert.equal(replaced, true);
    assert.deepEqual(snapshotTree(clientRoot), before);
    assert.equal(fs.readFileSync(outside, 'utf8'), 'external secret that must not be managed\n');
  } catch (error) {
    if (/** @type {NodeJS.ErrnoException} */ (error).code === 'EPERM') t.skip('symlinks unavailable');
    else throw error;
  } finally { cleanup(clientRoot); fs.rmSync(outside, { force: true }); }
});

test('new client parent replaced by a symlink in a failure hook is removed during rollback', async (t) => {
  const clientRoot = makeClient();
  const external = fs.mkdtempSync(path.join(os.tmpdir(), 'atelier-kit-rollback-external-'));
  try {
    fs.writeFileSync(path.join(external, 'sentinel'), 'unchanged\n');
    const before = snapshotTree(clientRoot);
    const externalBefore = snapshotTree(external);
    let injected = false;
    await assert.rejects(runMain(clientRoot, ['--yes'], { transactionHooks: {
      beforeCopy: () => {
        if (injected) return;
        injected = true;
        fs.symlinkSync(external, path.join(clientRoot, 'src'));
      }
    } }), /symbolic link/);
    assert.deepEqual(snapshotTree(clientRoot), before);
    assert.deepEqual(snapshotTree(external), externalBefore);
  } catch (error) {
    if (/** @type {NodeJS.ErrnoException} */ (error).code === 'EPERM') t.skip('symlinks unavailable');
    else throw error;
  } finally { cleanup(clientRoot); cleanup(external); }
});

test('unsafe client namespaces fail preflight and dry-run without external or client mutation', async (t) => {
  const cases = [
    { rel: 'src', directory: true },
    { rel: 'scripts', directory: true },
    { rel: 'vendor', directory: true },
    { rel: '.atelier-kit-upgrade.json', directory: false },
    { rel: '.atelier-kit-version', directory: false },
    { rel: '.atelier-kit-source', directory: false },
    { rel: 'src/lib', directory: true },
    { rel: 'config/protected-parent', directory: true },
    { rel: 'static/images/site', directory: true }
  ];
  for (const { rel, directory } of cases) {
    const clientRoot = makeClient();
    const external = fs.mkdtempSync(path.join(os.tmpdir(), 'atelier-kit-external-'));
    try {
      fs.writeFileSync(path.join(external, 'sentinel'), 'unchanged\n');
      const target = path.join(clientRoot, rel);
      fs.mkdirSync(path.dirname(target), { recursive: true });
      if (!directory) fs.writeFileSync(path.join(external, 'target'), 'external file\n');
      try { fs.symlinkSync(directory ? external : path.join(external, 'target'), target, directory ? 'dir' : 'file'); }
      catch (error) { t.skip(`symlinks unavailable: ${error instanceof Error ? error.message : error}`); return; }
      const clientBefore = snapshotTree(clientRoot);
      const externalBefore = snapshotTree(external);
      await assert.rejects(runMain(clientRoot), /symbolic link/);
      assert.deepEqual(snapshotTree(clientRoot), clientBefore, rel);
      assert.deepEqual(snapshotTree(external), externalBefore, rel);
      await assert.rejects(runMain(clientRoot, ['--dry-run']), /symbolic link/);
      assert.deepEqual(snapshotTree(clientRoot), clientBefore, `${rel} dry-run`);
      assert.deepEqual(snapshotTree(external), externalBefore, `${rel} dry-run`);
    } finally { cleanup(clientRoot); cleanup(external); }
  }
});
