import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';
import { Window } from 'happy-dom';
import { svelte } from '@sveltejs/vite-plugin-svelte';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const cacheDir = fs.mkdtempSync(path.join(os.tmpdir(), 'atelier-demo-showcase-'));
const environmentKeys = [
  'ATELIER_STUDIO', 'ATELIER_STUDIO_MODE', 'ATELIER_DEMO_PUBLIC',
  'ATELIER_DEMO_CANONICAL_ORIGIN', 'ATELIER_DEMO_STATE_REDIS_REST_URL',
  'ATELIER_DEMO_STATE_REDIS_REST_TOKEN', 'ATELIER_DEMO_STATE_NAMESPACE',
  'ATELIER_DEMO_ISSUANCE_SECRET'
];
/** @type {Array<[string, string | undefined]>} */
const originalEnvironment = environmentKeys.map((key) => [key, process.env[key]]);
/** @type {import('vite').ViteDevServer} */
let server;

/** @param {string} relativePath */
function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), 'utf8');
}

/** @param {Record<string, string>} environment */
function setRuntime(environment) {
  for (const key of environmentKeys) delete process.env[key];
  Object.assign(process.env, environment);
}

test.before(async () => {
  server = await createServer({
    configFile: false,
    root,
    cacheDir,
    logLevel: 'error',
    appType: 'custom',
    plugins: [
      {
        name: 'demo-showcase-test',
        resolveId(id) {
          if (id === '$app/environment') return '\0demo-showcase-environment';
          if (id === '/__demo-showcase-harness.svelte') return id;
        },
        load(id) {
          if (id === '\0demo-showcase-environment') return 'export const dev = false;';
          if (id === '/__demo-showcase-harness.svelte') {
            return `<script>
              import Page from '/src/routes/+page.svelte';
              import { setVisitorI18nContext } from '$lib/i18n/visitor-context.js';
              let { data } = $props();
              setVisitorI18nContext(() => data.site.language);
            </script>
            <Page {data} />`;
          }
        }
      },
      svelte({ compilerOptions: { css: 'injected' } })
    ],
    resolve: { alias: { $lib: path.join(root, 'src/lib') } },
    optimizeDeps: { noDiscovery: true, include: [] },
    server: { middlewareMode: true, hmr: false }
  });
});

test.after(async () => {
  await server?.close();
  fs.rmSync(cacheDir, { recursive: true, force: true });
  for (const [key, value] of originalEnvironment) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
});

const readyEnvironment = {
  ATELIER_STUDIO_MODE: 'demo',
  ATELIER_DEMO_PUBLIC: '1',
  ATELIER_DEMO_CANONICAL_ORIGIN: 'https://demo.example.test',
  ATELIER_DEMO_STATE_REDIS_REST_URL: 'https://redis.example.test',
  ATELIER_DEMO_STATE_REDIS_REST_TOKEN: 'test-only-token',
  ATELIER_DEMO_STATE_NAMESPACE: 'demo-showcase-test',
  ATELIER_DEMO_ISSUANCE_SECRET: Buffer.alloc(32, 91).toString('base64url')
};

/** @param {Record<string, any>} data */
async function documentFor(data) {
  const harness = await server.ssrLoadModule('/__demo-showcase-harness.svelte');
  const { render } = await server.ssrLoadModule('svelte/server');
  const window = new Window();
  window.document.body.innerHTML = render(harness.default, { props: { data } }).body;
  return window.document;
}

test('only server Demo runtime enables showcase; browser query and cookies cannot enable it', async () => {
  const page = await server.ssrLoadModule('/src/routes/+page.server.js');
  /** @type {Array<Record<string, string>>} */
  const cases = [
    {},
    { ATELIER_STUDIO: '1' },
    { ATELIER_STUDIO_MODE: 'local' },
    { ATELIER_STUDIO_MODE: 'hosted' },
    { ATELIER_STUDIO_MODE: '' },
    { ATELIER_STUDIO_MODE: 'unknown' },
    { ATELIER_STUDIO_MODE: 'demo', ATELIER_STUDIO: '1' },
    { ATELIER_STUDIO_MODE: 'demo' }
  ];
  for (const environment of cases) {
    setRuntime(environment);
    const expected = environment.ATELIER_STUDIO_MODE === 'demo' && !environment.ATELIER_STUDIO;
    for (const query of ['', '?runtime=demo&ATELIER_STUDIO_MODE=demo&demoShowcaseVisible=true&demoAvailable=1']) {
      const url = new URL(`https://example.test/${query}`);
      const data = page.load({
        url,
        request: new Request(url, { headers: { cookie: 'runtime=demo; demoShowcaseVisible=true; __Host-atelier_demo_session=forged' } }),
        cookies: { get() { throw new Error('Showcase must not read cookies'); } }
      });
      assert.equal(data.demoShowcaseVisible, expected);
      assert.equal(data.demoAvailable, false);
      const document = await documentFor(data);
      assert.equal(document.querySelectorAll('.demo-showcase').length, expected ? 1 : 0);
    }
  }
});

