import assert from 'node:assert/strict';
import test from 'node:test';

import {
  filterVisitorAnalyticsEvent,
  isStudioAnalyticsPath,
  resolveSiteAnalytics,
  validateSiteAnalyticsConfig
} from './site-analytics.js';

test('site analytics is disabled by default and fails closed for malformed runtime values', () => {
  assert.deepEqual(resolveSiteAnalytics(undefined), {
    provider: '',
    enabled: false
  });
  assert.deepEqual(resolveSiteAnalytics(null), {
    provider: '',
    enabled: false
  });
  assert.deepEqual(resolveSiteAnalytics({}), {
    provider: '',
    enabled: false
  });
  assert.deepEqual(
    resolveSiteAnalytics({ provider: 'plausible', enabled: true }),
    { provider: '', enabled: false }
  );
  assert.deepEqual(
    resolveSiteAnalytics({ provider: 'vercel', enabled: false }),
    { provider: '', enabled: false }
  );
});

test('site analytics resolves only the explicit enabled Vercel contract', () => {
  assert.deepEqual(
    resolveSiteAnalytics({ provider: 'vercel', enabled: true }),
    { provider: 'vercel', enabled: true }
  );
});

test('site analytics validation accepts absence and the finite Vercel schema', () => {
  assert.deepEqual(validateSiteAnalyticsConfig(undefined), { ok: true });
  assert.deepEqual(
    validateSiteAnalyticsConfig({ provider: 'vercel', enabled: true }),
    { ok: true }
  );
  assert.deepEqual(
    validateSiteAnalyticsConfig({ provider: 'vercel', enabled: false }),
    { ok: true }
  );
});

test('site analytics validation rejects malformed values and unsupported providers', () => {
  assert.deepEqual(validateSiteAnalyticsConfig(null), {
    ok: false,
    reason: 'object'
  });
  assert.deepEqual(validateSiteAnalyticsConfig([]), {
    ok: false,
    reason: 'object'
  });
  assert.deepEqual(
    validateSiteAnalyticsConfig({ provider: 'other', enabled: true }),
    { ok: false, reason: 'provider' }
  );
  assert.deepEqual(
    validateSiteAnalyticsConfig({ provider: 'vercel', enabled: 'yes' }),
    { ok: false, reason: 'enabled' }
  );
});

test('Studio pathname matching is exact to the Studio route namespace', () => {
  assert.equal(isStudioAnalyticsPath('/studio'), true);
  assert.equal(isStudioAnalyticsPath('/studio/site/hero'), true);
  assert.equal(isStudioAnalyticsPath('/studioish'), false);
  assert.equal(isStudioAnalyticsPath('/catalog'), false);
});

test('beforeSend filtering drops Studio events while preserving Visitor events', () => {
  const visitor = { type: 'pageview', url: 'https://example.test/items/chair' };
  const studio = { type: 'pageview', url: 'https://example.test/studio/site/hero' };

  assert.equal(filterVisitorAnalyticsEvent(visitor), visitor);
  assert.equal(filterVisitorAnalyticsEvent(studio), null);
});
