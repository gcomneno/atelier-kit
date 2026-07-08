export const ITEM_IMAGE_PLACEHOLDER = '/images/items/placeholder.svg';

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
 * @param {unknown} entry
 * @returns {{ file: string, alt: string, role?: string } | null}
 */
function normalizeImageEntry(entry) {
  if (!isRecord(entry)) {
    return null;
  }

  const file = cleanString(entry.file);

  if (!file) {
    return null;
  }

  const alt = cleanString(entry.alt);
  const role = cleanString(entry.role);

  return {
    file,
    alt,
    ...(role ? { role } : {})
  };
}

/**
 * Returns the normalized item image gallery.
 *
 * Backward compatibility:
 * - new schema: images: [{ file, alt, role? }]
 * - legacy schema: image_file + image_alt
 *
 * @param {unknown} item
 * @returns {Array<{ file: string, alt: string, role?: string }>}
 */
export function normalizeItemImages(item) {
  if (!isRecord(item)) {
    return [{ file: ITEM_IMAGE_PLACEHOLDER, alt: '', role: 'cover' }];
  }

  const gallery = Array.isArray(item.images)
    ? item.images.map((entry) => normalizeImageEntry(entry)).filter((entry) => entry !== null)
    : [];

  if (gallery.length > 0) {
    return /** @type {Array<{ file: string, alt: string, role?: string }>} */ (gallery);
  }

  const legacyFile = cleanString(item.image_file);
  const legacyAlt = cleanString(item.image_alt);

  return [
    {
      file: legacyFile || ITEM_IMAGE_PLACEHOLDER,
      alt: legacyAlt,
      role: 'cover'
    }
  ];
}

/**
 * @param {Array<{ file: string, alt?: string, role?: string }>} images
 */
export function getItemCoverIndex(images) {
  const coverIndex = images.findIndex((image) => image.role === 'cover');

  return coverIndex >= 0 ? coverIndex : 0;
}

/**
 * @param {unknown} item
 */
export function getItemCoverImage(item) {
  const images = normalizeItemImages(item);
  const coverIndex = getItemCoverIndex(images);

  return images[coverIndex] ?? { file: ITEM_IMAGE_PLACEHOLDER, alt: '', role: 'cover' };
}
