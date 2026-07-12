import assert from 'node:assert/strict';
import test from 'node:test';
import {
  getLayoutBlockLabels,
  getLayoutPageEyebrow
} from './layout-block-labels.js';
import { normalizeLayoutBlocks } from './layout-blocks.js';

/**
 * @param {Partial<Record<import('./layout-blocks.js').LayoutBlockId, string>>} [labels]
 * @returns {{ preset: import('./layout-presets.js').LayoutPreset, blocks: Record<import('./layout-blocks.js').LayoutBlockId, import('./layout-blocks.js').LayoutBlockConfig> }}
 */
function layoutWith(labels = {}) {
  return {
    preset: 'single-column',
    blocks: normalizeLayoutBlocks(
      Object.fromEntries(
        Object.entries(labels).map(([id, label]) => [id, { enabled: true, placement: 'main', label }])
      )
    )
  };
}

test('custom Layout labels are shared by every list and detail page eyebrow', () => {
  const labels = getLayoutBlockLabels(
    layoutWith({
      about: 'The studio',
      catalog: 'Available works',
      collections: 'Curated series',
      news: 'Journal'
    }),
    'en'
  );

  /** @type {Record<string, import('./layout-blocks.js').LayoutBlockId>} */
  const routes = {
    '/about': 'about',
    '/catalog': 'catalog',
    '/collections': 'collections',
    '/collections/[id]': 'collections',
    '/news': 'news',
    '/news/[slug]': 'news'
  };

  for (const [route, blockId] of Object.entries(routes)) {
    assert.equal(getLayoutPageEyebrow(labels, blockId), labels[blockId], route);
  }

  assert.deepEqual(labels, {
    about: 'The studio',
    news: 'Journal',
    collections: 'Curated series',
    catalog: 'Available works'
  });
});

test('empty Layout labels use localized defaults for list and detail pages', () => {
  const english = getLayoutBlockLabels(layoutWith({ about: ' ', catalog: '', collections: '\n', news: '\t' }), 'en');
  const italian = getLayoutBlockLabels(layoutWith(), 'it');

  assert.deepEqual(english, {
    about: 'About',
    news: 'News',
    collections: 'Collections',
    catalog: 'Catalogue'
  });
  assert.deepEqual(italian, {
    about: 'Chi siamo',
    news: 'Notizie',
    collections: 'Collezioni',
    catalog: 'Catalogo'
  });

  /** @type {import('./layout-blocks.js').LayoutBlockId[]} */
  const blockIds = ['about', 'catalog', 'collections', 'news'];

  for (const blockId of blockIds) {
    assert.equal(getLayoutPageEyebrow(english, blockId), english[blockId]);
  }
});

test('legacy Layout blocks remain compatible when labels are absent', () => {
  const blocks = normalizeLayoutBlocks();
  const labels = getLayoutBlockLabels({ preset: 'catalog-sidebar', blocks }, 'en');

  assert.equal(labels.about, 'About');
  assert.equal(labels.news, 'News');
  assert.equal(labels.collections, 'Collections');
  assert.equal(labels.catalog, 'Catalogue');
});

test('catalog.eyebrow does not participate in the /catalog page precedence', () => {
  const catalog = { eyebrow: 'Home spotlight' };
  const labels = getLayoutBlockLabels(layoutWith({ catalog: 'Works archive' }), 'en');

  assert.equal(catalog.eyebrow, 'Home spotlight');
  assert.equal(getLayoutPageEyebrow(labels, 'catalog'), 'Works archive');
});
