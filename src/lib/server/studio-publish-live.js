// @ts-nocheck

import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { createTranslator } from '$lib/i18n/index.js';
import { runPublishPrepReport } from '$lib/server/studio-io.js';

const ROOT = process.cwd();
const TRACKED_PREFIXES = ['config/', 'content/', 'static/images/'];

/**
 * @param {string[]} args
 */
function runGit(args) {
  const result = spawnSync('git', args, {
    cwd: ROOT,
    encoding: 'utf8'
  });

  return {
    ok: (result.status ?? 1) === 0,
    stdout: `${result.stdout || ''}`.trim(),
    stderr: `${result.stderr || ''}`.trim(),
    output: `${result.stdout || ''}${result.stderr || ''}`.trim()
  };
}

/**
 * @param {string} line
 */
function parseStatusLine(line) {
  if (line.length < 4) {
    return null;
  }

  const status = line.slice(0, 2).trim() || line[0];
  const filePath = line.slice(3).trim();

  if (!filePath || !TRACKED_PREFIXES.some((prefix) => filePath.startsWith(prefix))) {
    return null;
  }

  return { status, path: filePath };
}

/**
 * @returns {{ changes: { status: string, path: string }[], commitsAhead: number }}
 */
function collectGitChanges() {
  const status = runGit(['status', '--porcelain', '--', 'config', 'content', 'static/images']);
  const changes = status.stdout
    .split('\n')
    .map(parseStatusLine)
    .filter(Boolean);

  let commitsAhead = 0;
  const upstream = runGit(['rev-parse', '--abbrev-ref', '@{upstream}']);

  if (upstream.ok) {
    const ahead = runGit(['rev-list', '--count', `${upstream.stdout}..HEAD`]);
    commitsAhead = Number.parseInt(ahead.stdout, 10) || 0;
  }

  return { changes, commitsAhead };
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
  /** @type {string[]} */
  const issues = [];

  if (!existsSync(path.join(ROOT, '.git'))) {
    issues.push('noRepo');
  }

  if (!runGit(['remote', 'get-url', 'origin']).ok) {
    issues.push('noRemote');
  }

  const { changes, commitsAhead } = collectGitChanges();
  const hasPendingWork = changes.length > 0 || commitsAhead > 0;

  return {
    canPublish: issues.length === 0,
    issues,
    changes,
    commitsAhead,
    hasPendingWork
  };
}

/**
 * @param {string[]} issueKeys
 * @param {(key: string, params?: Record<string, string | number>) => string} t
 */
function formatIssues(issueKeys, t) {
  return issueKeys.map((key) => t(`studio.readiness.liveIssues.${key}`)).join('\n');
}

/**
 * @param {string} locale
 */
export function runPublishLive(locale) {
  const t = createTranslator(locale);
  const preview = getPublishLivePreview();

  if (!preview.canPublish) {
    return {
      ok: false,
      message: t('studio.readiness.liveFailed'),
      output: formatIssues(preview.issues, t)
    };
  }

  /** @type {string[]} */
  const log = [];

  log.push(t('studio.readiness.livePhasePrep'));
  const prep = runPublishPrepReport();

  if (!prep.ok) {
    return {
      ok: false,
      message: t('studio.readiness.liveFailedPrep'),
      output: [log.join('\n'), prep.output].filter(Boolean).join('\n\n')
    };
  }

  log.push(t('studio.readiness.livePrepOk'));

  runGit(['add', '--', 'config', 'content', 'static/images']);
  const staged = runGit(['diff', '--cached', '--name-only']);

  if (staged.stdout) {
    log.push(t('studio.readiness.livePhaseCommit'));
    log.push(staged.stdout);

    const commit = runGit(['commit', '-m', t('studio.readiness.liveCommitMessage')]);

    if (!commit.ok) {
      return {
        ok: false,
        message: t('studio.readiness.liveFailedCommit'),
        output: [log.join('\n'), commit.output].filter(Boolean).join('\n\n')
      };
    }

    log.push(t('studio.readiness.liveCommitOk'));
  } else if (preview.commitsAhead > 0) {
    log.push(t('studio.readiness.liveSkipCommit'));
  } else {
    log.push(t('studio.readiness.liveNoCommitNeeded'));
  }

  log.push(t('studio.readiness.livePhasePush'));
  const push = runGit(['push', 'origin', 'HEAD']);

  if (!push.ok) {
    return {
      ok: false,
      message: t('studio.readiness.liveFailedPush'),
      output: [log.join('\n'), push.output].filter(Boolean).join('\n\n')
    };
  }

  log.push(t('studio.readiness.livePushOk'));

  log.push(t('studio.readiness.livePhaseDeploy'));
  const deploy = spawnSync('npx', ['vercel', '--prod'], {
    cwd: ROOT,
    encoding: 'utf8',
    env: { ...process.env, FORCE_COLOR: '0' },
    timeout: 600_000
  });

  const deployOutput = `${deploy.stdout || ''}${deploy.stderr || ''}`.trim();

  if ((deploy.status ?? 1) !== 0) {
    return {
      ok: false,
      message: t('studio.readiness.liveFailedDeploy'),
      output: [log.join('\n'), deployOutput].filter(Boolean).join('\n\n')
    };
  }

  log.push(deployOutput);

  return {
    ok: true,
    message: t('studio.readiness.liveOk'),
    output: log.join('\n\n')
  };
}
