import assert from 'node:assert/strict';
import test from 'node:test';

import { normalizeStructuredReadingBlocks } from '../src/lib/structured-reading.js';

test('normalizer preserves explicit generic colophon roles in declared order', () => {
  const roles = [
    'title',
    'series',
    'author',
    'imprint',
    'body',
    'epigraph',
    'tagline'
  ];

  const input = roles.map((role) => ({
    type: 'colophon',
    role,
    text: `  Neutral ${role}  `
  }));

  assert.deepEqual(
    normalizeStructuredReadingBlocks(input),
    roles.map((role) => ({
      type: 'colophon',
      role,
      text: `Neutral ${role}`
    }))
  );
});

test('normalizer produces a narrow canonical shape for ordinary reading blocks', () => {
  const input = [
    {
      type: 'paragraph',
      text: '  First paragraph  ',
      drop_cap: true,
      client_only: 'must not cross the public boundary'
    },
    {
      type: 'chapter-title',
      text: '  Chapter One  '
    },
    {
      type: 'ornament',
      text: 'ignored decoration source'
    },
    {
      type: 'cta',
      text: '  Continue at https://example.test/read  '
    }
  ];

  assert.deepEqual(normalizeStructuredReadingBlocks(input), [
    {
      type: 'paragraph',
      text: 'First paragraph',
      dropCap: true
    },
    {
      type: 'chapter-title',
      text: 'Chapter One'
    },
    {
      type: 'ornament'
    },
    {
      type: 'cta',
      text: 'Continue at https://example.test/read'
    }
  ]);
});

test('unknown and malformed blocks degrade to safe readable paragraphs', () => {
  const input = [
    {
      type: 'colophon',
      role: 'future-role',
      text: '  Future colophon content  '
    },
    {
      type: 'client-special',
      text: '  Unknown block content  '
    },
    '  Plain string content  ',
    {
      type: 'paragraph',
      text: '<script>alert("not active markup")</script>'
    },
    null,
    42,
    {
      type: 'paragraph',
      text: '   '
    }
  ];

  assert.deepEqual(normalizeStructuredReadingBlocks(input), [
    {
      type: 'paragraph',
      text: 'Future colophon content'
    },
    {
      type: 'paragraph',
      text: 'Unknown block content'
    },
    {
      type: 'paragraph',
      text: 'Plain string content'
    },
    {
      type: 'paragraph',
      text: '<script>alert("not active markup")</script>'
    }
  ]);
});

test('invalid top-level input produces an empty readable block list', () => {
  assert.deepEqual(normalizeStructuredReadingBlocks(undefined), []);
  assert.deepEqual(normalizeStructuredReadingBlocks(null), []);
  assert.deepEqual(normalizeStructuredReadingBlocks({}), []);
});