test('Demo presentation stays visible with disabled, missing, malformed or ready authoring configuration', async () => {
  const page = await server.ssrLoadModule('/src/routes/+page.server.js');
  /** @type {Array<[Record<string, string>, boolean]>} */
  const cases = [
    [{ ATELIER_STUDIO_MODE: 'demo' }, false],
    [{ ATELIER_STUDIO_MODE: 'demo', ATELIER_DEMO_PUBLIC: '0' }, false],
    [{ ATELIER_STUDIO_MODE: 'demo', ATELIER_DEMO_PUBLIC: '1' }, false],
    [{ ...readyEnvironment, ATELIER_DEMO_STATE_REDIS_REST_URL: 'invalid' }, false],
    [readyEnvironment, true]
  ];
  for (const [environment, available] of cases) {
    setRuntime(environment);
    const data = page.load();
    assert.equal(data.demoShowcaseVisible, true);
    assert.equal(data.demoAvailable, available);
    const document = await documentFor(data);
    assert.ok(document.querySelector('.demo-showcase'));
    assert.equal(document.querySelectorAll('form[action="/demo/start"]').length, available ? 1 : 0);
  }
});

test('SSR renders exactly three bilingual consumers and two correct ordinary links outside hero and catalog', async () => {
  setRuntime({ ATELIER_STUDIO_MODE: 'demo' });
  const page = await server.ssrLoadModule('/src/routes/+page.server.js');
  /** @type {Record<string, string[]>} */
  const descriptions = {
    it: [
      'Universo narrativo delle Cronache del Gentiluomo delle Ombre.',
      'Progetto editoriale dedicato a storie e universi narrativi.',
      "Vetrina di narrativa satirica e racconti dell'assurdo."
    ],
    en: [
      'The narrative universe of the Chronicles of the Gentleman of Shadows.',
      'An editorial project dedicated to stories and narrative universes.',
      'A showcase of satirical fiction and tales of the absurd.'
    ]
  };
  for (const language of ['it', 'en']) {
    const data = page.load();
    data.site = { ...data.site, language };
    const document = await documentFor(data);
    const section = document.querySelector('.demo-showcase');
    assert.ok(section);
    assert.equal(section.parentElement?.tagName, 'MAIN');
    assert.equal(section.closest('.home-intro, .home-sidebar, .catalog'), null);
    assert.equal(section.querySelector('h2')?.id, section.getAttribute('aria-labelledby'));
    assert.equal(section.querySelector('h2')?.textContent, 'Built with Atelier-Kit');
    const entries = [...section.querySelectorAll('li')];
    assert.equal(entries.length, 3);
    assert.deepEqual(entries.map((entry) => entry.querySelector('h3')?.textContent),
      ['Ombre Quotidiane', 'Universi Condivisi', "Club dell'Assurdo"]);
    assert.deepEqual(entries.map((entry) => entry.querySelector('p')?.textContent), descriptions[language]);
    assert.equal(entries[1].querySelector('a'), null);
    assert.deepEqual([...section.querySelectorAll('a')].map((a) => [a.textContent, a.getAttribute('href')]), [
      ['Ombre Quotidiane', 'https://ombre-quotidiane-giadaware.vercel.app/'],
      ["Club dell'Assurdo", 'https://club-dell-assurdo.vercel.app/']
    ]);
    assert.equal(section.querySelector('form, button, iframe, img, script'), null);
    const repeated = await documentFor(data);
    assert.equal(repeated.querySelector('.demo-showcase')?.outerHTML, section.outerHTML);
  }
});

test('homepage resolves runtime once and keeps showcase separate from authoring configuration', () => {
  const loader = read('src/routes/+page.server.js');
  assert.equal([...loader.matchAll(/getStudioRuntimeMode\(\)/g)].length, 1);
  assert.match(loader, /demoShowcaseVisible: runtime === 'demo'/);
});
