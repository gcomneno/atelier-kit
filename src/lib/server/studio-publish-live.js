// @ts-nocheck

import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { createTranslator } from '$lib/i18n/index.js';
import { runPublishPrepReport } from '$lib/server/studio-io.js';
import { createPublishLiveService } from '$lib/server/studio-publish-live-core.js';

const ROOT = process.cwd();

/**
 * @param {string[]} args
 */
function runCommand(command, args, options) {
  const result = spawnSync(command, args, { encoding: 'utf8', ...options });
  return {
    ok: (result.status ?? 1) === 0,
    stdout: `${result.stdout || ''}`.trim(),
    stderr: `${result.stderr || ''}`.trim(),
    output: `${result.stdout || ''}${result.stderr || ''}`.trim(),
    exitCode: result.status,
    error: result.error ? { code: result.error.code } : undefined
  };
}

function service(locale = 'en') {
  return createPublishLiveService({
    root: ROOT,
    runCommand,
    fileExists: existsSync,
    readFile: readFileSync,
    runPrep: runPublishPrepReport,
    t: createTranslator(locale)
  });
}

/**
 * @returns {{
 *   canPublish: boolean,
 *   issues: string[],
 *   changes: { status: string, path: string }[],
 *   commitsAhead: number,
 *   hasPendingWork: boolean
 * }}
 */
export function getPublishLivePreview() {
  return service().getPreview();
}

/**
 * @param {string} locale
 */
export function runPublishLive(locale) {
  const publish = service(locale);
  return publish.run(publish.getPreview());
}
