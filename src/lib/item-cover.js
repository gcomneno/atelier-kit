import { getItemCoverImage, ITEM_IMAGE_PLACEHOLDER } from './item-images.js';

/**
 * @param {unknown} item
 */
export function resolveItemCoverSrc(item) {
  return getItemCoverImage(item).file;
}

/**
 * @param {unknown} item
 */
export function resolveItemCoverFallbackSrc(item) {
  const primary = getItemCoverImage(item).file;

  if (!primary) {
    return ITEM_IMAGE_PLACEHOLDER;
  }

  if (/\.jpe?g$/i.test(primary)) {
    return primary.replace(/\.jpe?g$/i, '.svg');
  }

  return ITEM_IMAGE_PLACEHOLDER;
}
