import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

import {
  TEST_RUNNER_ARGUMENTS,
  discoverTests,
  runTests
} from '../scripts/run-tests.js';

const EXPECTED_TEST_RUNNER_ARGUMENTS = Object.freeze([
  '--test',
  '--test-concurrency=1'
]);

/** @param {import('node:test').TestContext} t @param {string} prefix */
function createFixture(t, prefix) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), prefix));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  return root;
}

function runnerArgumentBytes() {
  return [process.execPath, ...EXPECTED_TEST_RUNNER_ARGUMENTS]
    .reduce((total, argument) => total + Buffer.byteLength(argument) + 1, 0);
}

test('runner serializes batches with the Node test concurrency flag and preserves every path', (t) => {
  const root = createFixture(t, 'atelier-run-tests-serialization-');
  const names = ['01-alpha.test.js', '02-bravo.test.js', '03-charlie.test.js'];
  for (const name of names) {
    const target = path.join(root, 'src', 'lib', name);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, '');
  }

  const expectedPaths = discoverTests(root).map((testPath) => path.join(...testPath.split('/')));
  const maxArgumentBytes = runnerArgumentBytes()
    + Math.max(...expectedPaths.map((testPath) => Buffer.byteLength(testPath) + 1));
  /** @type {Array<{
   * command: string,
   * args: string[],
   * options: { cwd: string, stdio: 'inherit', shell: false }
   * }>} */
  const calls = [];
  /** @type {string[]} */
  const events = [];
  let active = 0;

  const status = runTests(root, (command, args, options) => {
    assert.equal(active, 0, 'a later batch must not begin before its predecessor returns');
    active += 1;
    events.push(`start-${calls.length}`);
    calls.push({ command, args, options });
    events.push(`finish-${calls.length - 1}`);
    active -= 1;
    return { status: 0, signal: null };
  }, maxArgumentBytes);

  assert.equal(status, 0);
  assert.deepEqual(TEST_RUNNER_ARGUMENTS, EXPECTED_TEST_RUNNER_ARGUMENTS);
  assert.ok(calls.length > 1, 'the fixture must exercise multiple batches');
  assert.deepEqual(
    calls.map(({ args }) => args.slice(0, 2)),
    calls.map(() => EXPECTED_TEST_RUNNER_ARGUMENTS)
  );
  assert.deepEqual(calls.flatMap(({ args }) => args.slice(2)), expectedPaths);
  assert.deepEqual(
    events,
    calls.flatMap((_, index) => [`start-${index}`, `finish-${index}`])
  );
  for (const { command, options } of calls) {
    assert.equal(command, process.execPath);
    assert.equal(options.cwd, root);
    assert.equal(options.shell, false);
  }
});

test('runner propagates a non-zero batch status without launching later batches', (t) => {
  const root = createFixture(t, 'atelier-run-tests-failure-');
  for (const name of ['01-alpha.test.js', '02-bravo.test.js']) {
    const target = path.join(root, 'test', name);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, '');
  }

  const paths = discoverTests(root).map((testPath) => path.join(...testPath.split('/')));
  const maxArgumentBytes = runnerArgumentBytes()
    + Math.max(...paths.map((testPath) => Buffer.byteLength(testPath) + 1));
  let calls = 0;
  const status = runTests(root, (_command, args) => {
    calls += 1;
    assert.deepEqual(args.slice(0, 2), EXPECTED_TEST_RUNNER_ARGUMENTS);
    return { status: 9, signal: null };
  }, maxArgumentBytes);

  assert.equal(status, 9);
  assert.equal(calls, 1);
});
