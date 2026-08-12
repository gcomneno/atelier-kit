import assert from 'node:assert/strict';
import {
  readFileSync
} from 'node:fs';
import test from 'node:test';
import {
  createTranslator
} from '../i18n/index.js';

test('Visitor Demo CTA uses POST bootstrap and exposes no authority material', () => {
  const home =
    readFileSync(
      'src/routes/+page.svelte',
      'utf8'
    );

  const server =
    readFileSync(
      'src/routes/+page.server.js',
      'utf8'
    );

  assert.match(
    home,
    /method="POST"\s+action="\/demo\/start"/
  );

  assert.match(
    home,
    /data\.demoAvailable/
  );

  assert.match(
    server,
    /resolveDemoPublicConfig/
  );

  for (const forbidden of [
    'ATELIER_DEMO_GITHUB_TOKEN',
    'ATELIER_DEMO_STATE_REDIS_REST_TOKEN',
    'ATELIER_DEMO_ISSUANCE_SECRET',
    'demo_csrf_token',
    'sessionId',
    'authoringRevision'
  ]) {
    assert.doesNotMatch(
      home,
      new RegExp(forbidden)
    );
  }
});

test('Demo Studio navigation exposes only Social and the public Visitor path', () => {
  const nav =
    readFileSync(
      'src/lib/components/StudioNav.svelte',
      'utf8'
    );

  const demoBranch =
    nav.slice(
      nav.indexOf(
        '{#if demoAuthoring}'
      ),
      nav.indexOf(
        '{:else if hostedAuthoring}'
      )
    );

  assert.match(
    demoBranch,
    /\/studio\/site\/social/
  );

  assert.match(
    demoBranch,
    /href="\/"/
  );

  for (const forbidden of [
    '/studio/site/identity',
    '/studio/site/appearance',
    '/studio/items',
    '/studio/readiness',
    '/studio/system',
    '/studio/help'
  ]) {
    assert.equal(
      demoBranch.includes(forbidden),
      false
    );
  }
});

test('Demo authoring is visibly distinct and links back to Visitor after save', () => {
  const layout =
    readFileSync(
      'src/routes/studio/+layout.svelte',
      'utf8'
    );

  const social =
    readFileSync(
      'src/routes/studio/site/social/+page.svelte',
      'utf8'
    );

  assert.match(
    layout,
    /studio\.layout\.demoTitle/
  );

  assert.match(
    layout,
    /demoAuthoring=\{data\.demoAuthoring\}/
  );

  assert.match(
    social,
    /studio\.demo\.socialIntro/
  );

  assert.match(
    social,
    /form\?\.socialStatus === 'success'/
  );

  assert.match(
    social,
    /studio\.demo\.viewUpdatedSite/
  );

  assert.match(
    social,
    /href="\/"/
  );
});

test('Demo UX copy is bilingual', () => {
  const en =
    createTranslator('en');

  const it =
    createTranslator('it');

  assert.equal(
    en('visitor.home.demo.action'),
    'Try Studio'
  );

  assert.equal(
    it('visitor.home.demo.action'),
    'Prova Studio'
  );

  assert.equal(
    en('studio.layout.demoTitle'),
    'Demo Studio'
  );

  assert.equal(
    it('studio.layout.demoTitle'),
    'Studio Demo'
  );

  assert.match(
    en('studio.demo.expiryNote'),
    /temporary/i
  );

  assert.match(
    it('studio.demo.expiryNote'),
    /temporanea/i
  );
});
