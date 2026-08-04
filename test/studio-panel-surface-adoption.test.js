import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { createServer } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import { Window } from 'happy-dom';

const root = path.resolve('.');

const panelConsumers = new Map([
  ['src/routes/studio/collections/+page.svelte', ['collections']],
  ['src/routes/studio/collections/[id]/+page.svelte', ['collection-editor']],
  ['src/routes/studio/collections/new/+page.svelte', ['collection-create']],
  ['src/routes/studio/help/+page.svelte', [
    'workflow',
    'site',
    'atelier-mark',
    'content',
    'item-page',
    'publish',
    'upgrade',
    'limits'
  ]],
  ['src/routes/studio/items/+page.svelte', ['items']],
  ['src/routes/studio/items/[id]/+page.svelte', ['item-editor']],
  ['src/routes/studio/items/new/+page.svelte', ['item-create']],
  ['src/routes/studio/news/+page.svelte', ['news']],
  ['src/routes/studio/news/[id]/+page.svelte', ['news-editor']],
  ['src/routes/studio/news/new/+page.svelte', ['news-create']],
  ['src/routes/studio/readiness/+page.svelte', ['content-doctor']],
  ['src/routes/studio/site/appearance/+page.svelte', ['appearance-settings']],
  ['src/routes/studio/site/contact/+page.svelte', ['contact-settings']],
  ['src/routes/studio/site/footer/+page.svelte', ['footer-settings']],
  ['src/routes/studio/site/hero/+page.svelte', ['hero-banner-settings']],
  ['src/routes/studio/site/identity/+page.svelte', ['site-settings']],
  ['src/routes/studio/site/layout/+page.svelte', ['layout-settings']],
  ['src/routes/studio/site/social/+page.svelte', ['social-settings']],
  ['src/routes/studio/system/+page.svelte', ['language-settings', 'shutdown']]
]);

const surfaceConsumers = [
  'src/routes/studio/about/+page.svelte',
  'src/routes/studio/catalog/+page.svelte',
  'src/routes/studio/help/+page.svelte',
  'src/routes/studio/items/+page.svelte',
  'src/routes/studio/signal-clouds/+page.svelte'
];

/** @param {string} relativePath */
function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), 'utf8');
}

/** @param {string} source @param {string} component */
function componentCount(source, component) {
  return (source.match(new RegExp(`<${component}(?:\\s|>)`, 'g')) ?? []).length;
}

/** @param {string} source @param {string} component */
function importsStudioComponent(source, component) {
  return new RegExp(
    `import\\s*\\{[^}]*\\b${component}\\b[^}]*\\}\\s*from\\s*['"]giadaware-ui-components\\/studio['"]`
  ).test(source);
}

/** @param {string} directory @returns {string[]} */
function collectSvelteFiles(directory) {
  /** @type {string[]} */
  const files = [];
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...collectSvelteFiles(absolute));
    else if (entry.isFile() && entry.name.endsWith('.svelte')) files.push(absolute);
  }
  return files;
}

async function renderRepresentativeComposition() {
  const harnessRoot = fs.mkdtempSync(path.join(root, '.tmp-panel-surface-ssr-'));
  const harnessSource = `<script>
    import { Panel, Surface } from 'giadaware-ui-components/studio';
    let { title = 'Settings' } = $props();
  </script>

  <Panel {title} id="settings" headingLevel={2} class="atelier-studio-panel">
    <form aria-label="Settings form">
      <label>Name <input name="name" /></label>
    </form>
  </Panel>

  <nav aria-label="Help sections">
    <Surface class="atelier-studio-surface">
      <a href="#settings">Settings</a>
    </Surface>
  </nav>
`;
  fs.writeFileSync(path.join(harnessRoot, 'Harness.svelte'), harnessSource);

  const server = await createServer({
    configFile: false,
    root: harnessRoot,
    logLevel: 'error',
    appType: 'custom',
    plugins: [svelte({ compilerOptions: { css: 'injected' } })],
    resolve: { dedupe: ['svelte'] },
    server: {
      middlewareMode: true,
      hmr: false,
      fs: { allow: [root, harnessRoot] }
    }
  });

  try {
    const harness = await server.ssrLoadModule('/Harness.svelte');
    const svelteServer = await server.ssrLoadModule('svelte/server');
    return svelteServer.render(harness.default, {
      props: { title: 'Studio settings' }
    });
  } finally {
    await server.close();
    fs.rmSync(harnessRoot, { recursive: true, force: true });
  }
}

