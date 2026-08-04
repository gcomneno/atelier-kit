import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { pathToFileURL } from 'node:url';
import { build, createServer } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import { Window } from 'happy-dom';

const root = path.resolve('.');
const adapterPath = 'src/lib/components/StudioFieldLabel.svelte';
const harnessSource = `<script>
  import { setI18nContext } from '$lib/i18n/context.js';
  import StudioFieldLabel from '$adapter';

  let {
    locale = 'en',
    label = 'Display name',
    hint = '',
    required = false,
    optional = false,
    hintId
  } = $props();

  setI18nContext(() => locale);
</script>

<label for="field-label-harness-input">
  <StudioFieldLabel
    {label}
    {hint}
    {required}
    {optional}
    {hintId}
  />
  <input
    id="field-label-harness-input"
    name="field-label-harness-input"
    {required}
    aria-describedby={hintId}
  />
</label>
`;

/** @param {string} relativePath */
function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), 'utf8');
}

/**
 * @param {string} directory
 * @returns {string[]}
 */
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

function harnessAliases() {
  return [
    { find: '$adapter', replacement: path.join(root, adapterPath) },
    { find: '$lib', replacement: path.join(root, 'src/lib') }
  ];
}

async function createSsrHarness() {
  const harnessRoot = fs.mkdtempSync(path.join(root, '.tmp-field-label-ssr-'));
  fs.writeFileSync(path.join(harnessRoot, 'Harness.svelte'), harnessSource);

  const server = await createServer({
    configFile: false,
    root: harnessRoot,
    logLevel: 'error',
    appType: 'custom',
    plugins: [svelte({ compilerOptions: { css: 'injected' } })],
    resolve: { alias: harnessAliases(), dedupe: ['svelte'] },
    server: {
      middlewareMode: true,
      hmr: false,
      fs: { allow: [root, harnessRoot] }
    }
  });

  const harness = await server.ssrLoadModule('/Harness.svelte');
  const svelteServer = await server.ssrLoadModule('svelte/server');

  return {
    /** @param {Record<string, unknown>} props */
    render(props) {
      return svelteServer.render(harness.default, { props });
    },
    async close() {
      await server.close();
      fs.rmSync(harnessRoot, { recursive: true, force: true });
    }
  };
}

/** @param {string} body */
function accessibleMarker(body) {
  return body.match(/giu-field-label-marker__accessible[^>]*>([^<]+)</)?.[1] ?? '';
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
    MouseEvent: window.MouseEvent,
    KeyboardEvent: window.KeyboardEvent,
    MutationObserver: window.MutationObserver,
    getComputedStyle: window.getComputedStyle.bind(window),
    requestAnimationFrame: window.requestAnimationFrame.bind(window),
    cancelAnimationFrame: window.cancelAnimationFrame.bind(window)
  };
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

test('StudioFieldLabel is a thin Atelier adapter over the installed FieldLabel', () => {
  const source = read(adapterPath);

  assert.match(
    source,
    /import \{ FieldLabel \} from 'giadaware-ui-components\/studio'/
  );
  assert.match(source, /import \{ useI18n \} from '\$lib\/i18n\/context\.js'/);
  assert.match(source, /requiredLabel=\{t\('studio\.forms\.required'\)\}/);
  assert.match(source, /optionalLabel=\{t\('studio\.forms\.optional'\)\}/);
  assert.match(source, /\{hintId\}/);
  assert.match(source, /class="atelier-field-label__row"/);
  assert.doesNotMatch(source, /<label\b/);
  assert.doesNotMatch(source, /\{@html/);
});

test('all existing consumers retain the stable local adapter import', () => {
  const files = collectSvelteFiles(path.join(root, 'src'));
  const consumers = files.filter((file) =>
    fs.readFileSync(file, 'utf8').includes("from '$lib/components/StudioFieldLabel.svelte'")
  );
  const directPackageConsumers = files.filter((file) => {
    const source = fs.readFileSync(file, 'utf8');
    return file !== path.join(root, adapterPath) &&
      /import\s*\{[^}]*\bFieldLabel\b[^}]*\}\s*from\s*['"]giadaware-ui-components\/studio['"]/.test(source);
  });

  assert.equal(consumers.length, 21);
  assert.deepEqual(directPackageConsumers, []);
});

