// @ts-nocheck

import assert from 'node:assert/strict';
import path from 'node:path';
import test from 'node:test';

import {
  createPublishLiveService,
  readVercelProject,
  resolveVercelCli
} from './studio-publish-live-core.js';

const ROOT = '/project';
const LOCAL_VERCEL = path.join(ROOT, 'node_modules', '.bin', 'vercel');
const linkedProject = JSON.stringify({ projectId: 'prj_test', orgId: 'team_test' });
const t = (key, params = {}) => params.url ? `${key}:${params.url}` : key;
const success = { ok: true, stdout: '', stderr: '', exitCode: 0 };

function commandKey(command, args) {
  return `${command} ${args.join(' ')}`;
}

function createHarness(overrides = {}) {
  const calls = [];
  const commands = overrides.commands || {};
  const runCommand = (command, args, options) => {
    calls.push({ command, args, options });
    return commands[commandKey(command, args)] || success;
  };
  const service = createPublishLiveService({
    root: ROOT,
    runCommand,
    fileExists: overrides.fileExists || (() => false),
    readFile: overrides.readFile || (() => linkedProject),
    runPrep: () => {
      calls.push({ command: 'prep', args: [] });
      return overrides.prep || { ok: true, output: 'prep ok' };
    },
    t,
    platform: overrides.platform || 'linux',
    env: overrides.env || {}
  });
  const preview = overrides.preview || {
    canPublish: true,
    issues: [],
    changes: [{ status: 'M', path: 'content/item.yaml' }],
    commitsAhead: 0,
    hasPendingWork: true
  };
  return { service, calls, preview };
}

const callKeys = (calls) => calls.map(({ command, args }) => commandKey(command, args));

test('Vercel project link reports missing, unreadable, invalid, and incomplete files', () => {
  assert.equal(readVercelProject(ROOT, () => { const error = new Error(); error.code = 'ENOENT'; throw error; }).issue, 'vercelLinkMissing');
  assert.equal(readVercelProject(ROOT, () => { const error = new Error(); error.code = 'EACCES'; throw error; }).issue, 'vercelLinkUnreadable');
  assert.equal(readVercelProject(ROOT, () => '{').issue, 'vercelLinkInvalid');
  assert.equal(readVercelProject(ROOT, () => JSON.stringify({ orgId: 'team' })).issue, 'vercelProjectMissing');
  assert.equal(readVercelProject(ROOT, () => JSON.stringify({ projectId: 'prj' })).issue, 'vercelScopeMissing');
});

test('CLI resolver prefers the local binary and never invokes npx', () => {
  const calls = [];
  const result = resolveVercelCli({
    root: ROOT,
    fileExists: (file) => file === LOCAL_VERCEL,
    runCommand: (command, args) => { calls.push(commandKey(command, args)); return success; },
    commandOptions: { cwd: ROOT },
    platform: 'linux'
  });
  assert.deepEqual(result, {
    ok: true,
    invocation: { command: LOCAL_VERCEL, prefixArgs: [], source: 'local' }
  });
  assert.deepEqual(calls, [`${LOCAL_VERCEL} --version`]);
  assert.equal(calls.some((call) => call.startsWith('npx ')), false);
});

test('CLI resolver invokes the global binary directly', () => {
  const calls = [];
  const result = resolveVercelCli({
    root: ROOT,
    fileExists: () => false,
    runCommand: (command, args, options) => {
      calls.push({ command, args, options });
      return success;
    },
    commandOptions: { cwd: ROOT },
    platform: 'linux'
  });
  assert.deepEqual(result.invocation, { command: 'vercel', prefixArgs: [], source: 'global' });
  assert.deepEqual(callKeys(calls), ['vercel --version']);
});

test('CLI resolver reports missing only when every attempted candidate returns ENOENT', () => {
  const calls = [];
  const missing = resolveVercelCli({
    root: ROOT,
    fileExists: () => true,
    runCommand: (command, args) => {
      calls.push(commandKey(command, args));
      return { ok: false, stdout: '', stderr: '', exitCode: null, error: { code: 'ENOENT' } };
    },
    commandOptions: { cwd: ROOT }
  });
  assert.deepEqual(calls, [`${LOCAL_VERCEL} --version`, 'vercel --version']);
  assert.equal(missing.issue, 'vercelCliMissing');
  assert.deepEqual(missing.attempts, [
    { source: 'local', exitCode: null, errorCode: 'ENOENT' },
    { source: 'global', exitCode: null, errorCode: 'ENOENT' }
  ]);
});

