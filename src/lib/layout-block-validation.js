import { isLayoutPlacement } from './layout-blocks.js';

/**
 * Validate the legacy and canonical placement fields of one Layout block.
 * @param {Record<string, unknown>} block
 * @returns {string[]}
 */
export function validateLayoutBlockPlacements(block) {
  const issues = [];

  if ('placement' in block && block.placement !== undefined && !isLayoutPlacement(block.placement)) {
    issues.push('layoutBlockPlacementInvalid');
  }

  if ('placement' in block && 'placements' in block) {
    issues.push('layoutBlockPlacementsAmbiguous');
  }

  if ('placements' in block && block.placements !== undefined) {
    if (!Array.isArray(block.placements)) {
      issues.push('layoutBlockPlacementsMustBeArray');
      return issues;
    }

    if (block.placements.some((placement) => !isLayoutPlacement(placement))) {
      issues.push('layoutBlockPlacementsItemInvalid');
    }

    if (new Set(block.placements).size !== block.placements.length) {
      issues.push('layoutBlockPlacementsDuplicate');
    }

    if (block.enabled !== false && block.placements.length === 0) {
      issues.push('layoutBlockPlacementsRequired');
    }
  }

  return issues;
}
