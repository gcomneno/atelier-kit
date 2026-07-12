import { createTranslator } from './i18n/index.js';
import { LAYOUT_BLOCK_IDS, effectiveBlockPlacement } from './layout-blocks.js';

/** @typedef {import('$lib/layout-blocks.js').LayoutBlockId} LayoutBlockId */

/**
 * Default visitor-facing label for a layout block when no custom label is set.
 *
 * @param {LayoutBlockId} blockId
 * @param {string} locale
 */
export function getDefaultLayoutBlockLabel(blockId, locale) {
  const t = createTranslator(locale);
  return t(`visitor.layout.blocks.${blockId}`);
}

/**
 * Resolve the effective visitor-facing label for a normalized Layout block.
 * The surface is accepted to keep every projection on one shared contract.
 *
 * @param {LayoutBlockId} blockId
 * @param {import('./layout-blocks.js').LayoutBlockConfig} block
 * @param {string} locale
 * @param {{ surface?: 'menu' | 'main' | 'sidebar' }} [_options]
 */
export function resolveLayoutBlockLabel(blockId, block, locale, _options = {}) {
  const custom = typeof block.label === 'string' ? block.label.trim() : '';

  return custom || getDefaultLayoutBlockLabel(blockId, locale);
}

/**
 * @param {{ preset: import('./layout-presets.js').LayoutPreset, blocks: Record<LayoutBlockId, import('./layout-blocks.js').LayoutBlockConfig> }} layout
 * @param {string} locale
 */
export function getLayoutBlockLabels(layout, locale) {
  /** @type {Record<LayoutBlockId, string>} */
  const labels = /** @type {Record<LayoutBlockId, string>} */ ({});

  for (const blockId of LAYOUT_BLOCK_IDS) {
    const placement = effectiveBlockPlacement(layout.preset, layout.blocks, blockId);
    const surface = placement === 'menu' ? 'menu' : placement === 'main' ? 'main' : 'sidebar';

    labels[blockId] = resolveLayoutBlockLabel(blockId, layout.blocks[blockId], locale, { surface });
  }

  return labels;
}

/**
 * Shared route-data contract for page eyebrows backed by Layout blocks.
 *
 * @param {Record<LayoutBlockId, string>} blockLabels
 * @param {LayoutBlockId} blockId
 */
export function getLayoutPageEyebrow(blockLabels, blockId) {
  return blockLabels[blockId];
}