test('CLI resolver reports a non-zero global binary as unusable', () => {
  const unusable = resolveVercelCli({
    root: ROOT,
    fileExists: () => false,
    runCommand: () => ({ ok: false, stdout: '', stderr: 'broken', exitCode: 2 }),
    commandOptions: { cwd: ROOT }
  });
  assert.equal(unusable.issue, 'vercelCliUnusable');
  assert.deepEqual(unusable.attempts, [
    { source: 'global', exitCode: 2, errorCode: undefined }
  ]);
});

test('CLI resolver reports an unusable local binary when the global binary is absent', () => {
  const result = resolveVercelCli({
    root: ROOT,
    fileExists: () => true,
    runCommand: (command) => command === LOCAL_VERCEL
      ? { ok: false, exitCode: 2 }
      : { ok: false, exitCode: null, error: { code: 'ENOENT' } },
    commandOptions: { cwd: ROOT },
    platform: 'linux'
  });
  assert.equal(result.issue, 'vercelCliUnusable');
});

test('CLI resolver falls back from an unusable local binary to a valid global binary', () => {
  const result = resolveVercelCli({
    root: ROOT,
    fileExists: () => true,
    runCommand: (command) => command === LOCAL_VERCEL
      ? { ok: false, exitCode: 2 }
      : success,
    commandOptions: { cwd: ROOT },
    platform: 'linux'
  });
  assert.deepEqual(result.invocation, { command: 'vercel', prefixArgs: [], source: 'global' });
});

test('Windows local CLI uses ComSpec and keeps a spaced wrapper path as one argument', () => {
  const root = String.raw`C:\Client Projects\Atelier Kit`;
  const local = String.raw`C:\Client Projects\Atelier Kit\node_modules\.bin\vercel.cmd`;
  const calls = [];
  const result = resolveVercelCli({
    root,
    fileExists: (file) => file === local,
    runCommand: (command, args, options) => {
      calls.push({ command, args, options });
      return success;
    },
    commandOptions: { cwd: root },
    platform: 'win32',
    env: { ComSpec: String.raw`C:\Windows\System32\cmd.exe` }
  });
  assert.deepEqual(result.invocation, {
    command: String.raw`C:\Windows\System32\cmd.exe`,
    prefixArgs: ['/d', '/s', '/c', local],
    source: 'local'
  });
  assert.deepEqual(calls[0].args, ['/d', '/s', '/c', local, '--version']);
  assert.equal(calls[0].args[3], local);
  assert.notEqual(calls[0].command, local);
  assert.equal(calls[0].options.shell, undefined);
});

test('Windows local CLI falls back to cmd.exe without ComSpec', () => {
  const root = String.raw`C:\project`;
  const local = String.raw`C:\project\node_modules\.bin\vercel.cmd`;
  const result = resolveVercelCli({
    root,
    fileExists: () => true,
    runCommand: () => success,
    commandOptions: { cwd: root },
    platform: 'win32',
    env: {}
  });
  assert.equal(result.invocation.command, 'cmd.exe');
  assert.equal(result.invocation.prefixArgs[3], local);
});

test('Windows global CLI resolves a spaced .cmd path with where.exe and ComSpec', () => {
  const command = String.raw`C:\Program Files\Vercel\vercel.cmd`;
  const comSpec = String.raw`C:\Windows\System32\cmd.exe`;
  const calls = [];
  const result = resolveVercelCli({
    root: String.raw`C:\project`,
    fileExists: () => false,
    runCommand: (calledCommand, args, options) => {
      calls.push({ command: calledCommand, args, options });
      if (calledCommand === 'where.exe') {
        return { ...success, stdout: `\r\n${command}\r\nC:\\other\\vercel.exe\r\n` };
      }
      return success;
    },
    commandOptions: { cwd: String.raw`C:\project` },
    platform: 'win32',
    env: { ComSpec: comSpec }
  });
  assert.deepEqual(callKeys(calls), [
    'where.exe vercel',
    `${comSpec} /d /s /c ${command} --version`
  ]);
  assert.deepEqual(result.invocation, {
    command: comSpec,
    prefixArgs: ['/d', '/s', '/c', command],
    source: 'global'
  });
  assert.equal(calls[1].args[3], command);
  assert.equal(calls.some((call) => call.command === 'vercel'), false);
  assert.equal(calls.some((call) => call.options?.shell === true), false);
});

