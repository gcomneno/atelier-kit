import assert from 'node:assert/strict';
import test from 'node:test';
import {
  DEFAULT_LAYOUT_BLOCKS,
  LAYOUT_BLOCK_IDS,
  blockHasPlacement,
  effectiveBlockPlacements,
  layoutBlockIdsForPlacement,
  migrateLegacyLayoutBlocks,
  normalizeLayoutBlocks,
  resolveLayoutPreset
} from '../src/lib/layout-blocks.js';

test('defaults are canonical and independently cloned', () => {
  const first = normalizeLayoutBlocks();
  const second = normalizeLayoutBlocks();

  assert.deepEqual(first, DEFAULT_LAYOUT_BLOCKS);
  first.about.placements.push('main');
  assert.deepEqual(second.about.placements, ['sidebar']);
  assert.deepEqual(DEFAULT_LAYOUT_BLOCKS.about.placements, ['sidebar']);
});

test('normalizes legacy placement values', () => {
  for (const placement of ['main', 'sidebar', 'menu']) {
    const blocks = normalizeLayoutBlocks({ about: { placement } });
    assert.deepEqual(blocks.about.placements, [placement]);
  }
});

test('normalizes, deduplicates and canonically orders placements', () => {
  const blocks = normalizeLayoutBlocks({
    about: { placements: ['menu', 'main', 'sidebar', 'main'] }
  });

  assert.deepEqual(blocks.about.placements, ['main', 'sidebar', 'menu']);
});

test('valid placements wins over simultaneous legacy placement', () => {
  const blocks = normalizeLayoutBlocks({
    about: { placement: 'sidebar', placements: ['menu', 'main'] }
  });

  assert.deepEqual(blocks.about.placements, ['main', 'menu']);
});

test('missing and uninterpretable placement data falls back to defaults', () => {
  assert.deepEqual(normalizeLayoutBlocks({ about: {} }).about.placements, ['sidebar']);
  assert.deepEqual(
    normalizeLayoutBlocks({ about: { placements: 'main', placement: 'unknown' } }).about.placements,
    ['sidebar']
  );
  assert.deepEqual(
    normalizeLayoutBlocks({ about: { enabled: true, placements: [] } }).about.placements,
    ['sidebar']
  );
  assert.deepEqual(
    normalizeLayoutBlocks({ about: { enabled: false, placements: [] } }).about.placements,
    []
  );
});

test('migrates legacy home and sidebar settings directly to arrays', () => {
  const blocks = migrateLegacyLayoutBlocks({
    home: { show: 'collections' },
    sidebar: { about: false, latest_news: true, latest_news_count: 5, collections: false }
  });

  assert.deepEqual(blocks.about, { enabled: false, placements: ['sidebar'] });
  assert.deepEqual(blocks.news, { enabled: true, placements: ['sidebar'], count: 5 });
  assert.deepEqual(blocks.collections, { enabled: true, placements: ['main'] });
  assert.deepEqual(blocks.catalog, { enabled: false, placements: ['main'] });
});

test('effective placements cover disabled, single and combined destinations', () => {
  const combinations = [
    ['main'],
    ['sidebar'],
    ['menu'],
    ['main', 'sidebar'],
    ['main', 'menu'],
    ['sidebar', 'menu'],
    ['main', 'sidebar', 'menu']
  ];

  for (const placements of combinations) {
    const blocks = normalizeLayoutBlocks({ about: { enabled: true, placements } });
    assert.deepEqual(effectiveBlockPlacements(blocks, 'about'), placements);
    /** @type {import('../src/lib/layout-blocks.js').LayoutPlacement[]} */
    const knownPlacements = ['main', 'sidebar', 'menu'];
    for (const placement of knownPlacements) {
      assert.equal(blockHasPlacement(blocks, 'about', placement), placements.includes(placement));
    }
  }

  const disabled = normalizeLayoutBlocks({
    about: { enabled: false, placements: ['main', 'sidebar', 'menu'] }
  });
  assert.deepEqual(effectiveBlockPlacements(disabled, 'about'), []);
});

test('preset is derived only from an enabled sidebar projection', () => {
  assert.equal(resolveLayoutPreset(normalizeLayoutBlocks({
    about: { enabled: false, placements: ['sidebar'] },
    news: { placements: ['main'] },
    collections: { placements: ['menu'] },
    catalog: { placements: ['main', 'menu'] }
  })), 'single-column');

  assert.equal(resolveLayoutPreset(normalizeLayoutBlocks({
    catalog: { enabled: true, placements: ['main', 'sidebar'] }
  })), 'catalog-sidebar');
});

test('projections are independent and retain global block order', () => {
  const blocks = normalizeLayoutBlocks({
    about: { placements: ['main', 'sidebar'] },
    news: { placements: ['main', 'menu'] },
    collections: { placements: ['sidebar', 'menu'] },
    catalog: { placements: ['main', 'sidebar', 'menu'] }
  });

  assert.deepEqual(layoutBlockIdsForPlacement(blocks, 'main'), ['about', 'news', 'catalog']);
  assert.deepEqual(layoutBlockIdsForPlacement(blocks, 'sidebar'), ['about', 'collections', 'catalog']);
  assert.deepEqual(layoutBlockIdsForPlacement(blocks, 'menu'), ['news', 'collections', 'catalog']);
  assert.deepEqual(LAYOUT_BLOCK_IDS, ['about', 'news', 'collections', 'catalog']);
});
