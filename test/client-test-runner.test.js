import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import { batchTests, discoverTests, normalizeTestPath, runTests } from '../scripts/run-tests.js';

const kitRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const childEnv = { ...process.env };
delete childEnv.NODE_TEST_CONTEXT;

test('discovery uses only intentional roots, excludes artifacts and sorts by code unit', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'atelier-tests-'));
  try {
    for (const relative of [
      'z.test.js', 'src/z space.test.js', 'src/A.test.js', 'src/é.test.js', 'src/lib/nested.test.js', 'test/b.test.js',
      '.cache/no.test.js', 'fixtures/no.test.js', 'vendor/no.test.js', 'backup/no.test.js',
      'src/node_modules/no.test.js', 'src/build/no.test.js', 'src/dist/no.test.js', 'src/content/no.test.js',
      'src/static/no.test.js', 'src/data/no.test.js', 'src/.hidden/no.test.js',
      'src/coverage/no.test.js', 'src/.svelte-kit/no.test.js', 'src/fixtures/no.test.js',
      'scripts/no.test.js', 'unrelated/no.test.js', 'src/not-test.js'
    ]) {
      const target = path.join(root, relative);
      fs.mkdirSync(path.dirname(target), { recursive: true });
      fs.writeFileSync(target, '');
    }
    assert.deepEqual(discoverTests(root), [
      'src/A.test.js', 'src/lib/nested.test.js', 'src/z space.test.js', 'src/é.test.js', 'test/b.test.js'
    ]);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('missing roots are an explicit successful no-tests result', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'atelier-no-tests-'));
  try { assert.equal(runTests(root), 0); } finally { fs.rmSync(root, { recursive: true, force: true }); }
});

test('runner executes passing and failing tests, including paths with spaces', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'atelier-run-tests-'));
  try {
    const passing = path.join(root, 'src', 'space name.test.js');
    fs.mkdirSync(path.dirname(passing), { recursive: true });
    fs.writeFileSync(passing, "import test from 'node:test'; test('pass', () => {});\n");
    let result = spawnSync(process.execPath, [path.join(kitRoot, 'scripts/run-tests.js')], { cwd: root, encoding: 'utf8', env: childEnv });
    assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
    fs.writeFileSync(passing, "import test from 'node:test'; test('fail', () => { throw new Error('expected'); });\n");
    result = spawnSync(process.execPath, [path.join(kitRoot, 'scripts/run-tests.js')], { cwd: root, encoding: 'utf8', env: childEnv });
    assert.notEqual(result.status, 0);
  } finally { fs.rmSync(root, { recursive: true, force: true }); }
});

test('runner reports spawn errors and signals as failures', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'atelier-run-errors-'));
  try {
    fs.mkdirSync(path.join(root, 'src'));
    fs.writeFileSync(path.join(root, 'src/a.test.js'), '');
    assert.equal(runTests(root, () => ({ error: new Error('spawn failed'), status: null, signal: null })), 1);
    assert.equal(runTests(root, () => ({ status: null, signal: 'SIGTERM' })), 1);
  } finally { fs.rmSync(root, { recursive: true, force: true }); }
});

test('bounded batching is deterministic and stops after the first failing batch', () => {
  const paths = Array.from({ length: 20 }, (_, index) => `src/lib/${String(index).padStart(2, '0')}-${'x'.repeat(40)}.test.js`);
  const batches = batchTests(paths, 180);
  assert.ok(batches.length > 1);
  assert.deepEqual(batches.flat(), paths);
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'atelier-batches-'));
  try {
    for (const rel of paths) { fs.mkdirSync(path.dirname(path.join(root, rel)), { recursive: true }); fs.writeFileSync(path.join(root, rel), ''); }
    let calls = 0;
    const status = runTests(root, (_command, _args, options) => {
      calls += 1;
      assert.equal(options.cwd, root);
      assert.equal(options.shell, false);
      return { status: calls === 2 ? 7 : 0, signal: null };
    }, 180);
    assert.equal(status, 7);
    assert.equal(calls, 2);
  } finally { fs.rmSync(root, { recursive: true, force: true }); }
});