test('Windows global CLI wraps .bat commands and invokes executables directly', () => {
  for (const [resolved, expected] of [
    [String.raw`C:\tools\vercel.BAT`, 'cmd.exe'],
    [String.raw`C:\tools\vercel.exe`, String.raw`C:\tools\vercel.exe`]
  ]) {
    const calls = [];
    const result = resolveVercelCli({
      root: String.raw`C:\project`,
      fileExists: () => false,
      runCommand: (command, args) => {
        calls.push({ command, args });
        return command === 'where.exe' ? { ...success, stdout: `${resolved}\r\n` } : success;
      },
      commandOptions: { cwd: String.raw`C:\project` },
      platform: 'win32',
      env: {}
    });
    assert.equal(result.invocation.command, expected);
    assert.equal(calls.some((call) => call.command === 'vercel'), false);
    if (resolved.endsWith('.exe')) assert.deepEqual(result.invocation.prefixArgs, []);
  }
});

test('Windows reports missing when neither local nor where.exe finds Vercel', () => {
  const calls = [];
  const result = resolveVercelCli({
    root: String.raw`C:\project`,
    fileExists: () => false,
    runCommand: (command, args) => {
      calls.push(commandKey(command, args));
      return { ok: false, exitCode: 1, stdout: '', stderr: '' };
    },
    commandOptions: { cwd: String.raw`C:\project` },
    platform: 'win32',
    env: {}
  });
  assert.equal(result.issue, 'vercelCliMissing');
  assert.deepEqual(result.attempts, []);
  assert.deepEqual(calls, ['where.exe vercel']);
});

test('Windows reports a resolved but failing global Vercel command as unusable', () => {
  const command = String.raw`C:\tools\vercel.cmd`;
  const result = resolveVercelCli({
    root: String.raw`C:\project`,
    fileExists: () => false,
    runCommand: (calledCommand) => calledCommand === 'where.exe'
      ? { ...success, stdout: `${command}\r\n` }
      : { ok: false, exitCode: 2 },
    commandOptions: { cwd: String.raw`C:\project` },
    platform: 'win32',
    env: {}
  });
  assert.equal(result.issue, 'vercelCliUnusable');
  assert.deepEqual(result.attempts, [
    { source: 'global', exitCode: 2, errorCode: undefined }
  ]);
});

test('Windows falls back from an unusable local wrapper to a valid global command', () => {
  const root = String.raw`C:\project`;
  const local = String.raw`C:\project\node_modules\.bin\vercel.cmd`;
  const global = String.raw`C:\tools\vercel.exe`;
  const result = resolveVercelCli({
    root,
    fileExists: (file) => file === local,
    runCommand: (command, args) => {
      if (command === 'where.exe') return { ...success, stdout: `${global}\r\n` };
      if (args.includes(local)) return { ok: false, exitCode: 2 };
      return success;
    },
    commandOptions: { cwd: root },
    platform: 'win32',
    env: {}
  });
  assert.deepEqual(result.invocation, { command: global, prefixArgs: [], source: 'global' });
});

test('preflight distinguishes missing CLI, absent authentication, and unresolved project', () => {
  let harness = createHarness({ commands: {
    'vercel --version': { ok: false, exitCode: null, error: { code: 'ENOENT' } }
  } });
  assert.equal(harness.service.runPreflight().issue, 'vercelCliMissing');

  harness = createHarness({ commands: {
    'vercel --version': { ok: false, exitCode: 2 }
  } });
  assert.equal(harness.service.runPreflight().issue, 'vercelCliUnusable');

  harness = createHarness({ commands: {
    'vercel whoami --no-color': { ok: false, exitCode: 1 }
  } });
  assert.equal(harness.service.runPreflight().issue, 'vercelAuthMissing');

  harness = createHarness({ commands: {
    'vercel project inspect --no-color': { ok: false, exitCode: 1 }
  } });
  assert.equal(harness.service.runPreflight().issue, 'vercelProjectUnresolved');
});

test('linked private project passes without GitHub integration or an orgId scope argument', () => {
  const { service, calls } = createHarness();
  assert.deepEqual(service.runPreflight(), {
    ok: true,
    projectId: 'prj_test',
    orgId: 'team_test',
    invocation: { command: 'vercel', prefixArgs: [], source: 'global' }
  });
  assert.deepEqual(callKeys(calls), [
    'vercel --version',
    'vercel whoami --no-color',
    'vercel project inspect --no-color'
  ]);
  assert.equal(callKeys(calls).some((call) => /npx|github|--scope/.test(call)), false);
});