/** @param {Window} window */
function installDomGlobals(window) {
  const values = {
    window,
    document: window.document,
    navigator: window.navigator,
    Node: window.Node,
    Element: window.Element,
    HTMLElement: window.HTMLElement,
    SVGElement: window.SVGElement,
    Text: window.Text,
    Comment: window.Comment,
    Event: window.Event,
    CustomEvent: window.CustomEvent,
    getComputedStyle: window.getComputedStyle.bind(window),
    MutationObserver: window.MutationObserver
  };
  /** @type {Map<string, PropertyDescriptor | undefined>} */
  const descriptors = new Map();

  for (const [name, value] of Object.entries(values)) {
    descriptors.set(name, Object.getOwnPropertyDescriptor(globalThis, name));
    Object.defineProperty(globalThis, name, {
      configurable: true,
      writable: true,
      value
    });
  }

  return () => {
    for (const [name, descriptor] of descriptors) {
      if (descriptor) Object.defineProperty(globalThis, name, descriptor);
      else Reflect.deleteProperty(globalThis, name);
    }
  };
}

test('all 27 named Studio sections adopt the installed Panel contract', () => {
  let total = 0;

  for (const [file, ids] of panelConsumers) {
    const source = read(file);
    assert.equal(
      importsStudioComponent(source, 'Panel'),
      true,
      `${file} must import Panel from the Studio entry point`
    );
    assert.equal(
      componentCount(source, 'Panel'),
      ids.length,
      `${file} must render ${ids.length} classified Panel component(s)`
    );

    for (const id of ids) {
      assert.equal(
        source.includes(`id="${id}"`),
        true,
        `${file} must preserve the classified ${id} panel identity`
      );
    }

    assert.match(source, /<Panel\s+title=\{/);
    assert.match(source, /class="[^"]*\batelier-studio-panel\b[^"]*"/);
    total += ids.length;
  }

  assert.equal(total, 27);
});

test('all five neutral visual containers adopt Surface without inventing landmarks', () => {
  let total = 0;

  for (const file of surfaceConsumers) {
    const source = read(file);
    assert.equal(
      importsStudioComponent(source, 'Surface'),
      true,
      `${file} must import Surface from the Studio entry point`
    );
    assert.equal(componentCount(source, 'Surface'), 1);
    assert.match(source, /<Surface\s+class="[^"]*\batelier-studio-surface\b[^"]*"/);
    total += 1;
  }

  assert.equal(total, 5);

  const help = read('src/routes/studio/help/+page.svelte');
  assert.match(help, /<nav class="help-toc" aria-label=\{t\('studio\.help\.tocTitle'\)\}>/);
  assert.match(help, /<nav[\s\S]*?<Surface[\s\S]*?<h2>[\s\S]*?<\/Surface>[\s\S]*?<\/nav>/);

  for (const file of [
    'src/routes/studio/about/+page.svelte',
    'src/routes/studio/catalog/+page.svelte',
    'src/routes/studio/items/+page.svelte',
    'src/routes/studio/signal-clouds/+page.svelte'
  ]) {
    assert.doesNotMatch(read(file), /<section\s+class="atelier-studio-surface"/);
  }
});

test('dashboard links and specialized operational panels keep their own semantics', () => {
  const dashboard = read('src/routes/studio/+page.svelte');
  assert.match(dashboard, /<a class="zone tone-\{zone\.tone\}" href=\{zone\.href\}>/);
  assert.doesNotMatch(dashboard, /<Panel\b|<Surface\b/);
  assert.match(dashboard, /\.zone\s*\{[\s\S]*padding:\s*1\.35rem/);
  assert.match(dashboard, /\.zone\s*\{[\s\S]*box-shadow:\s*var\(--studio-shadow\)/);

  const readiness = read('src/routes/studio/readiness/+page.svelte');
  assert.equal(importsStudioComponent(readiness, 'AsyncOperationPanel'), true);
  assert.equal(componentCount(readiness, 'AsyncOperationPanel') > 0, true);

  const help = read('src/routes/studio/help/+page.svelte');
  assert.match(help, /<section id="safety" class="help-section">/);
  assert.match(help, /<StudioAccessGuide\s*\/>/);
});

test('obsolete generic panel ownership is removed from Studio source and layout CSS', () => {
  for (const absolute of collectSvelteFiles(path.join(root, 'src'))) {
    const relative = path.relative(root, absolute);
    const source = fs.readFileSync(absolute, 'utf8');
    for (const match of source.matchAll(/class="([^"]*)"/g)) {
      assert.equal(
        match[1].split(/\s+/).includes('studio-panel'),
        false,
        `${relative} still owns the obsolete studio-panel class`
      );
    }
  }

  const layout = read('src/routes/studio/+layout.svelte');
  assert.doesNotMatch(layout, /:global\(\.studio-panel(?:\)|\s)/);
  assert.doesNotMatch(layout, /\.panel-heading\b/);
  assert.doesNotMatch(layout, /:global\([^)]*\.giu-panel__(?:header|title|body)/);
  assert.doesNotMatch(layout, /:global\([^)]*\.giu-surface[^)]*\s/);
});

test('Atelier themes only documented Panel and Surface hooks plus forwarded roots', () => {
  const layout = read('src/routes/studio/+layout.svelte');

  for (const token of [
    '--giu-panel-gap',
    '--giu-panel-padding',
    '--giu-panel-border-width',
    '--giu-panel-border-color',
    '--giu-panel-border-radius',
    '--giu-panel-color',
    '--giu-panel-background',
    '--giu-panel-header-gap',
    '--giu-panel-title-size',
    '--giu-panel-description-gap',
    '--giu-panel-description-color',
    '--giu-surface-padding',
    '--giu-surface-border-width',
    '--giu-surface-border-color',
    '--giu-surface-border-radius',
    '--giu-surface-color',
    '--giu-surface-background'
  ]) {
    assert.equal(layout.includes(token), true, `Studio layout must map ${token}`);
  }

  assert.match(layout, /:global\(\.atelier-studio-panel\)/);
  assert.match(layout, /:global\(\.atelier-studio-surface\)/);
  assert.match(layout, /box-shadow:\s*var\(--studio-shadow\)/);
});

test('real installed primitives preserve heading association and neutral surrounding semantics in SSR', async () => {
  const { body } = await renderRepresentativeComposition();

  assert.match(
    body,
    /<section id="settings"[^>]*class="[^"]*atelier-studio-panel[^"]*"[^>]*aria-labelledby="settings-title"/
  );
  assert.match(
    body,
    /<h2 id="settings-title"[^>]*>Studio settings(?:<!---->)?<\/h2>/
  );
  assert.match(body, /<form aria-label="Settings form">/);
  assert.equal((body.match(/<section\b/g) ?? []).length, 1);

  assert.match(body, /<nav aria-label="Help sections">/);
  assert.match(body, /<div class="[^"]*atelier-studio-surface[^"]*"/);
  const nav = body.match(/<nav[\s\S]*?<\/nav>/)?.[0] ?? '';
  assert.notEqual(nav, '');
  assert.doesNotMatch(nav, /<section\b|aria-labelledby=/);
});

test('representative installed Panel and Surface composition has no axe violations', async () => {
  const { body } = await renderRepresentativeComposition();
  const window = new Window({ url: 'http://localhost/' });
  const restore = installDomGlobals(window);

  try {
    window.document.documentElement.lang = 'en';
    window.document.title = 'Studio component adoption';
    window.document.body.innerHTML = `<main>${body}</main>`;
    const axe = (await import('axe-core')).default;
    const result = await axe.run(window.document, {
      runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa'] },
      rules: { 'color-contrast': { enabled: false } }
    });
    assert.deepEqual(
      result.violations.map((violation) => violation.id),
      [],
      result.violations.map((violation) => `${violation.id}: ${violation.help}`).join('\n')
    );
  } finally {
    restore();
    window.close();
  }
});
