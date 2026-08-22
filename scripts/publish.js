#!/usr/bin/env node

import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import { createTranslator } from '../src/lib/i18n/index.js';
import { loadOperatorLocale } from '../src/lib/i18n/load-operator-locale.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

/**
 * @typedef {{
 *   status: number | null
 * }} CommandResult
 */

/**
 * @typedef {(
 *   command: string,
 *   args: string[],
 *   options: {
 *     cwd: string,
 *     stdio: 'inherit',
 *     shell: false,
 *     env?: NodeJS.ProcessEnv
 *   }
 * ) => CommandResult} SpawnCommand
 */

/**
 * @typedef {{
 *   command: string,
 *   args: string[]
 * }} VercelInvocation
 */

/**
 * @typedef {{
 *   ok: false,
 *   executable: string
 * } | {
 *   ok: true,
 *   executable: string,
 *   invocation: VercelInvocation
 * }} LocalVercelResolution
 */

/**
 * @param {string} root
 * @param {NodeJS.Platform} [platform]
 */
export function localVercelExecutable(root, platform = process.platform) {
  const pathApi = platform === 'win32' ? path.win32 : path;

  return pathApi.join(
    root,
    'node_modules',
    '.bin',
    platform === 'win32' ? 'vercel.cmd' : 'vercel'
  );
}

/**
 * @param {string} executable
 * @param {NodeJS.Platform} [platform]
 * @param {NodeJS.ProcessEnv} [env]
 * @returns {VercelInvocation}
 */
export function localVercelInvocation(
  executable,
  platform = process.platform,
  env = process.env
) {
  if (platform === 'win32') {
    return {
      command: env.ComSpec || 'cmd.exe',
      args: ['/d', '/s', '/c', executable, '--prod']
    };
  }

  return {
    command: executable,
    args: ['--prod']
  };
}

/**
 * @param {{
 *   root?: string,
 *   platform?: NodeJS.Platform,
 *   env?: NodeJS.ProcessEnv,
 *   fileExists?: (filePath: string) => boolean
 * }} [options]
 * @returns {LocalVercelResolution}
 */
export function resolveLocalVercelCli({
  root = ROOT,
  platform = process.platform,
  env = process.env,
  fileExists = fs.existsSync
} = {}) {
  const executable = localVercelExecutable(root, platform);

  if (!fileExists(executable)) {
    return {
      ok: false,
      executable
    };
  }

  return {
    ok: true,
    executable,
    invocation: localVercelInvocation(executable, platform, env)
  };
}

/**
 * @param {{
 *   argv?: string[],
 *   root?: string,
 *   spawn?: SpawnCommand,
 *   fileExists?: (filePath: string) => boolean,
 *   platform?: NodeJS.Platform,
 *   env?: NodeJS.ProcessEnv,
 *   locale?: string,
 *   translator?: (
 *     locale: string
 *   ) => (
 *     key: string,
 *     values?: Record<string, string>
 *   ) => string,
 *   stdout?: (message: string) => void,
 *   stderr?: (message: string) => void
 * }} [options]
 * @returns {number}
 */
export function runPublish({
  argv = process.argv.slice(2),
  root = ROOT,
  spawn = /** @type {SpawnCommand} */ (spawnSync),
  fileExists = fs.existsSync,
  platform = process.platform,
  env = process.env,
  locale = loadOperatorLocale(),
  translator = createTranslator,
  stdout = console.log,
  stderr = console.error
} = {}) {
  const deploy = argv.includes('--deploy');
  const strict = argv.includes('--strict');
  const t = translator(locale);

  /** @type {[string, string[]][]} */
  const steps = [
    [t('publish.stepValidation'), ['run', 'content:validate']],
    [
      t('publish.stepDoctor'),
      ['run', 'content:doctor', ...(strict ? ['--', '--strict'] : [])]
    ],
    [t('publish.stepCheck'), ['run', 'check']],
    [t('publish.stepBuild'), ['run', 'build']]
  ];

  /**
   * @param {string} label
   * @param {string[]} args
   */
  function runStep(label, args) {
    stdout(`\n→ ${label}`);

    const result = spawn('npm', args, {
      cwd: root,
      stdio: 'inherit',
      shell: false
    });

    return result.status === 0 ? 0 : (result.status ?? 1);
  }

  stdout(t('publish.title'));
  stdout(t('publish.intro'));

  for (const [label, args] of steps) {
    const status = runStep(label, args);
    if (status !== 0) return status;
  }

  if (deploy) {
    stdout(`\n→ ${t('publish.stepDeploy')}`);

    const localCli = resolveLocalVercelCli({
      root,
      platform,
      env,
      fileExists
    });

    if (!localCli.ok) {
      stderr(
        t('publish.vercelCliMissing', {
          path: localCli.executable
        })
      );
      return 1;
    }

    const result = spawn(
      localCli.invocation.command,
      localCli.invocation.args,
      {
        cwd: root,
        stdio: 'inherit',
        shell: false,
        env
      }
    );

    return result.status === 0 ? 0 : (result.status ?? 1);
  }

  stdout(`\n${t('publish.complete')}`);
  stdout(t('publish.previewHint'));
  stdout(t('publish.deployHint'));

  return 0;
}

if (path.resolve(process.argv[1] || '') === fileURLToPath(import.meta.url)) {
  process.exitCode = runPublish();
}