test('project inspection receives linked IDs and no-color settings in the environment', () => {
  const { service, calls } = createHarness({ env: { PATH: '/custom/bin', CUSTOM_VALUE: 'kept' } });
  service.runPreflight();
  const inspect = calls.find((call) => call.args?.[0] === 'project');
  assert.equal(inspect.options.env.PATH, '/custom/bin');
  assert.equal(inspect.options.env.CUSTOM_VALUE, 'kept');
  assert.equal(inspect.options.env.VERCEL_PROJECT_ID, 'prj_test');
  assert.equal(inspect.options.env.VERCEL_ORG_ID, 'team_test');
  assert.equal(inspect.options.env.FORCE_COLOR, '0');
  assert.equal(inspect.options.env.NO_COLOR, '1');
});

test('missing CLI preflight stops before prep, mutating Git, and deploy', () => {
  const { service, calls, preview } = createHarness({ commands: {
    'vercel --version': { ok: false, exitCode: null, error: { code: 'ENOENT' } }
  } });
  const result = service.run(preview);
  assert.equal(result.outcome, 'preflight_failed');
  assert.equal(result.ok, false);
  assert.equal(callKeys(calls).includes('prep '), false);
  assert.equal(callKeys(calls).some((call) => /git (add|commit|push)/.test(call)), false);
  assert.equal(callKeys(calls).some((call) => / deploy /.test(call)), false);
});

test('unusable CLI preflight stops before prep, staging, commit, push, and deploy', () => {
  const { service, calls, preview } = createHarness({ commands: {
    'vercel --version': { ok: false, exitCode: 2 }
  } });
  const result = service.run(preview);
  assert.equal(result.outcome, 'preflight_failed');
  assert.equal(result.output.includes('vercelCliUnusable'), true);
  assert.equal(callKeys(calls).includes('prep '), false);
  assert.equal(callKeys(calls).some((call) => /git (add|commit|push)/.test(call)), false);
  assert.equal(callKeys(calls).some((call) => /deploy/.test(call)), false);
});

test('publish order is link, CLI version, auth, inspect, prep, staging, commit, push, deploy', () => {
  const events = [];
  const { service, calls, preview } = createHarness({
    readFile: () => { events.push('read link'); return linkedProject; },
    commands: {
      'git diff --cached --name-only': { ok: true, stdout: 'content/item.yaml\n', stderr: '', exitCode: 0 },
      'vercel deploy --prod --yes --no-color': { ok: true, stdout: 'https://production.example.test\n', stderr: '', exitCode: 0 }
    }
  });
  const originalRunPreflight = service.runPreflight;
  // The read event is external to command recording; command order remains directly observable.
  const result = service.run(preview);
  assert.equal(result.outcome, 'complete');
  assert.equal(result.deployedUrl, 'https://production.example.test');
  assert.deepEqual(events, ['read link']);
  assert.deepEqual(callKeys(calls), [
    'vercel --version',
    'vercel whoami --no-color',
    'vercel project inspect --no-color',
    'prep ',
    'git add -- config content static/images',
    'git diff --cached --name-only',
    'git commit -m studio.readiness.liveCommitMessage',
    'git push origin HEAD',
    'vercel deploy --prod --yes --no-color'
  ]);
  assert.equal(originalRunPreflight, service.runPreflight);
  const deploy = calls.at(-1);
  assert.equal(deploy.command, 'vercel');
  assert.equal(deploy.options.env.VERCEL_PROJECT_ID, 'prj_test');
  assert.equal(deploy.options.env.VERCEL_ORG_ID, 'team_test');
});

test('deploy reuses the resolved local CLI', () => {
  const { service, calls, preview } = createHarness({
    fileExists: (file) => file === LOCAL_VERCEL,
    commands: {
      'git diff --cached --name-only': { ok: true, stdout: '', stderr: '', exitCode: 0 },
      [`${LOCAL_VERCEL} deploy --prod --yes --no-color`]: { ok: true, stdout: 'https://local.example.test', stderr: '', exitCode: 0 }
    }
  });
  assert.equal(service.run(preview).outcome, 'complete');
  assert.deepEqual(
    calls.filter((call) => call.command.includes('vercel')).map((call) => call.command),
    [LOCAL_VERCEL, LOCAL_VERCEL, LOCAL_VERCEL, LOCAL_VERCEL]
  );
});

