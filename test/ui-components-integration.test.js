import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import test from 'node:test';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const artifactRelative =
  'vendor/giadaware-ui-components/fcdb869/giadaware-ui-components-0.0.0.tgz';
const dependency = `file:${artifactRelative}`;
const expectedSha256 = 'c53b5399520db687f7aef43c15b8b4b6a999a6a80f1bda71e26ff22a35acb7bd';
const npmCache = path.join(os.tmpdir(), 'atelier-kit-npm-cache');
/** @type {string} */
let fixtureRoot = '';
/** @type {ReturnType<typeof createRequire>} */
let fixtureRequire;
/** @type {typeof import('vite').createServer} */
let createServer;
/** @type {typeof import('@sveltejs/vite-plugin-svelte').svelte} */
let sveltePlugin;

test.before(async () => {
  fixtureRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'atelier-kit-169-clean-install-'));
  fs.copyFileSync(path.join(root, 'package.json'), path.join(fixtureRoot, 'package.json'));
  fs.copyFileSync(path.join(root, 'package-lock.json'), path.join(fixtureRoot, 'package-lock.json'));
  for (const relativePath of [
    artifactRelative,
    'vendor/giadaware-ui-components/fcdb869/integration.json',
    'src/lib/components/AtelierSocialIcon.svelte',
    'src/lib/components/AtelierFormStatus.svelte',
    'src/lib/social-icon-adapter.js',
    'src/lib/form-status-adapter.js',
    'src/lib/social-networks.js'
  ]) {
    const target = path.join(fixtureRoot, relativePath);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.copyFileSync(path.join(root, relativePath), target);
  }

  const install = spawnSync(
    'npm',
    ['ci', '--include=dev', '--ignore-scripts', '--no-audit', '--no-fund', '--cache', npmCache],
    {
      cwd: fixtureRoot,
      encoding: 'utf8',
      env: { ...process.env, NODE_ENV: 'development', npm_config_omit: '' }
    }
  );
  assert.equal(install.status, 0, `${install.stdout}\n${install.stderr}`);

  fixtureRequire = createRequire(path.join(fixtureRoot, 'package.json'));
  ({ createServer } = await import(pathToFileURL(fixtureRequire.resolve('vite')).href));
  const pluginModule = await import(
    pathToFileURL(fixtureRequire.resolve('@sveltejs/vite-plugin-svelte')).href
  );
  sveltePlugin = pluginModule.svelte;
});

test.after(() => {
  if (fixtureRoot) fs.rmSync(fixtureRoot, { recursive: true, force: true });
});

/** @param {string} relativePath */
function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), 'utf8');
}

/** @param {string} relativePath */
function sha256(relativePath) {
  return crypto.createHash('sha256').update(fs.readFileSync(path.join(root, relativePath))).digest('hex');
}

/** @param {Buffer} bytes */
function sha512Integrity(bytes) {
  return `sha512-${crypto.createHash('sha512').update(bytes).digest('base64')}`;
}

/**
 * Compile and SSR-render a focused Svelte harness through Vite.
 * @param {string} harnessSource
 * @param {Record<string, unknown>} props
 * @param {string | null} [packageProbeSource]
 */
async function renderHarness(harnessSource, props, packageProbeSource = null) {
  const harnessRoot = fs.mkdtempSync(path.join(fixtureRoot, 'harness-'));
  const harnessPath = path.join(harnessRoot, 'Harness.svelte');
  fs.writeFileSync(harnessPath, harnessSource);

  const aliases = [
    {
      find: 'svelte/server',
      replacement: fixtureRequire.resolve('svelte/server')
    },
    {
      find: 'svelte/internal/server',
      replacement: fixtureRequire.resolve('svelte/internal/server')
    },
    { find: '$lib', replacement: path.join(fixtureRoot, 'src/lib') },
    {
      find: '$atelier-social',
      replacement: path.join(fixtureRoot, 'src/lib/components/AtelierSocialIcon.svelte')
    },
    {
      find: '$atelier-status',
      replacement: path.join(fixtureRoot, 'src/lib/components/AtelierFormStatus.svelte')
    }
  ];

  if (packageProbeSource !== null) {
    fs.writeFileSync(path.join(harnessRoot, 'PackageProbe.svelte'), packageProbeSource);
    fs.writeFileSync(
      path.join(harnessRoot, 'package-probe.js'),
      "export { default as FormStatus } from './PackageProbe.svelte';\n"
    );
    aliases.push({
      find: 'giadaware-ui-components',
      replacement: path.join(harnessRoot, 'package-probe.js')
    });
  }

  const server = await createServer({
    configFile: false,
    root: harnessRoot,
    logLevel: 'error',
    appType: 'custom',
    plugins: [sveltePlugin({ compilerOptions: { css: 'injected' } })],
    resolve: { alias: aliases },
    server: { middlewareMode: true, hmr: false, fs: { allow: [fixtureRoot] } }
  });

  try {
    const module = await server.ssrLoadModule('/Harness.svelte');
    const svelteServer = await server.ssrLoadModule('svelte/server');
    return svelteServer.render(module.default, { props });
  } finally {
    await server.close();
    fs.rmSync(harnessRoot, { recursive: true, force: true });
  }
}

