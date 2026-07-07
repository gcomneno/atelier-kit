import { createTranslator } from '$lib/i18n/index.js';

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
