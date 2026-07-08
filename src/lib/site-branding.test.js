import assert from 'node:assert/strict';
import test from 'node:test';
import {
  formatPageTitle,
  resolveDocumentTitle,
  resolveHeaderTitle,
  resolveIntroTitle
} from './site-branding.js';

test('resolveIntroTitle uses intro_title when configured, otherwise legacy name', () => {
  assert.equal(resolveIntroTitle({ intro_title: 'Home title', name: 'Legacy' }), 'Home title');
  assert.equal(resolveIntroTitle({ name: 'Legacy' }), 'Legacy');
  assert.equal(resolveIntroTitle({ intro_title: '' }), '');
});

test('resolveHeaderTitle uses header_title when configured, otherwise legacy name', () => {
  assert.equal(resolveHeaderTitle({ header_title: 'Nav title', name: 'Legacy' }), 'Nav title');
  assert.equal(resolveHeaderTitle({ name: 'Legacy' }), 'Legacy');
  assert.equal(resolveHeaderTitle({ header_title: '' }), '');
});

test('resolveDocumentTitle falls back through intro, header, name and tagline', () => {
  assert.equal(
    resolveDocumentTitle({
      intro_title: '',
      header_title: 'Nav',
      name: 'Legacy',
      tagline: 'Tag'
    }),
    'Nav'
  );
  assert.equal(resolveDocumentTitle({ tagline: 'Only tagline' }), 'Only tagline');
  assert.equal(resolveDocumentTitle({}), '');
});

test('formatPageTitle omits empty site suffix and stray separators', () => {
  assert.equal(formatPageTitle('News', { name: 'Studio' }), 'News · Studio');
  assert.equal(formatPageTitle('News', {}), 'News');
  assert.equal(formatPageTitle('', { name: 'Studio' }), 'Studio');
});
