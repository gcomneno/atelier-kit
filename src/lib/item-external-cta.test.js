import assert from 'node:assert/strict';
import test from 'node:test';

import {
  getItemExternalCtaIssues,
  isValidItemExternalCtaHref,
  normalizeItemExternalCta
} from './item-external-cta.js';

test('accepts absolute http and https CTA destinations', () => {
  assert.equal(
    isValidItemExternalCtaHref('https://store.example.test/item'),
    true
  );

  assert.equal(
    isValidItemExternalCtaHref('http://example.test/item'),
    true
  );
});

test('rejects internal, non-http and malformed CTA destinations', () => {
  for (const href of [
    '',
    '/items/example',
    'mailto:test@example.test',
    'javascript:alert(1)',
    'not a url'
  ]) {
    assert.equal(isValidItemExternalCtaHref(href), false);
  }
});

test('normalizes a valid external CTA', () => {
  assert.deepEqual(
    normalizeItemExternalCta({
      href: '  https://store.example.test/item  ',
      label: '  Open external page  '
    }),
    {
      href: 'https://store.example.test/item',
      label: 'Open external page'
    }
  );
});

test('runtime normalization fails closed for malformed CTA records', () => {
  assert.equal(normalizeItemExternalCta(undefined), null);
  assert.equal(normalizeItemExternalCta(null), null);
  assert.equal(normalizeItemExternalCta([]), null);
  assert.equal(
    normalizeItemExternalCta({
      href: '/internal',
      label: 'Internal'
    }),
    null
  );
  assert.equal(
    normalizeItemExternalCta({
      href: 'https://example.test',
      label: ''
    }),
    null
  );
});

test('authoring validation distinguishes object, href and label failures', () => {
  assert.deepEqual(getItemExternalCtaIssues(undefined), []);
  assert.deepEqual(getItemExternalCtaIssues('bad'), ['object']);

  assert.deepEqual(
    getItemExternalCtaIssues({
      href: '/internal',
      label: ''
    }),
    ['href', 'label']
  );

  assert.deepEqual(
    getItemExternalCtaIssues({
      href: 'https://example.test',
      label: 'Read more'
    }),
    []
  );
});
