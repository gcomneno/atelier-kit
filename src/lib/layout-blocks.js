/** @typedef {'about' | 'news' | 'collections' | 'catalog'} LayoutBlockId */
/** @typedef {'main' | 'sidebar' | 'menu'} LayoutPlacement */

/**
 * @typedef {{
 *   enabled: boolean,
 *   placements: LayoutPlacement[],
 *   count?: number,
 *   label?: string
 * }} LayoutBlockConfig
 */

/** @type {LayoutBlockId[]} */
export const LAYOUT_BLOCK_IDS = ['about', 'news', 'collections', 'catalog'];

/** @type {LayoutPlacement[]} */
export const LAYOUT_PLACEMENTS = ['main', 'sidebar', 'menu'];

/** @type {Record<LayoutBlockId, LayoutBlockConfig>} */
export const DEFAULT_LAYOUT_BLOCKS = {
  about: { enabled: true, placements: ['sidebar'] },
  news: { enabled: true, placements: ['sidebar'], count: 3 },
  collections: { enabled: true, placements: ['sidebar'] },
  catalog: { enabled: true, placements: ['main'] }
};

/**
 * @param {unknown} value
 * @returns {value is LayoutPlacement}
 */
export function isLayoutPlacement(value) {
  return typeof value === 'string' && LAYOUT_PLACEMENTS.includes(/** @type {LayoutPlacement} */ (value));
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
    placements: [...block.placements],
    ...(typeof block.count === 'number' ? { count: block.count } : {}),
    ...(typeof block.label === 'string' && block.label !== '' ? { label: block.label } : {})
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

    const placements = normalizePlacements(block.placements);

    if (placements !== null) {
      blocks[id].placements = placements;
    } else if (isLayoutPlacement(block.placement)) {
      blocks[id].placements = [block.placement];
    }

    if (blocks[id].enabled && blocks[id].placements.length === 0) {
      blocks[id].placements = [...DEFAULT_LAYOUT_BLOCKS[id].placements];
    }

    if (id === 'news' && 'count' in block) {
      blocks[id].count = normalizeNewsCount(block.count, blocks[id].count ?? 3);
    }

    if (typeof block.label === 'string') {
      const label = block.label.trim();

      if (label !== '') {
        blocks[id].label = label;
      }
    }
  }

  return blocks;
}

/**
 * @param {unknown} value
 * @returns {LayoutPlacement[] | null}
 */
function normalizePlacements(value) {
  if (!Array.isArray(value) || value.some((placement) => !isLayoutPlacement(placement))) {
    return null;
  }

  const selected = new Set(value);
  return LAYOUT_PLACEMENTS.filter((placement) => selected.has(placement));
}

/**
 * Migrate legacy `home` + `sidebar` flags into block placements.
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
  blocks.about.placements = ['sidebar'];

  blocks.news.enabled = sidebarNews;
  blocks.news.placements = ['sidebar'];
  blocks.news.count = newsCount;

  blocks.collections.enabled =
    sidebarCollections || homeShow === 'collections' || homeShow === 'both';
  blocks.collections.placements = [sidebarCollections ? 'sidebar' : 'main'];

  blocks.catalog.enabled = homeShow === 'catalog' || homeShow === 'both';
  blocks.catalog.placements = ['main'];

  return blocks;
}

/**
 * @param {Record<LayoutBlockId, LayoutBlockConfig>} blocks
 * @param {LayoutBlockId} blockId
 * @returns {LayoutPlacement[]}
 */
export function effectiveBlockPlacements(blocks, blockId) {
  const block = blocks[blockId];

  if (!block?.enabled) {
    return [];
  }

  return normalizePlacements(block.placements) ?? [];
}

/**
 * @param {Record<LayoutBlockId, LayoutBlockConfig>} blocks
 * @param {LayoutBlockId} blockId
 * @param {LayoutPlacement} placement
 * @returns {boolean}
 */
export function blockHasPlacement(blocks, blockId, placement) {
  return effectiveBlockPlacements(blocks, blockId).includes(placement);
}

/**
 * Enabled block ids projected to a destination, in global Layout order.
 * @param {Record<LayoutBlockId, LayoutBlockConfig>} blocks
 * @param {LayoutPlacement} placement
 * @returns {LayoutBlockId[]}
 */
export function layoutBlockIdsForPlacement(blocks, placement) {
  return LAYOUT_BLOCK_IDS.filter((id) => blockHasPlacement(blocks, id, placement));
}

/**
 * @param {Record<LayoutBlockId, LayoutBlockConfig>} blocks
 * @returns {boolean}
 */
export function hasSidebarBlocks(blocks) {
  return LAYOUT_BLOCK_IDS.some((id) => blockHasPlacement(blocks, id, 'sidebar'));
}

/**
 * Derive layout preset from block placements.
 * Sidebar on any enabled block → widget layout; otherwise single column.
 *
 * @param {Record<LayoutBlockId, LayoutBlockConfig>} blocks
 * @returns {import('$lib/layout-presets.js').LayoutPreset}
 */
export function resolveLayoutPreset(blocks) {
  return hasSidebarBlocks(blocks) ? 'catalog-sidebar' : 'single-column';
}