/**
 * @param {string} directory
 * @returns {string[]}
 */
function collectFiles(directory) {
  /** @type {string[]} */
  const files = [];
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...collectFiles(absolute));
    else if (entry.isFile()) files.push(absolute);
  }
  return files;
}

test('records and installs the exact immutable package artifact', () => {
  const manifest = JSON.parse(read('vendor/giadaware-ui-components/fcdb869/integration.json'));
  assert.deepEqual(manifest, {
    package: 'giadaware-ui-components',
    version: '0.0.0',
    sourceCommit: 'fcdb8693fc69ab37223de76bba714eabaf3a3457',
    filename: 'giadaware-ui-components-0.0.0.tgz',
    sha256: expectedSha256
  });
  assert.equal(sha256(artifactRelative), expectedSha256);
  assert.deepEqual(
    fs.readFileSync(path.join(fixtureRoot, 'package.json')),
    fs.readFileSync(path.join(root, 'package.json'))
  );
  assert.deepEqual(
    fs.readFileSync(path.join(fixtureRoot, 'package-lock.json')),
    fs.readFileSync(path.join(root, 'package-lock.json'))
  );
  assert.equal(
    crypto.createHash('sha256').update(fs.readFileSync(path.join(fixtureRoot, artifactRelative))).digest('hex'),
    expectedSha256
  );
  for (const adapter of [
    'src/lib/components/AtelierSocialIcon.svelte',
    'src/lib/components/AtelierFormStatus.svelte'
  ]) {
    assert.deepEqual(fs.readFileSync(path.join(fixtureRoot, adapter)), fs.readFileSync(path.join(root, adapter)));
  }

  const packageJson = JSON.parse(read('package.json'));
  const lock = JSON.parse(read('package-lock.json'));
  assert.equal(packageJson.dependencies['giadaware-ui-components'], dependency);
  assert.equal(lock.packages[''].dependencies['giadaware-ui-components'], dependency);
  assert.equal(lock.packages['node_modules/giadaware-ui-components'].resolved, dependency);
  assert.equal(lock.packages['node_modules/giadaware-ui-components'].version, '0.0.0');
  assert.equal(
    lock.packages['node_modules/giadaware-ui-components'].integrity,
    sha512Integrity(fs.readFileSync(path.join(root, artifactRelative)))
  );
});

test('lock and install use one physical Svelte runtime and the package host peer', () => {
  const lock = JSON.parse(read('package-lock.json'));
  const lockedSveltePaths = Object.keys(lock.packages).filter(
    (packagePath) => packagePath === 'node_modules/svelte' || packagePath.endsWith('/node_modules/svelte')
  );
  assert.deepEqual(lockedSveltePaths, ['node_modules/svelte']);

  const fixtureLock = JSON.parse(fs.readFileSync(path.join(fixtureRoot, 'package-lock.json'), 'utf8'));
  const fixtureSveltePaths = Object.keys(fixtureLock.packages).filter(
    (packagePath) => packagePath === 'node_modules/svelte' || packagePath.endsWith('/node_modules/svelte')
  );
  assert.deepEqual(fixtureSveltePaths, ['node_modules/svelte']);

  const hostRequire = createRequire(path.join(fixtureRoot, 'package.json'));
  const installedPackage = JSON.parse(
    fs.readFileSync(path.join(fixtureRoot, 'node_modules/giadaware-ui-components/package.json'), 'utf8')
  );
  const packageRequire = createRequire(
    path.join(fixtureRoot, 'node_modules/giadaware-ui-components/package.json')
  );
  assert.equal(installedPackage.peerDependencies.svelte, '^5.0.0');
  assert.equal(installedPackage.dependencies?.svelte, undefined);
  assert.equal(packageRequire.resolve('svelte'), hostRequire.resolve('svelte'));
  assert.equal(fs.existsSync(path.join(fixtureRoot, 'node_modules/giadaware-ui-components/node_modules/svelte')), false);

  const physicalSvelte = collectFiles(path.join(fixtureRoot, 'node_modules'))
    .filter((file) => path.basename(file) === 'package.json' && path.basename(path.dirname(file)) === 'svelte')
    .map((file) => path.relative(fixtureRoot, path.dirname(file)).split(path.sep).join('/'));
  assert.deepEqual(physicalSvelte, ['node_modules/svelte']);

  const archive = spawnSync('tar', ['-tzf', path.join(fixtureRoot, artifactRelative)], { encoding: 'utf8' });
  assert.equal(archive.status, 0, archive.stderr);
  assert.doesNotMatch(archive.stdout, /(?:^|\/)node_modules\/svelte(?:\/|$)/);
  assert.doesNotMatch(archive.stdout, /(?:^|\/)svelte(?:\/src|\/internal)(?:\/|$)/);
});

