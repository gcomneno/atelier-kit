import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const STUDIO_ROOT = fileURLToPath(new URL('./', import.meta.url));
const COMPONENTS_ROOT = fileURLToPath(
  new URL('../../lib/components/', import.meta.url)
);
const MESSAGES_ROOT = fileURLToPath(
  new URL('../../lib/i18n/messages/', import.meta.url)
);

/** @param {string} path */
async function source(path) {
  return readFile(path, 'utf8');
}

test('Studio navigation retains Local, limits Hosted, and isolates the public Demo surface', async () => {
  const nav = await source(`${COMPONENTS_ROOT}StudioNav.svelte`);
  const localRoutes = [
    '/studio',
    '/studio/site/identity',
    '/studio/site/appearance',
    '/studio/site/hero',
    '/studio/site/layout',
    '/studio/site/contact',
    '/studio/site/social',
    '/studio/site/footer',
    '/studio/site/analytics',
    '/studio/about',
    '/studio/catalog',
    '/studio/items',
    '/studio/collections',
    '/studio/signal-clouds',
    '/studio/news',
    '/studio/readiness',
    '/studio/system',
    '/studio/help'
  ];

  for (const route of localRoutes) {
    assert.ok(nav.includes(`href="${route}"`));
  }

  const demoBranch = nav.match(
    /\{#if demoAuthoring\}([\s\S]*?)\{:else if hostedAuthoring\}/
  )?.[1];

  assert.ok(
    demoBranch,
    'Demo navigation branch must exist'
  );

  assert.deepEqual(
    [...demoBranch.matchAll(/href="([^"]+)"/g)]
      .map((match) => match[1]),
    ['/studio/site/social', '/']
  );

  assert.doesNotMatch(
    demoBranch,
    /target="_blank"|class="group"|group-title|sub-list/
  );

  const hostedBranch = nav.match(
    /\{:else if hostedAuthoring\}([\s\S]*?)\{:else\}/
  )?.[1];

  assert.ok(
    hostedBranch,
    'Hosted navigation branch must exist'
  );

  assert.deepEqual(
    [...hostedBranch.matchAll(/href="([^"]+)"/g)]
      .map((match) => match[1]),
    ['/studio', '/studio/site/social', '/']
  );

  assert.match(
    hostedBranch,
    /target="_blank"/
  );

  assert.doesNotMatch(
    hostedBranch,
    /class="group"|group-title|sub-list/
  );
});


test('Analytics settings route remains Local-only and carries no Hosted or Demo authority', async () => {
  const route = await source(
    `${STUDIO_ROOT}site/analytics/+page.server.js`
  );
  const nav = await source(
    `${COMPONENTS_ROOT}StudioNav.svelte`
  );

  assert.match(
    route,
    /export function load\(\)\s*\{\s*guardStudio\(\);/
  );

  assert.doesNotMatch(
    route,
    /hostedStudio|demoStudio|hostedAuthoring|demoAuthoring/
  );

  const demoBranch = nav.match(
    /\{#if demoAuthoring\}([\s\S]*?)\{:else if hostedAuthoring\}/
  )?.[1];

  const hostedBranch = nav.match(
    /\{:else if hostedAuthoring\}([\s\S]*?)\{:else\}/
  )?.[1];

  assert.ok(demoBranch);
  assert.ok(hostedBranch);
  assert.doesNotMatch(
    demoBranch,
    /\/studio\/site\/analytics/
  );
  assert.doesNotMatch(
    hostedBranch,
    /\/studio\/site\/analytics/
  );
});

test('Studio dashboard preserves Local zones and renders only Hosted Social and Preview cards', async () => {
  const dashboard = await source(`${STUDIO_ROOT}+page.svelte`);

  for (const route of [
    '/studio/site/identity',
    '/studio/about',
    '/studio/readiness',
    '/studio/system'
  ]) {
    assert.match(dashboard, new RegExp(`href: '${route}'`));
  }

  const hostedZones = dashboard.match(
    /const hostedZones = \[([\s\S]*?)\];/
  )?.[1];
  assert.ok(hostedZones, 'Hosted dashboard zones must exist');
  assert.match(hostedZones, /id: 'social', href: '\/studio\/site\/social'/);
  assert.match(hostedZones, /id: 'preview', href: '\/', tone: 'publish', external: true/);

  for (const deadRoute of [
    '/studio/site/identity',
    '/studio/about',
    '/studio/readiness',
    '/studio/system'
  ]) {
    assert.doesNotMatch(hostedZones, new RegExp(deadRoute));
  }

  assert.match(dashboard, /data\?\.hostedAuthoring \? hostedZones : zones/);
  assert.match(dashboard, /target=\{zone\.external \? '_blank' : undefined\}/);
});

test('Localized shell copy distinguishes Local, limited Hosted, and public Demo authoring', async () => {
  const layout = await source(`${STUDIO_ROOT}+layout.svelte`);
  const english = await source(`${MESSAGES_ROOT}en.js`);
  const italian = await source(`${MESSAGES_ROOT}it.js`);

  assert.match(
    layout,
    /data\.demoAuthoring[\s\S]*\? 'studio\.layout\.demoTitle'[\s\S]*: data\.hostedAuthoring[\s\S]*\? 'studio\.layout\.hostedTitle'[\s\S]*: 'studio\.layout\.title'/
  );
  assert.match(english, /title: 'Local authoring'/);
  assert.match(english, /hostedTitle: 'Hosted authoring'/);
  assert.match(english, /demoTitle:/);
  assert.match(english, /private PoC currently exposes a limited Hosted authoring surface/);
  assert.match(italian, /title: 'Modifica locale'/);
  assert.match(italian, /hostedTitle: 'Modifica ospitata'/);
  assert.match(italian, /demoTitle:/);
  assert.match(italian, /PoC privato espone al momento una superficie di modifica ospitata limitata/);
});

test('browser-visible Hosted and Demo layout capabilities are trusted server-derived booleans only', async () => {
  const layoutServer = await source(`${STUDIO_ROOT}+layout.server.js`);

  assert.match(layoutServer, /isTrustedHostedRequestContext/);
  assert.match(
    layoutServer,
    /hostedAuthoring:\s*isTrustedHostedRequestContext\(\s*locals\.hostedStudio\s*\)/
  );

  assert.match(
    layoutServer,
    /demoAuthoring:\s*isTrustedDemoRequestContext\(\s*locals\.demoStudio\s*\)/
  );

  for (const forbidden of [
    'sessionId',
    'logoutCsrfToken',
    'accessToken',
    'identity',
    'csrfToken',
    'repositoryCredential',
    'providerData',
    'hostedStudio:'
  ]) {
    assert.equal(
      layoutServer.includes(forbidden),
      false,
      `layout data must not serialize ${forbidden}`
    );
  }
});
