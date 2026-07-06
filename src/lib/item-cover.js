/**
 * @param {{ image_file?: string }} item
 */
export function resolveItemCoverSrc(item) {
  return item.image_file ?? '/images/items/placeholder.svg';
}

/**
 * @param {{ image_file?: string }} item
 */
export function resolveItemCoverFallbackSrc(item) {
  const primary = item.image_file;

  if (!primary) {
    return '/images/items/placeholder.svg';
  }

  if (/\.jpe?g$/i.test(primary)) {
    return primary.replace(/\.jpe?g$/i, '.svg');
  }

  return '/images/items/placeholder.svg';
}