test('one argument larger than the nominal batch limit makes progress as one deterministic batch', () => {
  const oversized = `src/lib/${'x'.repeat(25 * 1024)}.test.js`;
  const following = 'src/lib/z.test.js';
  const batches = batchTests([oversized, following], 24 * 1024);
  assert.deepEqual(batches, [[oversized], [following]]);
  assert.deepEqual(batches.flat(), [oversized, following]);
  assert.ok(batches.every((batch) => batch.length > 0));
});

test('real runner executes mixed-case, spaced, and non-ASCII approved paths', (t) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'atelier-native-names-'));
  const names = ['MixedCase.test.js', 'space name.test.js', 'éclair.test.js'];
  try {
    fs.mkdirSync(path.join(root, 'src/lib'), { recursive: true });
    try {
      for (const [index, name] of names.entries()) {
        fs.writeFileSync(
          path.join(root, 'src/lib', name),
          `import fs from 'node:fs'; fs.writeFileSync(${JSON.stringify(path.join(root, `marker-${index}`))}, 'executed');\n`
        );
      }
    } catch (error) {
      if (/** @type {NodeJS.ErrnoException} */ (error).code === 'EINVAL') {
        t.skip(`filesystem cannot represent required names: ${error instanceof Error ? error.message : String(error)}`);
        return;
      }
      throw error;
    }
    const discovered = discoverTests(root);
    assert.deepEqual(discovered, names.map((name) => `src/lib/${name}`).sort((a, b) => a < b ? -1 : a > b ? 1 : 0));
    const result = spawnSync(process.execPath, [path.join(kitRoot, 'scripts/run-tests.js')], { cwd: root, encoding: 'utf8', env: childEnv });
    assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
    for (const index of names.keys()) assert.equal(fs.readFileSync(path.join(root, `marker-${index}`), 'utf8'), 'executed');
  } finally { fs.rmSync(root, { recursive: true, force: true }); }
});

test('a real test process terminated by signal is not reported as success', { skip: process.platform === 'win32' }, () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'atelier-run-signal-'));
  try {
    fs.mkdirSync(path.join(root, 'src'));
    fs.writeFileSync(path.join(root, 'src/signal.test.js'), "process.kill(process.pid, 'SIGTERM');\n");
    const result = spawnSync(process.execPath, [path.join(kitRoot, 'scripts/run-tests.js')], {
      cwd: root,
      encoding: 'utf8',
      env: childEnv
    });
    assert.notEqual(result.status, 0, `${result.stdout}\n${result.stderr}`);
  } finally { fs.rmSync(root, { recursive: true, force: true }); }
});

test('symbolic links are not followed and separators normalize for reporting', (t) => {
  assert.equal(normalizeTestPath(`src${path.sep}nested${path.sep}a.test.js`), 'src/nested/a.test.js');
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'atelier-link-tests-'));
  const outside = fs.mkdtempSync(path.join(os.tmpdir(), 'atelier-link-outside-'));
  try {
    fs.mkdirSync(path.join(root, 'src'));
    fs.writeFileSync(path.join(outside, 'linked.test.js'), "throw new Error('must not run');\n");
    try { fs.symlinkSync(outside, path.join(root, 'src', 'linked'), 'dir'); } catch (error) {
      t.skip(`symbolic links unavailable: ${error instanceof Error ? error.message : error}`);
      return;
    }
    assert.deepEqual(discoverTests(root), []);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
    fs.rmSync(outside, { recursive: true, force: true });
  }
});

test('scaffold rejects a target inside the source directory without creating it', () => {
  const source = fs.mkdtempSync(path.join(os.tmpdir(), 'atelier-scaffold-source-'));
  const target = path.join(source, 'client');

  try {
    const result = spawnSync(
      process.execPath,
      [path.join(kitRoot, 'scripts/scaffold-client.js'), target, '--template', 'writing'],
      {
        cwd: source,
        encoding: 'utf8',
        env: childEnv
      }
    );

    const output = `${result.stdout}\n${result.stderr}`;

    assert.equal(result.status, 1, output);
    assert.match(
      output,
      /Target directory cannot be inside the Atelier-Kit source directory/
    );
    assert.equal(fs.existsSync(target), false);
  } finally {
    fs.rmSync(source, { recursive: true, force: true });
  }
});

