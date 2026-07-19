// @ts-nocheck

import path from 'node:path';

const TRACKED_PATHS = ['config', 'content', 'static/images'];
const TRACKED_PREFIXES = TRACKED_PATHS.map((entry) => `${entry}/`);

function commandOutput(result) {
  return `${result.stdout || ''}${result.stderr || ''}`.trim();
}

function safeOutput(value) {
  return String(value || '')
    .replace(/(https?:\/\/)[^\s/@]+:[^\s/@]+@/gi, '$1[credentials]@')
    .replace(/\b(token|authorization)\s*[:=]\s*\S+/gi, '$1=[redacted]')
    .slice(0, 4000);
}

function parseStatusLine(line) {
  if (line.length < 4) return null;
  const status = line.slice(0, 2).trim() || line[0];
  const filePath = line.slice(3).trim();
  if (!filePath || !TRACKED_PREFIXES.some((prefix) => filePath.startsWith(prefix))) return null;
  return { status, path: filePath };
}

export function readVercelProject(root, readFile) {
  const projectFile = path.join(root, '.vercel', 'project.json');
  let source;
  try {
    source = readFile(projectFile, 'utf8');
  } catch (error) {
    return {
      ok: false,
      issue: error?.code === 'ENOENT' ? 'vercelLinkMissing' : 'vercelLinkUnreadable'
    };
  }

  let project;
  try {
    project = JSON.parse(source);
  } catch {
    return { ok: false, issue: 'vercelLinkInvalid' };
  }

  if (!project || typeof project !== 'object' || Array.isArray(project)) {
    return { ok: false, issue: 'vercelLinkInvalid' };
  }
  if (typeof project.projectId !== 'string' || !project.projectId.trim()) {
    return { ok: false, issue: 'vercelProjectMissing' };
  }
  if (typeof project.orgId !== 'string' || !project.orgId.trim()) {
    return { ok: false, issue: 'vercelScopeMissing' };
  }

  return { ok: true, projectId: project.projectId.trim(), orgId: project.orgId.trim() };
}

function runVercelCommand(runCommand, invocation, args, options) {
  return runCommand(invocation.command, [...invocation.prefixArgs, ...args], options);
}

function createWindowsCommandInvocation(command, source) {
  if (/\.(cmd|bat)$/i.test(command)) {
    return {
      command: source.env.ComSpec || 'cmd.exe',
      prefixArgs: ['/d', '/s', '/c', command],
      source: source.name
    };
  }
  return { command, prefixArgs: [], source: source.name };
}

function resolveWindowsGlobalVercel(runCommand, commandOptions, env) {
  const result = runCommand('where.exe', ['vercel'], commandOptions);
  if (!result.ok) return null;
  const command = `${result.stdout || ''}`
    .split(/\r?\n/)
    .map((line) => line.trim())
    .find(Boolean);
  return command
    ? createWindowsCommandInvocation(command, { name: 'global', env })
    : null;
}

export function resolveVercelCli({
  root,
  runCommand,
  fileExists,
  commandOptions,
  platform = process.platform,
  env = process.env
}) {
  const pathApi = platform === 'win32' ? path.win32 : path;
  const localCommand = pathApi.join(
    root,
    'node_modules',
    '.bin',
    platform === 'win32' ? 'vercel.cmd' : 'vercel'
  );
  const localInvocation = platform === 'win32'
    ? createWindowsCommandInvocation(localCommand, { name: 'local', env })
    : { command: localCommand, prefixArgs: [], source: 'local' };
  const candidates = fileExists(localCommand) ? [localInvocation] : [];
  const attempts = [];

  for (const invocation of candidates) {
    const result = runVercelCommand(runCommand, invocation, ['--version'], commandOptions);
    attempts.push({ source: invocation.source, exitCode: result.exitCode, errorCode: result.error?.code });
    if (result.ok) return { ok: true, invocation };
  }

  const globalInvocation = platform === 'win32'
    ? resolveWindowsGlobalVercel(runCommand, commandOptions, env)
    : { command: 'vercel', prefixArgs: [], source: 'global' };
  if (globalInvocation) {
    const result = runVercelCommand(runCommand, globalInvocation, ['--version'], commandOptions);
    attempts.push({
      source: globalInvocation.source,
      exitCode: result.exitCode,
      errorCode: result.error?.code
    });
    if (result.ok) return { ok: true, invocation: globalInvocation };
  }

  const issue = platform === 'win32'
    ? (candidates.length === 0 && !globalInvocation ? 'vercelCliMissing' : 'vercelCliUnusable')
    : (attempts.every((attempt) => attempt.errorCode === 'ENOENT')
        ? 'vercelCliMissing'
        : 'vercelCliUnusable');
  return { ok: false, issue, attempts };
}