test('Atelier-owned tokens replace the obsolete global field-label classes', () => {
  const adapter = read(adapterPath);
  const layout = read('src/routes/studio/+layout.svelte');

  for (const token of [
    '--giu-field-label-row-gap',
    '--giu-field-label-color',
    '--giu-field-label-weight',
    '--giu-field-label-line-height',
    '--giu-field-label-marker-size',
    '--giu-field-label-marker-weight',
    '--giu-field-label-required-color',
    '--giu-field-label-optional-color',
    '--giu-field-label-hint-gap',
    '--giu-field-label-hint-color',
    '--giu-field-label-hint-size',
    '--giu-field-label-hint-line-height'
  ]) {
    assert.equal(adapter.includes(token), true, `${token} must be mapped by the adapter`);
  }

  assert.doesNotMatch(layout, /:global\(\.field-label-row\)/);
  assert.doesNotMatch(layout, /:global\(\.field-label\)/);
  assert.doesNotMatch(layout, /:global\(\.field-badge\.(?:required|optional)\)/);
  assert.match(
    layout,
    /:global\(:is\(\.atelier-studio-panel, \.atelier-studio-surface\) \.hint\)/
  );
});

test('Contact keeps conditional markers, native required attributes and server rules aligned', () => {
  const page = read('src/routes/studio/site/contact/+page.svelte');
  const server = read('src/lib/server/studio-site-server.js');

  assert.equal((page.match(/required=\{emailEnabled\}/g) ?? []).length, 2);
  assert.equal((page.match(/required=\{whatsappEnabled\}/g) ?? []).length, 2);
  assert.match(server, /if \(emailEnabled && emailAddress === ''\)/);
  assert.match(server, /if \(whatsappEnabled && whatsappPhone === ''\)/);
});