test('Windows global version, whoami, inspect, and deploy reuse one invocation without shell or npx', () => {
  const root = String.raw`C:\Client Projects\Atelier Kit`;
  const global = String.raw`C:\Program Files\Vercel\vercel.cmd`;
  const comSpec = String.raw`C:\Windows\System32\cmd.exe`;
  const calls = [];
  const runCommand = (command, args, options) => {
    calls.push({ command, args, options });
    if (command === 'where.exe') return { ...success, stdout: `${global}\r\n` };
    if (args.includes('diff')) return { ...success, stdout: '' };
    if (args.includes('deploy')) return { ...success, stdout: 'https://windows.example.test' };
    return success;
  };
  const service = createPublishLiveService({
    root,
    runCommand,
    fileExists: () => false,
    readFile: () => linkedProject,
    runPrep: () => ({ ok: true, output: '' }),
    t,
    platform: 'win32',
    env: { ComSpec: comSpec }
  });
  const result = service.run({
    canPublish: true,
    issues: [],
    changes: [],
    commitsAhead: 0,
    hasPendingWork: false
  });
  assert.equal(result.outcome, 'complete');
  const vercelCalls = calls.filter((call) => call.command === comSpec);
  assert.equal(vercelCalls.length, 4);
  assert.deepEqual(vercelCalls.map((call) => call.args.slice(0, 4)),
    Array(4).fill(['/d', '/s', '/c', global]));
  assert.deepEqual(vercelCalls.map((call) => call.args.slice(4)), [
    ['--version'],
    ['whoami', '--no-color'],
    ['project', 'inspect', '--no-color'],
    ['deploy', '--prod', '--yes', '--no-color']
  ]);
  assert.equal(calls.filter((call) => call.command === 'where.exe').length, 1);
  assert.equal(calls.some((call) => call.command === global || call.command === 'vercel' || call.command === 'npx'), false);
  assert.equal(calls.some((call) => call.options?.shell === true), false);
});

test('prep failure prevents staging, push, and deploy', () => {
  const { service, calls, preview } = createHarness({ prep: { ok: false, output: 'build failed' } });
  const result = service.run(preview);
  assert.equal(result.outcome, 'prep_failed');
  assert.equal(callKeys(calls).some((call) => /git (add|push)/.test(call)), false);
  assert.equal(callKeys(calls).some((call) => / deploy /.test(call)), false);
});

test('push failure is a Git failure and never starts deploy', () => {
  const { service, calls, preview } = createHarness({ commands: {
    'git diff --cached --name-only': { ok: true, stdout: '', stderr: '', exitCode: 0 },
    'git push origin HEAD': { ok: false, stdout: '', stderr: 'push failed', exitCode: 1 }
  } });
  const result = service.run(preview);
  assert.equal(result.outcome, 'git_failed');
  assert.equal(callKeys(calls).some((call) => / deploy /.test(call)), false);
});

test('deploy failure after push is partial and keeps the partial-success message', () => {
  const { service, calls, preview } = createHarness({ commands: {
    'git diff --cached --name-only': { ok: true, stdout: '', stderr: '', exitCode: 0 },
    'vercel deploy --prod --yes --no-color': { ok: false, stdout: '', stderr: 'deploy failed', exitCode: 1 }
  } });
  const result = service.run(preview);
  assert.equal(result.ok, false);
  assert.equal(result.outcome, 'partial');
  assert.equal(result.message, 'studio.readiness.liveFailedDeployAfterPush');
  assert.equal(callKeys(calls).includes('git push origin HEAD'), true);
});

test('deploy URL parsing uses stdout only and missing URL remains partial', () => {
  const { service, preview } = createHarness({ commands: {
    'git diff --cached --name-only': { ok: true, stdout: '', stderr: '', exitCode: 0 },
    'vercel deploy --prod --yes --no-color': {
      ok: true,
      stdout: 'deployment complete',
      stderr: 'https://must-not-be-used.example.test',
      exitCode: 0
    }
  } });
  const result = service.run(preview);
  assert.equal(result.ok, false);
  assert.equal(result.outcome, 'partial');
  assert.equal(result.deployedUrl, undefined);
});
