import assert from 'node:assert/strict';
import test from 'node:test';
import {
  NEWS_CANONICAL_EDIT_FIELDS,
  mergeNewsCanonicalEditValues
} from './news-authoring.js';

test('News edit merge preserves unrelated scalar nested object array and sort order values', () => {
  const existing = {
    id: 'launch-note',
    title: 'Before',
    date: '2026-01-01',
    body: 'Before body',
    client_note: 'Owned by the client',
    client_meta: {
      featured: true,
      tags: ['launch', 'press'],
      links: [{ href: 'https://example.test', label: 'Reference' }]
    },
    client_sections: [
      { kind: 'quote', text: 'Keep this' },
      { kind: 'cta', href: '/contact' }
    ],
    sort_order: 40
  };

  const merged = mergeNewsCanonicalEditValues(existing, {
    id: 'launch-note',
    title: 'After',
    date: '2026-02-03',
    body: 'After body'
  });

  assert.equal(merged.client_note, 'Owned by the client');
  assert.deepEqual(merged.client_meta, existing.client_meta);
  assert.deepEqual(merged.client_sections, existing.client_sections);
  assert.equal(merged.sort_order, 40);
});

test('News edit merge replaces canonical fields and clears omitted optional canonical fields', () => {
  const merged = mergeNewsCanonicalEditValues(
    {
      id: 'studio-note',
      title: 'Before',
      date: '2026-01-01',
      body: 'Before body',
      excerpt: 'Before excerpt',
      image_file: '/images/news/before.jpg',
      image_alt: 'Before alt'
    },
    {
      id: 'studio-note',
      title: 'After',
      date: '2026-02-03',
      body: 'After body',
      image_file: '/images/news/after.jpg'
    }
  );

  assert.deepEqual(merged, {
    id: 'studio-note',
    title: 'After',
    date: '2026-02-03',
    body: 'After body',
    image_file: '/images/news/after.jpg'
  });
});

test('News edit merge accepts only the canonical News edit field set from replacement values', () => {
  const merged = mergeNewsCanonicalEditValues(
    {
      id: 'trusted-existing',
      title: 'Before',
      date: '2026-01-01',
      body: 'Before body',
      client_note: 'trusted existing',
      sort_order: 10
    },
    {
      id: 'trusted-existing',
      title: 'After',
      date: '2026-01-02',
      body: 'After body',
      client_note: 'browser supplied',
      sort_order: 999,
      arbitrary: { browser: true }
    }
  );

  assert.equal(merged.client_note, 'trusted existing');
  assert.equal(merged.sort_order, 10);
  assert.equal(Object.hasOwn(merged, 'arbitrary'), false);
  assert.deepEqual(NEWS_CANONICAL_EDIT_FIELDS, [
    'id',
    'title',
    'date',
    'body',
    'excerpt',
    'image_file',
    'image_alt'
  ]);
});