test('fresh scaffold has a runnable test setup without Kit-only root tests', () => {
  const parent = fs.mkdtempSync(path.join(os.tmpdir(), 'atelier-scaffold-test-'));
  const source = path.join(parent, 'kit');
  const target = path.join(parent, 'client');
  try {
    fs.mkdirSync(path.join(source, 'scripts'), { recursive: true });
    fs.mkdirSync(path.join(source, 'src'), { recursive: true });
    fs.mkdirSync(path.join(source, 'test'), { recursive: true });
    fs.writeFileSync(path.join(source, 'package.json'), JSON.stringify({
      name: 'atelier-kit',
      private: true,
      type: 'module',
      version: '0.0.1',
      scripts: { test: 'node scripts/run-tests.js' }
    }));
    fs.writeFileSync(path.join(source, '.atelier-kit-version'), 'v9.9.9\n');
    fs.copyFileSync(path.join(kitRoot, 'scripts/run-tests.js'), path.join(source, 'scripts/run-tests.js'));
    fs.writeFileSync(path.join(source, 'src/managed.test.js'), "import test from 'node:test'; test('managed', () => {});\n");
    fs.writeFileSync(path.join(source, 'test/kit-only.test.js'), "throw new Error('must not be copied');\n");

    fs.mkdirSync(path.join(source, 'desktop/src-tauri/target/debug'), { recursive: true });
    fs.writeFileSync(
      path.join(source, 'desktop/src-tauri/target/debug/generated-artifact'),
      'must not be copied\n'
    );

    fs.mkdirSync(path.join(source, 'src/target'), { recursive: true });
    fs.writeFileSync(path.join(source, 'src/target/keep.txt'), 'must be copied\n');

    const unversionedOutputPath = path.join(parent, 'unversioned-output.txt');
    const unversionedOutputFd = fs.openSync(unversionedOutputPath, 'w');
    const unversioned = spawnSync(process.execPath, [path.join(kitRoot, 'scripts/scaffold-client.js'), target], {
      cwd: source,
      env: childEnv,
      stdio: ['ignore', unversionedOutputFd, unversionedOutputFd]
    });
    fs.closeSync(unversionedOutputFd);
    const unversionedOutput = fs.readFileSync(unversionedOutputPath, 'utf8');
    assert.equal(unversioned.status, 1, unversionedOutput);
    assert.match(unversionedOutput, /Could not detect the Atelier-Kit version/);

    fs.rmSync(target, { recursive: true, force: true });
    fs.writeFileSync(path.join(source, 'CHANGELOG.md'), '# Changelog\n\n## Unreleased\n\n## v0.4.1-rc.1+build.7\n');
    const scaffold = spawnSync(process.execPath, [path.join(kitRoot, 'scripts/scaffold-client.js'), target], {
      cwd: source,
      encoding: 'utf8',
      env: childEnv
    });
    assert.equal(scaffold.status, 0, `${scaffold.stdout}\n${scaffold.stderr}`);
    const packageJson = JSON.parse(fs.readFileSync(path.join(target, 'package.json'), 'utf8'));
    assert.equal(packageJson.scripts.test, 'node scripts/run-tests.js');
    assert.equal(fs.existsSync(path.join(target, 'scripts/run-tests.js')), true);
    assert.equal(fs.existsSync(path.join(target, 'test')), false);
    assert.equal(fs.existsSync(path.join(target, 'desktop/src-tauri/target')), false);
    assert.equal(
      fs.readFileSync(path.join(target, 'src/target/keep.txt'), 'utf8'),
      'must be copied\n'
    );
    assert.equal(fs.readFileSync(path.join(target, '.atelier-kit-version'), 'utf8'), 'v0.4.1-rc.1+build.7\n');
    assert.ok(discoverTests(target).some((file) => file.startsWith('src/') && file.endsWith('.test.js')));
    const clientTest = spawnSync(process.execPath, ['scripts/run-tests.js'], { cwd: target, encoding: 'utf8', env: childEnv });
    assert.equal(clientTest.status, 0, `${clientTest.stdout}\n${clientTest.stderr}`);
  } finally {
    fs.rmSync(parent, { recursive: true, force: true });
  }
});
