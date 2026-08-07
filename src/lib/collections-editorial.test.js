import assert from 'node:assert/strict';
import test from 'node:test';

import {
  mergeCollectionsEditorialConfig,
  normalizeCollectionsEditorialConfig,
  resolveCollectionsPageEyebrow,
  resolveHomeCollectionsEyebrow
} from './collections-editorial.js';

test('collections editorial config normalizes optional wording', () => {
  assert.deepEqual(
    normalizeCollectionsEditorialConfig({
      home_eyebrow: '  Series  ',
      page_eyebrow: '  Archive series  '
    }),
    {
      home_eyebrow: 'Series',
      page_eyebrow: 'Archive series'
    }
  );
});

test('collections editorial config fails safely for malformed runtime input', () => {
  assert.deepEqual(
    normalizeCollectionsEditorialConfig({
      home_eyebrow: 42,
      page_eyebrow: null
    }),
    {
      home_eyebrow: '',
      page_eyebrow: ''
    }
  );

  assert.deepEqual(
    normalizeCollectionsEditorialConfig(null),
    {
      home_eyebrow: '',
      page_eyebrow: ''
    }
  );
});

test('Home eyebrow prefers consumer wording', () => {
  assert.equal(
    resolveHomeCollectionsEyebrow(
      {
        home_eyebrow: 'Series',
        page_eyebrow: ''
      },
      'en'
    ),
    'Series'
  );
});

test('Home eyebrow falls back to localized visitor wording', () => {
  assert.equal(
    resolveHomeCollectionsEyebrow(
      {
        home_eyebrow: '',
        page_eyebrow: ''
      },
      'en'
    ),
    'Collections'
  );

  assert.equal(
    resolveHomeCollectionsEyebrow(
      {
        home_eyebrow: '',
        page_eyebrow: ''
      },
      'it'
    ),
    'Collezioni'
  );
});

test('collections page eyebrow prefers consumer wording', () => {
  assert.equal(
    resolveCollectionsPageEyebrow(
      {
        home_eyebrow: '',
        page_eyebrow: 'Series archive'
      },
      'Structural label',
      'en'
    ),
    'Series archive'
  );
});

test('collections page eyebrow falls back to the Layout block label', () => {
  assert.equal(
    resolveCollectionsPageEyebrow(
      {
        home_eyebrow: '',
        page_eyebrow: ''
      },
      'Works',
      'en'
    ),
    'Works'
  );
});

test('collections page eyebrow finally falls back to localized wording', () => {
  assert.equal(
    resolveCollectionsPageEyebrow(
      {
        home_eyebrow: '',
        page_eyebrow: ''
      },
      '',
      'en'
    ),
    'Collections'
  );

  assert.equal(
    resolveCollectionsPageEyebrow(
      {
        home_eyebrow: '',
        page_eyebrow: ''
      },
      '',
      'it'
    ),
    'Collezioni'
  );
});


test('collections editorial merge preserves future fields', () => {
  assert.deepEqual(
    mergeCollectionsEditorialConfig(
      {
        title: 'Future page title',
        intro: 'Future introduction',
        home_eyebrow: 'Old home',
        page_eyebrow: 'Old page'
      },
      {
        home_eyebrow: 'New home',
        page_eyebrow: ''
      }
    ),
    {
      title: 'Future page title',
      intro: 'Future introduction',
      home_eyebrow: 'New home'
    }
  );
});
