import assert from 'node:assert/strict';
import test from 'node:test';
import { runPublish } from '../scripts/publish.js';

/**
 * @param {string} key
 * @param {Record<string, string>} [values]
 */
const t = (key, values = {}) => {
  if (key === 'publish.vercelCliMissing') {
    return `missing ${values.path}`;
  }

  return key;
};

/**
 * @typedef {{
 *   argv?: string[],
 *   root?: string,
 *   platform?: NodeJS.Platform,
 *   env?: NodeJS.ProcessEnv,
 *   fileExists?: (filePath: string) => boolean,
 *   statuses?: number[]
 * }} HarnessOptions
 */

/**
 * @typedef {{
 *   command: string,
 *   args: string[],
 *   options: {
 *     cwd: string,
 *     stdio: 'inherit',
 *     shell: false,
 *     env?: NodeJS.ProcessEnv
 *   }
 * }} CommandCall
 */

/**
 * @param {HarnessOptions} [options]
 */
function runHarness(options = {}) {
  /** @type {CommandCall[]} */
  const calls = [];
  /** @type {string[]} */
  const stdout = [];
  /** @type {string[]} */
  const stderr = [];
  const statuses = [...(options.statuses || [])];

  const status = runPublish({
    argv: options.argv || [],
    root: options.root || '/repo',
    platform: options.platform || 'linux',
    env: options.env || {},
    fileExists: options.fileExists || (() => true),
    translator: () => t,
    locale: 'en',
    stdout: (line) => stdout.push(line),
    stderr: (line) => stderr.push(line),
    spawn: (command, args, spawnOptions) => {
      calls.push({
        command,
        args,
        options: spawnOptions
      });

      return {
        status: statuses.length > 0 ? statuses.shift() ?? 0 : 0
      };
    }
  });

  return {
    status,
    calls,
    stdout,
    stderr
  };
}

test('publish prep without --deploy preserves validation doctor check build order', () => {
  const result = runHarness();

  assert.equal(result.status, 0);
  assert.deepEqual(
    result.calls.map((call) => [call.command, call.args]),
    [
      ['npm', ['run', 'content:validate']],
      ['npm', ['run', 'content:doctor']],
      ['npm', ['run', 'check']],
      ['npm', ['run', 'build']]
    ]
  );

  assert.equal(
    result.calls.some(
      (call) => call.command === 'npx' || call.command.includes('vercel')
    ),
    false
  );

  assert.equal(result.stdout.includes('publish.deployHint'), true);
});

test('deploy uses only the local Vercel executable', () => {
  const result = runHarness({
    argv: ['--deploy']
  });

  assert.equal(result.status, 0);

  assert.deepEqual(result.calls.at(-1), {
    command: '/repo/node_modules/.bin/vercel',
    args: ['--prod'],
    options: {
      cwd: '/repo',
      stdio: 'inherit',
      shell: false,
      env: {}
    }
  });

  assert.equal(
    result.calls.some((call) => call.command === 'npx'),
    false
  );
});

test('missing local Vercel executable fails closed without npx or global fallback', () => {
  const result = runHarness({
    argv: ['--deploy'],
    fileExists: () => false
  });

  assert.equal(result.status, 1);
  assert.equal(result.calls.length, 4);

  assert.equal(
    result.calls.some(
      (call) => call.command === 'npx' || call.command.includes('vercel')
    ),
    false
  );

  assert.deepEqual(
    result.stderr,
    ['missing /repo/node_modules/.bin/vercel']
  );
});

test('failed preparation step stops before later steps and deploy', () => {
  const result = runHarness({
    argv: ['--deploy'],
    statuses: [0, 2]
  });

  assert.equal(result.status, 2);

  assert.deepEqual(
    result.calls.map((call) => [call.command, call.args]),
    [
      ['npm', ['run', 'content:validate']],
      ['npm', ['run', 'content:doctor']]
    ]
  );
});