test('package root exposes both trial components and adapters consume no third component', () => {
  const packageEntry = fixtureRequire.resolve('giadaware-ui-components');
  assert.equal(
    path.relative(fixtureRoot, packageEntry).split(path.sep).join('/'),
    'node_modules/giadaware-ui-components/dist/index.js'
  );
  const packageRoot = fs.readFileSync(packageEntry, 'utf8');
  assert.match(packageRoot, /FormStatus/);
  assert.match(packageRoot, /SocialIcon/);

  const sourceFiles = collectFiles(path.join(root, 'src'))
    .filter((file) => /\.(?:js|svelte)$/.test(file));
  /** @type {[string, string][]} */
  const consumers = [];
  for (const file of sourceFiles) {
    const source = fs.readFileSync(file, 'utf8');
    if (source.includes("from 'giadaware-ui-components'")) {
      consumers.push([path.relative(root, file), source]);
    }
  }

  assert.deepEqual(consumers.map(([file]) => file).sort(), [
    'src/lib/components/AtelierFormStatus.svelte',
    'src/lib/components/AtelierSocialIcon.svelte'
  ]);
  assert.match(consumers[0][1] + consumers[1][1], /import \{ FormStatus \}/);
  assert.match(consumers[0][1] + consumers[1][1], /import \{ SocialIcon \}/);
  assert.doesNotMatch(consumers[0][1] + consumers[1][1], /giadaware-ui-components\/(visitor|studio)/);
});

test('social adapter SSR renders admitted decorative icons inside consumer-owned labels', async () => {
  const harness = `<script>
    import AtelierSocialIcon from '$atelier-social';
    let { id, label = 'Visit network' } = $props();
  </script>
  <a href="/network" aria-label={label}><AtelierSocialIcon {id} /></a>`;

  for (const id of ['instagram', 'facebook', 'x', 'github']) {
    const { body } = await renderHarness(harness, { id });
    assert.match(body, /<a href="\/network" aria-label="Visit network">/);
    assert.match(body, /<svg[^>]*aria-hidden="true"/);
    assert.doesNotMatch(body, /<svg[^>]*(?:aria-label|role="img")/);
  }

  for (const id of ['', 'unknown', 'github-sponsors']) {
    const { body } = await renderHarness(harness, { id });
    assert.match(body, /aria-label="Visit network"/);
    assert.doesNotMatch(body, /<svg/);
  }
});

test('form adapter SSR maps tones, live semantics, empty output and historical tokens', async () => {
  const harness = `<script>
    import AtelierFormStatus from '$atelier-status';
    let { message = 'Saved', status = 'info', durationMs } = $props();
  </script>
  <AtelierFormStatus {message} {status} {durationMs} />`;

  for (const [status, expectedTone] of [
    ['success', 'success'],
    ['warning', 'warning'],
    ['error', 'error'],
    ['info', 'info'],
    ['unknown', 'info']
  ]) {
    const { body } = await renderHarness(harness, { status });
    assert.match(body, new RegExp(`data-tone="${expectedTone}"`));
    assert.match(
      body,
      /<p[^>]*class="[^"]*atelier-form-status[^"]*"[^>]*>/,
      'the real package-rendered status element must forward the adapter class'
    );
    if (expectedTone === 'error') {
      assert.match(body, /role="alert" aria-live="assertive"/);
    } else {
      assert.match(body, /role="status" aria-live="polite"/);
    }
  }

  const empty = await renderHarness(harness, { message: '', status: 'success' });
  assert.doesNotMatch(empty.body, /<p/);

  const styled = await renderHarness(harness, { status: 'success' });
  const expectedTokens = {
    '--giu-form-status-padding': '0.85rem 1rem',
    '--giu-form-status-border-width': '0',
    '--giu-form-status-border-radius': '0.75rem',
    '--giu-form-status-line-height': '1.5',
    '--giu-form-status-success-background': 'rgb(32 142 88 / 0.12)',
    '--giu-form-status-success-color': '#176742',
    '--giu-form-status-warning-background': 'rgb(214 155 35 / 0.15)',
    '--giu-form-status-warning-color': '#6b4b0a',
    '--giu-form-status-error-background': 'rgb(191 56 56 / 0.12)',
    '--giu-form-status-error-color': '#7f2222',
    '--giu-form-status-info-background': 'rgb(45 108 223 / 0.1)',
    '--giu-form-status-info-color': '#143870'
  };
  for (const [token, value] of Object.entries(expectedTokens)) {
    assert.ok(
      styled.head.includes(`${token}: ${value}`),
      `${token} must cross the compiled adapter style boundary with its historical value`
    );
  }
});

