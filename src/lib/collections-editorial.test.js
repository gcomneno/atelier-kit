import assert from 'node:assert/strict';
import test from 'node:test';

import {
  mergeCollectionsEditorialConfig,
  normalizeCollectionsEditorialConfig,
  resolveCollectionsPageEyebrow,
  resolveCollectionsPageIntro,
  resolveCollectionsPageTitle,
  resolveHomeCollectionsEyebrow
} from './collections-editorial.js';

test('collections editorial config normalizes optional wording', () => {
  assert.deepEqual(
    normalizeCollectionsEditorialConfig({
      home_eyebrow: '  Series  ',
      page_eyebrow: '  Archive series  ',
      title: '  Book series  ',
      intro: '  Stories grouped by cycle.  '
    }),
    {
      home_eyebrow: 'Series',
      page_eyebrow: 'Archive series',
      title: 'Book series',
      intro: 'Stories grouped by cycle.'
    }
  );
});

test('collections editorial config fails safely for malformed runtime input', () => {
  assert.deepEqual(
    normalizeCollectionsEditorialConfig({
      home_eyebrow: 42,
      page_eyebrow: null,
      title: [],
      intro: 123
    }),
    {
      home_eyebrow: '',
      page_eyebrow: '',
      title: '',
      intro: ''
    }
  );

  assert.deepEqual(
    normalizeCollectionsEditorialConfig(null),
    {
      home_eyebrow: '',
      page_eyebrow: '',
      title: '',
      intro: ''
    }
  );
});

test('Home eyebrow prefers consumer wording', () => {
  assert.equal(
    resolveHomeCollectionsEyebrow(
      {
        home_eyebrow: 'Series',
        page_eyebrow: '',
        title: '',
        intro: ''
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
        page_eyebrow: '',
        title: '',
        intro: ''
      },
      'en'
    ),
    'Collections'
  );

  assert.equal(
    resolveHomeCollectionsEyebrow(
      {
        home_eyebrow: '',
        page_eyebrow: '',
        title: '',
        intro: ''
      },
      'it'
    ),
    'Collezioni'
  );
});

test('collections page title prefers consumer wording and falls back by locale', () => {
  assert.equal(
    resolveCollectionsPageTitle(
      {
        home_eyebrow: '',
        page_eyebrow: '',
        title: 'Book series',
        intro: ''
      },
      'en'
    ),
    'Book series'
  );

  assert.equal(
    resolveCollectionsPageTitle(
      {
        home_eyebrow: '',
        page_eyebrow: '',
        title: '',
        intro: ''
      },
      'en'
    ),
    'Collections'
  );

  assert.equal(
    resolveCollectionsPageTitle(
      {
        home_eyebrow: '',
        page_eyebrow: '',
        title: '',
        intro: ''
      },
      'it'
    ),
    'Collezioni'
  );
});

test('collections page intro prefers consumer wording and localizes fallback interpolation', () => {
  assert.equal(
    resolveCollectionsPageIntro(
      {
        home_eyebrow: '',
        page_eyebrow: '',
        title: '',
        intro: 'Stories grouped by cycle.'
      },
      'works',
      'en'
    ),
    'Stories grouped by cycle.'
  );

  assert.equal(
    resolveCollectionsPageIntro(
      {
        home_eyebrow: '',
        page_eyebrow: '',
        title: '',
        intro: ''
      },
      'works',
      'en'
    ),
    'Groups of works selected by theme or series.'
  );

  assert.equal(
    resolveCollectionsPageIntro(
      {
        home_eyebrow: '',
        page_eyebrow: '',
        title: '',
        intro: ''
      },
      'opere',
      'it'
    ),
    'Gruppi di opere selezionati per tema o serie.'
  );
});

test('collections page eyebrow prefers consumer wording', () => {
  assert.equal(
    resolveCollectionsPageEyebrow(
      {
        home_eyebrow: '',
        page_eyebrow: 'Series archive',
        title: '',
        intro: ''
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
        page_eyebrow: '',
        title: '',
        intro: ''
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
        page_eyebrow: '',
        title: '',
        intro: ''
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
        page_eyebrow: '',
        title: '',
        intro: ''
      },
      '',
      'it'
    ),
    'Collezioni'
  );
});

test('collections editorial merge owns all public wording and preserves unknown future fields', () => {
  assert.deepEqual(
    mergeCollectionsEditorialConfig(
      {
        title: 'Old page title',
        intro: 'Old introduction',
        home_eyebrow: 'Old home',
        page_eyebrow: 'Old page',
        future_field: 'Keep me'
      },
      {
        title: 'New page title',
        intro: '',
        home_eyebrow: 'New home',
        page_eyebrow: ''
      }
    ),
    {
      title: 'New page title',
      home_eyebrow: 'New home',
      future_field: 'Keep me'
    }
  );
});
