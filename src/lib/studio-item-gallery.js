import { getItemCoverImage } from './item-images.js';
import { translate } from './i18n/index.js';

const ITEM_GALLERY_IMAGE_PLACEHOLDER = '/images/items/placeholder.svg';

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
 * @returns {{ file: string, alt: string, role: string } | null}
 */
function galleryRowForEdit(entry) {
  if (!isRecord(entry)) {
    return null;
  }

  return {
    file: cleanString(entry.file),
    alt: cleanString(entry.alt),
    role: cleanString(entry.role)
  };
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
 * Returns the gallery rows Studio should render for editing.
 *
 * Items with images[] expose those rows directly. Legacy items without images[]
 * get a single editable cover row based on image_file/image_alt.
 *
 * @param {unknown} item
 * @returns {Array<{ file: string, alt: string, role: string }>}
 */
export function getStudioItemGalleryRows(item) {
  if (isRecord(item) && Array.isArray(item.images)) {
    const rows = item.images
      .map((entry) => galleryRowForEdit(entry))
      .filter((entry) => entry !== null);

    if (rows.length > 0) {
      return /** @type {Array<{ file: string, alt: string, role: string }>} */ (rows);
    }
  }

  const coverFields = getStudioItemCoverFields(item);

  return [
    {
      file: coverFields.image_file,
      alt: coverFields.image_alt,
      role: 'cover'
    }
  ];
}

/**
 * @param {FormData} formData
 * @param {string} [locale]
 * @returns {Array<{ file: string, alt: string, role?: string }>}
 */
export function parseStudioItemGalleryFromForm(formData, locale = 'en') {
  const files = formData.getAll('gallery_files').map((value) => String(value).trim());
  const alts = formData.getAll('gallery_alts').map((value) => String(value).trim());
  const roles = formData.getAll('gallery_roles').map((value) => String(value).trim());

  if (files.length !== alts.length || files.length !== roles.length) {
    throw new Error(translate('errors.galleryRowMismatch', locale));
  }

  /** @type {Array<{ file: string, alt: string, role?: string }>} */
  const images = [];

  for (let index = 0; index < files.length; index += 1) {
    const file = files[index];
    const alt = alts[index];
    const role = roles[index];

    if (file === '' && alt === '' && role === '') {
      continue;
    }

    if (file === '') {
      throw new Error(translate('errors.galleryImageFileRequired', locale));
    }

    images.push({
      file,
      alt,
      ...(role ? { role } : {})
    });
  }

  if (images.length === 0) {
    throw new Error(translate('errors.galleryImagesRequired', locale));
  }

  return images;
}

/**
 * Appends one uploaded image to the item gallery.
 *
 * Legacy image_file/image_alt values are promoted to the first cover entry before
 * appending the newly uploaded image.
 *
 * @param {unknown} original
 * @param {string} imageFile
 * @param {string} imageAlt
 * @param {string} imageRole
 * @returns {{ images: unknown[] }}
 */
export function appendItemGalleryImage(original, imageFile, imageAlt = '', imageRole = '') {
  const normalizedRole = cleanString(imageRole);
  const newEntry = {
    file: cleanString(imageFile),
    alt: cleanString(imageAlt),
    ...(normalizedRole ? { role: normalizedRole } : {})
  };

  if (isRecord(original) && Array.isArray(original.images)) {
    return { images: [...original.images, newEntry] };
  }

  const coverImage = getItemCoverImage(original);
  const seedGallery =
    coverImage.file && coverImage.file !== ITEM_GALLERY_IMAGE_PLACEHOLDER
      ? [
          {
            file: coverImage.file,
            alt: coverImage.alt,
            role: coverImage.role || 'cover'
          }
        ]
      : [];

  return { images: [...seedGallery, newEntry] };
}

/**
 * Builds the first available filename for a gallery upload.
 *
 * @param {string} id
 * @param {string} extension
 * @param {(filename: string) => boolean} exists
 * @returns {string}
 */
export function buildItemGalleryImageFilename(id, extension, exists) {
  const normalizedExtension = extension === 'jpeg' ? 'jpg' : extension;
  const base = `${id}-gallery`;
  let index = 0;

  while (true) {
    const suffix = index === 0 ? '' : `-${index + 1}`;
    const filename = `${base}${suffix}.${normalizedExtension}`;

    if (!exists(filename)) {
      return filename;
    }

    index += 1;
  }
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