test('Signal Clouds uses one reactive source for checkbox, marker and native required state', () => {
  const page = read('src/routes/studio/signal-clouds/+page.svelte');
  const server = read('src/routes/studio/signal-clouds/+page.server.js');
  const validation = read('src/lib/signal-cloud-faq-validation.js');

  assert.match(page, /let faqVisibility = \$state\(/);
  assert.match(page, /bind:checked=\{faqVisibility\[cloudIndex\]\}/);
  assert.equal((page.match(/required=\{faqVisibility\[cloudIndex\]\}/g) ?? []).length, 2);
  assert.doesNotMatch(page, /HTMLTextAreaElement/);
  assert.match(server, /getSignalCloudFaqIssues\(clouds\)\[0\]/);
  assert.match(validation, /if \(faq\.visible === true\)/);
  assert.match(validation, /cloudFaqAnswerRequired/);
});

test('installed FieldLabel renders every adapter state with resolved translations in SSR', async () => {
  const harness = await createSsrHarness();

  try {
    const plain = harness.render({ label: 'Name' });
    assert.match(plain.body, /giu-field-label-row--plain/);
    assert.match(plain.body, />Name</);
    assert.doesNotMatch(plain.body, /giu-field-label-marker/);
    assert.doesNotMatch(plain.body, /giu-field-label-hint/);

    const hint = harness.render({
      label: 'Email',
      hint: 'Used for notifications.',
      hintId: 'email-hint'
    });
    assert.match(hint.body, /id="email-hint"/);
    assert.match(hint.body, /giu-field-label-hint/);
    assert.match(hint.body, /Used for notifications\./);

    const requiredEn = harness.render({ label: 'Email', required: true, locale: 'en' });
    const requiredIt = harness.render({ label: 'Email', required: true, locale: 'it' });
    assert.match(requiredEn.body, /giu-field-label-row--required/);
    assert.match(requiredEn.body, /giu-field-label-marker--required/);
    assert.match(requiredEn.body, /aria-hidden="true"/);
    assert.notEqual(accessibleMarker(requiredEn.body), '');
    assert.notEqual(accessibleMarker(requiredIt.body), '');
    assert.notEqual(accessibleMarker(requiredEn.body), accessibleMarker(requiredIt.body));
    assert.doesNotMatch(requiredEn.body, /studio\.forms\.required/);
    assert.doesNotMatch(requiredIt.body, /studio\.forms\.required/);

    const optionalEn = harness.render({ label: 'Nickname', optional: true, locale: 'en' });
    const optionalIt = harness.render({ label: 'Nickname', optional: true, locale: 'it' });
    assert.match(optionalEn.body, /giu-field-label-row--optional/);
    assert.match(optionalEn.body, /giu-field-label-marker--optional/);
    assert.notEqual(optionalEn.body, optionalIt.body);
    assert.doesNotMatch(optionalEn.body, /studio\.forms\.optional/);
    assert.doesNotMatch(optionalIt.body, /studio\.forms\.optional/);

    const both = harness.render({ label: 'Code', required: true, optional: true });
    assert.match(both.body, /giu-field-label-row--required/);
    assert.doesNotMatch(both.body, /giu-field-label-marker--optional/);

    assert.match(requiredEn.body, /<input[^>]*required/);
    assert.match(requiredEn.head, /--giu-field-label-required-color:\s*#b42318/);
  } finally {
    await harness.close();
  }
});

test('adapter hydration reuses the server-rendered label, hint and native control', async () => {
  const ssrHarness = await createSsrHarness();
  const props = {
    locale: 'en',
    label: 'Email',
    hint: 'Used for notifications.',
    hintId: 'hydration-email-hint',
    required: true
  };
  let ssr;

  try {
    ssr = ssrHarness.render(props);
  } finally {
    await ssrHarness.close();
  }

  const harnessRoot = fs.mkdtempSync(path.join(root, '.tmp-field-label-client-'));
  fs.writeFileSync(path.join(harnessRoot, 'Harness.svelte'), harnessSource);
  fs.writeFileSync(
    path.join(harnessRoot, 'entry.js'),
    "export { default as Harness } from './Harness.svelte';\nexport { hydrate, unmount } from 'svelte';\n"
  );

  try {
    await build({
      configFile: false,
      root: harnessRoot,
      logLevel: 'error',
      plugins: [svelte()],
      resolve: { alias: harnessAliases(), dedupe: ['svelte'] },
      build: {
        outDir: path.join(harnessRoot, 'dist'),
        emptyOutDir: true,
        minify: false,
        lib: {
          entry: path.join(harnessRoot, 'entry.js'),
          formats: ['es'],
          fileName: () => 'bundle.js'
        }
      }
    });

    const bundle = await import(
      `${pathToFileURL(path.join(harnessRoot, 'dist/bundle.js')).href}?${Date.now()}`
    );
    const window = new Window({ url: 'http://localhost/' });
    const restoreGlobals = installDomGlobals(window);

    try {
      const target = window.document.createElement('div');
      target.innerHTML = ssr.body;
      window.document.body.append(target);

      const row = target.querySelector('.giu-field-label-row');
      const hint = target.querySelector('.giu-field-label-hint');
      const input = target.querySelector('input');

      assert.ok(row);
      assert.ok(hint);
      assert.ok(input);

      const instance = bundle.hydrate(bundle.Harness, { target, props });
      await Promise.resolve();

      assert.equal(target.querySelector('.giu-field-label-row'), row);
      assert.equal(target.querySelector('.giu-field-label-hint'), hint);
      assert.equal(target.querySelector('input'), input);
      assert.equal(target.querySelectorAll('.giu-field-label-row').length, 1);
      assert.equal(target.querySelectorAll('.giu-field-label-hint').length, 1);
      assert.equal(target.querySelectorAll('input').length, 1);

      await bundle.unmount(instance);
    } finally {
      restoreGlobals();
      window.close();
    }
  } finally {
    fs.rmSync(harnessRoot, { recursive: true, force: true });
  }
});
