import { getItemCoverImage } from './item-images.js';

/**
 * @param {unknown} value
 * @returns {value is Record<string, unknown>}
 */
function isRecord(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

/**
 * @param {unknown} value
 */
function cleanString(value) {
  return typeof value === 'string' ? value.trim() : '';
}

/**
 * @param {unknown[]} images
 */
function getGalleryCoverUpdateIndex(images) {
  const coverIndex = images.findIndex(
    (entry) => isRecord(entry) && cleanString(entry.role) === 'cover'
  );

  if (coverIndex >= 0) {
    return coverIndex;
  }

  return images.findIndex((entry) => isRecord(entry) && Boolean(cleanString(entry.file)));
}

/**
 * Returns the cover fields Studio should display for an item.
 *
 * If an item has images[], this follows the same effective cover rule as the
 * visitor page: role: cover wins, otherwise the first valid gallery image wins.
 *
 * @param {unknown} item
 */
export function getStudioItemCoverFields(item) {
  const coverImage = getItemCoverImage(item);

  return {
    image_file: coverImage.file,
    image_alt: coverImage.alt
  };
}

/**
 * Preserves an existing images[] gallery while syncing the effective cover entry
 * with the cover fields edited by Studio.
 *
 * @param {unknown} original
 * @param {string} imageFile
 * @param {string} imageAlt
 * @returns {{ images?: unknown[] }}
 */
export function syncItemGalleryCover(original, imageFile, imageAlt) {
  if (!isRecord(original) || !Array.isArray(original.images)) {
    return {};
  }

  const updateIndex = getGalleryCoverUpdateIndex(original.images);

  if (updateIndex < 0) {
    return { images: original.images };
  }

  return {
    images: original.images.map((entry, index) => {
      if (index !== updateIndex || !isRecord(entry)) {
        return entry;
      }

      return {
        ...entry,
        file: cleanString(imageFile),
        alt: cleanString(imageAlt)
      };
    })
  };
}
