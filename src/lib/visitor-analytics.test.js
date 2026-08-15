import assert from 'node:assert/strict';
import test from 'node:test';

import {
  initializeVisitorAnalytics,
  resetVisitorAnalyticsForTests,
  shouldInitializeVisitorAnalytics
} from './visitor-analytics.js';

test.afterEach(() => {
  resetVisitorAnalyticsForTests();
});

test('Visitor analytics initializes only for enabled Vercel configuration', () => {
  assert.equal(
    shouldInitializeVisitorAnalytics(
      { provider: 'vercel', enabled: true },
      '/catalog'
    ),
    true
  );
  assert.equal(
    shouldInitializeVisitorAnalytics(undefined, '/catalog'),
    false
  );
  assert.equal(
    shouldInitializeVisitorAnalytics(
      { provider: 'vercel', enabled: false },
      '/catalog'
    ),
    false
  );
});

test('direct Studio routes never initialize Analytics', async () => {
  let imports = 0;

  const result = initializeVisitorAnalytics(
    { provider: 'vercel', enabled: true },
    '/studio/site/hero',
    async () => {
      imports += 1;
      return { injectAnalytics() {} };
    }
  );

  assert.equal(result, null);
  assert.equal(imports, 0);
});

test('enabled Visitor analytics initializes SvelteKit once and installs the Studio event filter', async () => {
  let imports = 0;
  let injects = 0;
  /** @type {object | undefined} */
  let options;

  const loadAnalytics = async () => {
    imports += 1;

    return {
      /** @param {object | undefined} value */
      injectAnalytics(value) {
        injects += 1;
        options = value;
      }
    };
  };

  await initializeVisitorAnalytics(
    { provider: 'vercel', enabled: true },
    '/',
    loadAnalytics
  );

  await initializeVisitorAnalytics(
    { provider: 'vercel', enabled: true },
    '/catalog',
    loadAnalytics
  );

  assert.equal(imports, 1);
  assert.equal(injects, 1);
  assert.ok(options);

  const beforeSend = Reflect.get(options, 'beforeSend');

  assert.equal(typeof beforeSend, 'function');

  assert.equal(
    beforeSend({
      type: 'pageview',
      url: 'https://example.test/studio'
    }),
    null
  );

  const visitorEvent = {
    type: 'pageview',
    url: 'https://example.test/items/chair'
  };

  assert.equal(beforeSend(visitorEvent), visitorEvent);
});