test('compiled form adapter forwards the resolved duration policy as package props', async () => {
  const harness = `<script>
    import AtelierFormStatus from '$atelier-status';
    let { status, durationMs } = $props();
  </script>
  <AtelierFormStatus message="Policy probe" {status} {durationMs} />`;
  const probe = `<script>
    let { message, tone, durationMs, class: className } = $props();
  </script>
  <output data-message={message} data-tone={tone} data-duration={durationMs === null ? 'null' : durationMs} class={className}></output>`;

  for (const [status, durationMs, expected] of [
    ['success', undefined, '5000'],
    ['info', undefined, '5000'],
    ['warning', undefined, 'null'],
    ['error', undefined, 'null'],
    ['success', 2750, '2750'],
    ['info', null, 'null']
  ]) {
    const { body } = await renderHarness(harness, { status, durationMs }, probe);
    assert.match(body, new RegExp(`data-duration="${expected}"`));
    assert.match(body, new RegExp(`data-tone="${status}"`));
    assert.match(body, /class="atelier-form-status"/);
  }
});

test('historical rollback components remain byte-for-byte unchanged', () => {
  assert.equal(sha256('src/lib/components/SocialIcon.svelte'),
    '13b69dfb9001c3b58b5a42eb57081c068eab8e4ef433fa39f0faa4ce386c0c8c');
  assert.equal(sha256('src/lib/components/StudioFormStatus.svelte'),
    '355d297b2d1a31481d372f6b40aa80f4947c17a3ec89468c3dc5d8a6b8272e35');
});

test('current visitor and Studio consumers use only the new adapters', () => {
  for (const component of ['SiteHeader.svelte', 'SiteFooter.svelte']) {
    const source = read(`src/lib/components/${component}`);
    assert.match(source, /AtelierSocialIcon\.svelte/);
    assert.doesNotMatch(source, /components\/SocialIcon\.svelte/);
  }

  const studioPages = collectFiles(path.join(root, 'src/routes/studio'))
    .filter((file) => file.endsWith('.svelte'))
    .map((file) => fs.readFileSync(file, 'utf8'));
  const statusConsumers = studioPages.filter((source) => source.includes('<StudioFormStatus'));
  assert.ok(statusConsumers.length > 0);
  for (const source of statusConsumers) {
    assert.match(source, /components\/AtelierFormStatus\.svelte/);
    assert.doesNotMatch(source, /components\/StudioFormStatus\.svelte/);
  }
});

test('a fresh scaffold retains the exact local dependency and artifact', () => {
  const temporaryRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'atelier-kit-169-scaffold-'));
  const source = path.join(temporaryRoot, 'source');
  const target = path.join(temporaryRoot, 'client');
  try {
    fs.mkdirSync(path.join(source, path.dirname(artifactRelative)), { recursive: true });
    fs.copyFileSync(path.join(root, artifactRelative), path.join(source, artifactRelative));
    fs.copyFileSync(path.join(root, 'package-lock.json'), path.join(source, 'package-lock.json'));
    fs.writeFileSync(path.join(source, 'CHANGELOG.md'), '# Changelog\n\n## v0.4.0\n');
    fs.writeFileSync(
      path.join(source, 'package.json'),
      `${JSON.stringify({
        name: 'fixture',
        private: true,
        dependencies: { 'giadaware-ui-components': dependency }
      }, null, 2)}\n`
    );
    const result = spawnSync(
      process.execPath,
      [path.join(root, 'scripts/scaffold-client.js'), target, '--template', 'writing'],
      { cwd: source, encoding: 'utf8' }
    );
    assert.equal(result.status, 0, result.stderr);
    const scaffoldPackage = JSON.parse(fs.readFileSync(path.join(target, 'package.json'), 'utf8'));
    const scaffoldLock = JSON.parse(fs.readFileSync(path.join(target, 'package-lock.json'), 'utf8'));
    assert.equal(scaffoldPackage.dependencies['giadaware-ui-components'], dependency);
    assert.equal(scaffoldLock.packages[''].dependencies['giadaware-ui-components'], dependency);
    assert.equal(scaffoldLock.packages['node_modules/giadaware-ui-components'].resolved, dependency);
    const copiedArtifact = fs.readFileSync(path.join(target, artifactRelative));
    assert.equal(crypto.createHash('sha256').update(copiedArtifact).digest('hex'), expectedSha256);
  } finally {
    fs.rmSync(temporaryRoot, { recursive: true, force: true });
  }
});