export function createPublishLiveService({
  root,
  runCommand,
  fileExists,
  readFile,
  runPrep,
  t,
  platform = process.platform,
  env = process.env
}) {
  const runGit = (args) => runCommand('git', args, { cwd: root });
  const vercelOptions = (linked, timeout) => ({
      cwd: root,
      env: {
        ...env,
        VERCEL_PROJECT_ID: linked.projectId,
        VERCEL_ORG_ID: linked.orgId,
        FORCE_COLOR: '0',
        NO_COLOR: '1'
      },
      timeout
    });

  function collectGitChanges() {
    const status = runGit(['status', '--porcelain', '--', ...TRACKED_PATHS]);
    const changes = `${status.stdout || ''}`.split('\n').map(parseStatusLine).filter(Boolean);
    let commitsAhead = 0;
    const upstream = runGit(['rev-parse', '--abbrev-ref', '@{upstream}']);
    if (upstream.ok) {
      const ahead = runGit(['rev-list', '--count', `${upstream.stdout.trim()}..HEAD`]);
      commitsAhead = Number.parseInt(ahead.stdout, 10) || 0;
    }
    return { changes, commitsAhead };
  }

  function getPreview() {
    const issues = [];
    if (!runGit(['rev-parse', '--is-inside-work-tree']).ok) issues.push('noRepo');
    if (!runGit(['remote', 'get-url', 'origin']).ok) issues.push('noRemote');
    const { changes, commitsAhead } = collectGitChanges();
    return {
      canPublish: issues.length === 0,
      issues,
      changes,
      commitsAhead,
      hasPendingWork: changes.length > 0 || commitsAhead > 0
    };
  }

  function runPreflight() {
    const linked = readVercelProject(root, readFile);
    if (!linked.ok) return linked;

    const commandOptions = vercelOptions(linked, 30_000);
    const cli = resolveVercelCli({
      root,
      runCommand,
      fileExists,
      commandOptions,
      platform,
      env
    });
    if (!cli.ok) return cli;

    const auth = runVercelCommand(
      runCommand,
      cli.invocation,
      ['whoami', '--no-color'],
      commandOptions
    );
    if (auth.error?.code === 'ENOENT') return { ok: false, issue: 'vercelCliMissing' };
    if (!auth.ok) return { ok: false, issue: 'vercelAuthMissing' };

    const project = runVercelCommand(
      runCommand,
      cli.invocation,
      ['project', 'inspect', '--no-color'],
      commandOptions
    );
    if (project.error?.code === 'ENOENT') return { ok: false, issue: 'vercelCliMissing' };
    if (!project.ok) return { ok: false, issue: 'vercelProjectUnresolved' };

    return {
      ok: true,
      projectId: linked.projectId,
      orgId: linked.orgId,
      invocation: cli.invocation
    };
  }

  function fail(messageKey, log, detail = '', outcome = 'failed') {
    return {
      ok: false,
      outcome,
      message: t(messageKey),
      output: [log.join('\n'), safeOutput(detail)].filter(Boolean).join('\n\n'),
      deployedUrl: undefined
    };
  }

  function run(localePreview = getPreview()) {
    if (!localePreview.canPublish) {
      return fail(
        'studio.readiness.liveFailed',
        [],
        localePreview.issues.map((key) => t(`studio.readiness.liveIssues.${key}`)).join('\n')
      );
    }

    const log = [t('studio.readiness.livePhasePreflight')];
    const preflight = runPreflight();
    if (!preflight.ok) {
      return fail(
        'studio.readiness.liveFailedPreflight',
        log,
        t(`studio.readiness.liveIssues.${preflight.issue}`),
        'preflight_failed'
      );
    }
    log.push(t('studio.readiness.livePreflightOk'));

    log.push(t('studio.readiness.livePhasePrep'));
    const prep = runPrep();
    if (!prep.ok) return fail('studio.readiness.liveFailedPrep', log, prep.output, 'prep_failed');
    log.push(t('studio.readiness.livePrepOk'));

    const add = runGit(['add', '--', ...TRACKED_PATHS]);
    if (!add.ok) return fail('studio.readiness.liveFailedCommit', log, commandOutput(add), 'git_failed');
    const staged = runGit(['diff', '--cached', '--name-only']);
    if (!staged.ok) return fail('studio.readiness.liveFailedCommit', log, commandOutput(staged), 'git_failed');

    if (staged.stdout.trim()) {
      log.push(t('studio.readiness.livePhaseCommit'));
      log.push(staged.stdout.trim());
      const commit = runGit(['commit', '-m', t('studio.readiness.liveCommitMessage')]);
      if (!commit.ok) return fail('studio.readiness.liveFailedCommit', log, commandOutput(commit), 'git_failed');
      log.push(t('studio.readiness.liveCommitOk'));
    } else if (localePreview.commitsAhead > 0) {
      log.push(t('studio.readiness.liveSkipCommit'));
    } else {
      log.push(t('studio.readiness.liveNoCommitNeeded'));
    }

    log.push(t('studio.readiness.livePhasePush'));
    const push = runGit(['push', 'origin', 'HEAD']);
    if (!push.ok) return fail('studio.readiness.liveFailedPush', log, commandOutput(push), 'git_failed');
    log.push(t('studio.readiness.livePushOk'));

    log.push(t('studio.readiness.livePhaseDeploy'));
    const deploy = runVercelCommand(
      runCommand,
      preflight.invocation,
      ['deploy', '--prod', '--yes', '--no-color'],
      vercelOptions(preflight, 600_000)
    );
    if (!deploy.ok) {
      return fail('studio.readiness.liveFailedDeployAfterPush', log, commandOutput(deploy), 'partial');
    }

    const deployedUrl = `${deploy.stdout || ''}`.trim().split(/\s+/).find((value) => /^https:\/\/[^\s]+$/.test(value));
    if (!deployedUrl) {
      return fail('studio.readiness.liveFailedDeployAfterPush', log, '', 'partial');
    }

    log.push(t('studio.readiness.liveDeployOk'));
    return {
      ok: true,
      outcome: 'complete',
      message: t('studio.readiness.liveOkUrl', { url: deployedUrl }),
      output: log.join('\n\n'),
      deployedUrl
    };
  }

  return { getPreview, runPreflight, run };
}
