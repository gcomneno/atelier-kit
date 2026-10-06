import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import { createTranslator } from '../src/lib/i18n/index.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const cacheDir = fs.mkdtempSync(path.join(os.tmpdir(), 'atelier-giada-ui-'));
const environmentKeys = ['ATELIER_STUDIO', 'ATELIER_STUDIO_MODE'];
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
        name: 'giada-ui-public-page-test',
        resolveId(id) {
          if (id === '$app/environment') return '\0giada-ui-environment';
          if (id === '/__giada-ui-harness.svelte') return id;
        },
        load(id) {
          if (id === '\0giada-ui-environment') return 'export const dev = false;';
          if (id === '/__giada-ui-harness.svelte') {
            return `<script>
              import Page from '/src/routes/giada-ui/+page.svelte';
              import { setVisitorI18nContext } from '$lib/i18n/visitor-context.js';
              let { data } = $props();
              setVisitorI18nContext(() => data.locale);
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

/** @type {Array<{ mode: ReturnType<typeof import('../src/lib/server/studio-guard.js').getStudioRuntimeMode>, environment: Record<string, string> }>} */
const runtimeCases = [
  { mode: 'visitor', environment: {} },
  { mode: 'local', environment: { ATELIER_STUDIO: '1' } },
  { mode: 'hosted', environment: { ATELIER_STUDIO_MODE: 'hosted' } },
  { mode: 'invalid', environment: { ATELIER_STUDIO_MODE: '' } },
  { mode: 'invalid', environment: { ATELIER_STUDIO_MODE: 'unknown' } },
  { mode: 'invalid', environment: { ATELIER_STUDIO_MODE: 'demo', ATELIER_STUDIO: '1' } },
  { mode: 'invalid', environment: { ATELIER_STUDIO_MODE: 'hosted', ATELIER_STUDIO: '1' } },
  { mode: 'demo', environment: { ATELIER_STUDIO_MODE: 'demo' } }
];

/** @param {string} method @param {string} query */
function eventFor(method, query = '') {
  const url = new URL(`https://example.test/giada-ui${query}`);
  const forbidden = () => { throw new Error('Public page must not touch authority or cookies'); };
  return {
    url,
    request: new Request(url, {
      method,
      headers: query ? { cookie: '__Host-atelier_demo_session=forged' } : {}
    }),
    cookies: { get: forbidden, set: forbidden, delete: forbidden },
    locals: {}
  };
}

test('anonymous admission, navigation and sitemap depend only on Demo runtime', async () => {
  const page = await server.ssrLoadModule('/src/routes/giada-ui/+page.server.js');
  const layout = await server.ssrLoadModule('/src/routes/+layout.server.js');
  const sitemap = await server.ssrLoadModule('/src/routes/sitemap.xml/+server.js');
  const guard = await server.ssrLoadModule('/src/lib/server/studio-guard.js');

  assert.equal(page.prerender, false);
  assert.deepEqual(Object.keys(page).sort(), ['load', 'prerender']);

  for (const { mode, environment } of runtimeCases) {
    setRuntime(environment);
    assert.equal(guard.getStudioRuntimeMode(), mode);
    for (const query of ['', '?demoAvailable=1&runtime=demo&ATELIER_STUDIO_MODE=demo']) {
      for (const method of ['GET', 'HEAD']) {
        const event = eventFor(method, query);
        if (mode === 'demo') assert.deepEqual(await page.load(event), {});
        else {
          await assert.rejects(async () => page.load(event), (error) => error !== null && typeof error === 'object' && 'status' in error && error.status === 404);
        }
        assert.deepEqual(event.locals, {});
      }

      const event = eventFor('GET', query);
      const data = layout.load(event);
      const links = data.menuNav.filter((/** @type {{ href: string }} */ { href }) => href === '/giada-ui');
      assert.equal(links.length, mode === 'demo' ? 1 : 0);
      if (links.length) {
        assert.equal(links[0].label, createTranslator(data.locale)('visitor.giadaUi.navLabel'));
        assert.equal(data.menuNav.at(-1).href, '/giada-ui');
      }

      const xml = await sitemap.GET(event).text();
      assert.equal(xml.includes('/giada-ui</loc>'), mode === 'demo');
    }
  }
});

test('GET and HEAD stay outside Demo and Hosted security composition', async () => {
  const demo = await server.ssrLoadModule('/src/lib/server/demo-public-http.js');
  const hosted = await server.ssrLoadModule('/src/lib/server/hosted-private-poc-http.js');
  const hooks = await server.ssrLoadModule('/src/hooks.server.js');
  const guard = await server.ssrLoadModule('/src/lib/server/studio-guard.js');
  const page = await server.ssrLoadModule('/src/routes/giada-ui/+page.server.js');
  const originalFetch = globalThis.fetch;
  let resolutions = 0;
  const runtimeResolver = () => { throw new Error('No session, mutation or security-store work'); };

  globalThis.fetch = async () => { throw new Error('No network work'); };
  try {
    for (const { mode, environment } of runtimeCases) {
      setRuntime(environment);
      for (const method of ['GET', 'HEAD']) {
        const event = eventFor(method, '?runtime=demo');
        assert.equal(await demo.applyDemoPublicSocialAuthorizedRequest({
          event, runtimeMode: mode, runtimeResolver
        }), demo.DEMO_PUBLIC_HTTP_OUTCOMES.INERT);
        assert.equal(await hosted.applyHostedPrivatePocStudioAuthorizedRequest({
          event, runtimeMode: mode, runtimeResolver
        }), hosted.HOSTED_PRIVATE_POC_HTTP_OUTCOMES.INERT);
        await hooks.handle({
          event,
          resolve: async () => { resolutions += 1; return new Response(); }
        });
        assert.deepEqual(event.locals, {});
      }
    }
    assert.equal(resolutions, runtimeCases.length * 2);

    setRuntime({ ATELIER_STUDIO_MODE: 'demo' });
    page.load(eventFor('GET'));
    assert.throws(() => guard.guardStudio(), (error) => error !== null && typeof error === 'object' && 'status' in error && error.status === 404);
    assert.throws(() => guard.guardStudioShell({}, {}), (error) => error !== null && typeof error === 'object' && 'status' in error && error.status === 404);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('robots and item/news search are identical across runtimes', async () => {
  const robots = await server.ssrLoadModule('/src/routes/robots.txt/+server.js');
  const search = await server.ssrLoadModule('/src/lib/server/search-index.js');
  const baselineRobots = await robots.GET(eventFor('GET')).text();
  /** @type {import('../src/lib/search-index.js').SearchEntry[]} */
  const baselineSearch = search.buildSearchIndex();

  assert.match(baselineRobots, /User-agent: \*\nDisallow:\n/);
  assert.ok(baselineSearch.every(({ type }) => type === 'item' || type === 'news'));
  for (const { environment } of runtimeCases) {
    setRuntime(environment);
    assert.equal(await robots.GET(eventFor('GET')).text(), baselineRobots);
    assert.deepEqual(search.buildSearchIndex(), baselineSearch);
  }
  assert.doesNotMatch(baselineRobots, /giada-ui/);
  assert.equal(baselineSearch.some(({ href }) => href === '/giada-ui'), false);
});

test('SSR renders bilingual documentary content, public links and exactly three examples', async () => {
  const harness = await server.ssrLoadModule('/__giada-ui-harness.svelte');
  const { render } = await server.ssrLoadModule('svelte/server');
  for (const locale of ['en', 'it']) {
    const t = createTranslator(locale);
    const { body, head } = render(harness.default, {
      props: { data: { locale, site: { name: 'Atelier-Kit' } } }
    });
    for (const key of ['intro', 'packageOwns', 'consumerOwns', 'scope']) {
      assert.ok(body.includes(t(`visitor.giadaUi.${key}`)), key);
    }
    assert.ok(head.includes(t('visitor.giadaUi.title')));
    assert.equal((body.match(/<section\b/g) ?? []).length, 3);
    for (const name of ['SocialIcon', 'FormStatus', 'RelationshipGraph']) {
      assert.ok(body.includes(`>${name}</h2>`));
    }
    for (const url of [
      'https://github.com/gcomneno/giadaware-ui-components',
      'https://github.com/gcomneno/giadaware-ui-components/blob/main/docs/interface-guide.md',
      'https://github.com/gcomneno/giadaware-ui-components#living-consumer-demo'
    ]) assert.ok(body.includes(`href="${url}"`));
    assert.ok(body.includes(`aria-label="${t('visitor.giadaUi.social.label')}"`));
    assert.ok(body.includes(t('visitor.giadaUi.graph.idea')));
    assert.ok(body.includes(t('visitor.giadaUi.graph.study')));
    assert.ok(body.includes(t('visitor.giadaUi.graph.work')));
    assert.equal(body.includes(t('visitor.giadaUi.status.message')), false);
    assert.doesNotMatch(body, /href="\/items\/|<form\b|csrf|authoringRevision/);
  }
});

test('visitor imports and sample callbacks contain no authoring, persistence or navigation', () => {
  const page = read('src/routes/giada-ui/+page.svelte');
  const loader = read('src/routes/giada-ui/+page.server.js');
  assert.match(page, /import \{ FormStatus, SocialIcon \} from 'giadaware-ui-components'/);
  assert.match(page, /import \{ RelationshipGraph \} from 'giadaware-ui-components\/visitor'/);
  assert.doesNotMatch(page, /studio|\/styles\.css|\$app\/|fetch\(|localStorage|sessionStorage|document\.|window\.|goto\(|<form\b/);
  assert.doesNotMatch(loader, /demoAvailable|Redis|session|cookies|csrf|actions|POST|authoring/);
  assert.match(page, /durationMs=\{null\}/);
  assert.match(page, /onclick=\{\(\) => \{ showFeedback = true; \}\}/);
  assert.match(page, /onclick=\{\(\) => \{ showFeedback = false; \}\}/);
  assert.match(page, /onnodeselect=\{\(\{ node \}\) => \{ selected = node\.label; \}\}/);
  assert.match(page, /onnodeactivate=\{\(\{ node \}\) => \{ activated = node\.label; \}\}/);
  const graphData = page.slice(page.indexOf('const nodes'), page.indexOf('/** @returns'));
  assert.doesNotMatch(graphData, /href:|\/items\/|Math\.random|Date\./);
  assert.equal(fs.existsSync(path.join(root, 'src/routes/giada-ui/+server.js')), false);
});
