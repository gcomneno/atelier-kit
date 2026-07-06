/** @typedef {'about' | 'news' | 'collections' | 'catalog'} LayoutBlockId */
/** @typedef {'main' | 'sidebar' | 'menu'} LayoutPlacement */

/**
 * @typedef {{
 *   enabled: boolean,
 *   placement: LayoutPlacement,
 *   count?: number
 * }} LayoutBlockConfig
 */

/** @type {LayoutBlockId[]} */
export const LAYOUT_BLOCK_IDS = ['about', 'news', 'collections', 'catalog'];

/** @type {Record<LayoutBlockId, LayoutBlockConfig>} */
export const DEFAULT_LAYOUT_BLOCKS = {
  about: { enabled: true, placement: 'sidebar' },
  news: { enabled: true, placement: 'sidebar', count: 3 },
  collections: { enabled: true, placement: 'sidebar' },
  catalog: { enabled: true, placement: 'main' }
};

/**
 * @param {unknown} value
 * @returns {value is LayoutPlacement}
 */
export function isLayoutPlacement(value) {
  return value === 'main' || value === 'sidebar' || value === 'menu';
}

/**
 * @param {unknown} value
 * @returns {value is LayoutBlockId}
 */
export function isLayoutBlockId(value) {
  return typeof value === 'string' && LAYOUT_BLOCK_IDS.includes(/** @type {LayoutBlockId} */ (value));
}

/**
 * @param {unknown} value
 * @param {number} fallback
 * @returns {number}
 */
function normalizeNewsCount(value, fallback) {
  if (typeof value !== 'number' || !Number.isInteger(value) || value < 1) {
    return fallback;
  }

  return value;
}

/**
 * @param {LayoutBlockConfig} block
 * @returns {LayoutBlockConfig}
 */
function cloneBlock(block) {
  return {
    enabled: block.enabled,
    placement: block.placement,
    ...(typeof block.count === 'number' ? { count: block.count } : {})
  };
}

/**
 * @param {Record<string, unknown>} [raw]
 * @returns {Record<LayoutBlockId, LayoutBlockConfig>}
 */
export function normalizeLayoutBlocks(raw) {
  /** @type {Record<LayoutBlockId, LayoutBlockConfig>} */
  const blocks = /** @type {Record<LayoutBlockId, LayoutBlockConfig>} */ ({});

  for (const id of LAYOUT_BLOCK_IDS) {
    blocks[id] = cloneBlock(DEFAULT_LAYOUT_BLOCKS[id]);
  }

  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return blocks;
  }

  for (const id of LAYOUT_BLOCK_IDS) {
    const value = raw[id];

    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      continue;
    }

    const block = /** @type {Record<string, unknown>} */ (value);

    if (typeof block.enabled === 'boolean') {
      blocks[id].enabled = block.enabled;
    }

    if (isLayoutPlacement(block.placement)) {
      blocks[id].placement = block.placement;
    }

    if (id === 'news' && 'count' in block) {
      blocks[id].count = normalizeNewsCount(block.count, blocks[id].count ?? 3);
    }
  }

  return blocks;
}

/**
 * Migrate legacy `home` + `sidebar` flags into block placement.
 *
 * @param {Record<string, unknown>} layout
 * @returns {Record<LayoutBlockId, LayoutBlockConfig>}
 */
export function migrateLegacyLayoutBlocks(layout) {
  /** @type {Record<LayoutBlockId, LayoutBlockConfig>} */
  const blocks = /** @type {Record<LayoutBlockId, LayoutBlockConfig>} */ ({});

  for (const id of LAYOUT_BLOCK_IDS) {
    blocks[id] = cloneBlock(DEFAULT_LAYOUT_BLOCKS[id]);
  }

  const home = /** @type {Record<string, unknown>} */ (
    layout.home && typeof layout.home === 'object' && !Array.isArray(layout.home)
      ? layout.home
      : {}
  );
  const homeShow = typeof home.show === 'string' ? home.show : 'catalog';

  const sidebar = /** @type {Record<string, unknown>} */ (
    layout.sidebar && typeof layout.sidebar === 'object' && !Array.isArray(layout.sidebar)
      ? layout.sidebar
      : {}
  );

  const sidebarCollections = sidebar.collections !== false;
  const sidebarAbout = sidebar.about !== false;
  const sidebarNews = sidebar.latest_news !== false;
  const newsCount = normalizeNewsCount(
    /** @type {number | undefined} */ (sidebar.latest_news_count),
    3
  );

  blocks.about.enabled = sidebarAbout;
  blocks.about.placement = 'sidebar';

  blocks.news.enabled = sidebarNews;
  blocks.news.placement = 'sidebar';
  blocks.news.count = newsCount;

  blocks.collections.enabled =
    sidebarCollections || homeShow === 'collections' || homeShow === 'both';
  blocks.collections.placement = sidebarCollections ? 'sidebar' : 'main';

  blocks.catalog.enabled = homeShow === 'catalog' || homeShow === 'both';
  blocks.catalog.placement = 'main';

  return blocks;
}

/**
 * @param {import('$lib/layout-presets.js').LayoutPreset} preset
 * @param {Record<LayoutBlockId, LayoutBlockConfig>} blocks
 * @param {LayoutBlockId} blockId
 * @returns {'main' | 'sidebar' | 'menu' | null}
 */
export function effectiveBlockPlacement(preset, blocks, blockId) {
  const block = blocks[blockId];

  if (!block?.enabled) {
    return null;
  }

  if (block.placement === 'menu') {
    return 'menu';
  }

  if (preset === 'single-column') {
    return 'main';
  }

  return block.placement === 'sidebar' ? 'sidebar' : 'main';
}

/**
 * @param {import('$lib/layout-presets.js').LayoutPreset} preset
 * @param {Record<LayoutBlockId, LayoutBlockConfig>} blocks
 * @returns {boolean}
 */
export function hasSidebarBlocks(preset, blocks) {
  return LAYOUT_BLOCK_IDS.some((id) => effectiveBlockPlacement(preset, blocks, id) === 'sidebar');
}
