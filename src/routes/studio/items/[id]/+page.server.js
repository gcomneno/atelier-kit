// @ts-nocheck

import { error, fail, isRedirect, redirect } from '@sveltejs/kit';
import { guardStudio } from '$lib/server/studio-guard.js';
import {
  assertContentId,
  deleteItemImageUpload,
  deleteItemRecord,
  itemRecordExists,
  listItemMetaSuggestions,
  optionalField,
  parseItemMetaFromForm,
  readItemRecord,
  requiredField,
  runStructuralValidation,
  saveItemGalleryImageUpload,
  saveItemImageUpload,
  validationMessage,
  writeItemRecord
} from '$lib/server/studio-io.js';
import { flattenMetaForEdit } from '$lib/item-meta.js';
import {
  appendItemGalleryImage,
  getStudioItemCoverFields,
  getStudioItemGalleryRows,
  parseStudioItemGalleryFromForm,
  syncItemGalleryCover
} from '$lib/studio-item-gallery.js';
import { getOperatorLocale, getOperatorTranslator } from '$lib/i18n/server.js';
import { assertValidMarkedText } from '$lib/marked-text.js';

function readString(record, key, fallback = '') {
  const value = record[key];
  return typeof value === 'string' ? value : fallback;
}

function loadItemForm(id) {
  const item = readItemRecord(id);
  const meta = Array.isArray(item.meta) ? item.meta : [];
  const coverFields = getStudioItemCoverFields(item);

  return {
    id: readString(item, 'id', id),
    title: readString(item, 'title'),
    subtitle: readString(item, 'subtitle'),
    status: readString(item, 'status'),
    price_mode: readString(item, 'price_mode', 'hidden'),
    image_file: coverFields.image_file,
    image_alt: coverFields.image_alt,
    galleryRows: getStudioItemGalleryRows(item),
    description: readString(item, 'description'),
    notice: readString(item, 'notice'),
    metaRows: flattenMetaForEdit(meta)
  };
}

export function load({ params }) {
  guardStudio();
  const locale = getOperatorLocale();
  const t = getOperatorTranslator();

  try {
    assertContentId(params.id, t('fields.itemId'), locale);
  } catch (loadError) {
    if (isRedirect(loadError)) {
      throw loadError;
    }

    error(404, t('server.itemNotFound'));
  }

  if (!itemRecordExists(params.id)) {
    redirect(303, `/studio/items?missing=${encodeURIComponent(params.id)}`);
  }

  try {
    return {
      itemForm: loadItemForm(params.id),
      metaSuggestions: listItemMetaSuggestions()
    };
  } catch (loadError) {
    if (isRedirect(loadError)) {
      throw loadError;
    }

    error(404, t('server.itemNotFound'));
  }
}

/** @type {import('./$types').Actions} */
export const actions = {
  saveItem: async ({ params, request }) => {
    guardStudio();

    const locale = getOperatorLocale();
    const t = getOperatorTranslator();

    try {
      assertContentId(params.id, t('fields.itemId'), locale);
      const original = readItemRecord(params.id);
      const formData = await request.formData();
      assertValidMarkedText([
        { path: `items.${params.id}.title`, value: String(formData.get('title') ?? '') },
        { path: `items.${params.id}.subtitle`, value: String(formData.get('subtitle') ?? '') },
        { path: `items.${params.id}.description`, value: String(formData.get('description') ?? ''), mode: 'multiline' },
        { path: `items.${params.id}.notice`, value: String(formData.get('notice') ?? ''), mode: 'multiline' }
      ]);
      const upload = formData.get('image_upload');
      const galleryUpload = formData.get('gallery_upload');
      let uploadedGalleryImage = '';
      let galleryImages = parseStudioItemGalleryFromForm(formData, locale);
      let coverFields = getStudioItemCoverFields({ images: galleryImages });
      let imageFile = coverFields.image_file;
      let imageAlt = coverFields.image_alt;

      if (upload instanceof File && upload.size > 0) {
        imageFile = await saveItemImageUpload(params.id, upload, locale);
        galleryImages =
          syncItemGalleryCover({ images: galleryImages }, imageFile, imageAlt).images ?? galleryImages;
        coverFields = getStudioItemCoverFields({ images: galleryImages });
        imageFile = coverFields.image_file;
        imageAlt = coverFields.image_alt;
      }

      try {
        if (galleryUpload instanceof File && galleryUpload.size > 0) {
          uploadedGalleryImage = await saveItemGalleryImageUpload(
            params.id,
            galleryUpload,
            locale
          );

          galleryImages = appendItemGalleryImage(
            { images: galleryImages },
            uploadedGalleryImage,
            optionalField(formData.get('gallery_upload_alt')),
            optionalField(formData.get('gallery_upload_role'))
          ).images;

          coverFields = getStudioItemCoverFields({ images: galleryImages });
          imageFile = coverFields.image_file;
          imageAlt = coverFields.image_alt;
        }

        const item = {
          id: readString(original, 'id', params.id),
          title: requiredField(formData.get('title'), t('fields.itemTitle'), locale),
          subtitle: optionalField(formData.get('subtitle')),
          status: optionalField(formData.get('status')),
          price_mode: optionalField(formData.get('price_mode'), 'hidden'),
          image_file: imageFile,
          image_alt: imageAlt,
          images: galleryImages,
          description: requiredField(formData.get('description'), t('fields.description'), locale),
          notice: optionalField(formData.get('notice')),
          meta: parseItemMetaFromForm(formData, locale)
        };

        writeItemRecord(params.id, item);
      } catch (writeError) {
        if (uploadedGalleryImage) {
          deleteItemImageUpload(uploadedGalleryImage);
        }

        throw writeError;
      }

      const validation = runStructuralValidation();

      return {
        itemStatus: validation.ok ? 'success' : 'warning',
        itemMessage: validationMessage(validation, locale),
        itemForm: loadItemForm(params.id),
        metaSuggestions: listItemMetaSuggestions()
      };
    } catch (saveError) {
      const message = saveError instanceof Error ? saveError.message : t('server.saveItemError');

      try {
        return fail(400, {
          itemStatus: 'error',
          itemMessage: message,
          itemForm: loadItemForm(params.id),
          metaSuggestions: listItemMetaSuggestions()
        });
      } catch {
        return fail(400, {
          itemStatus: 'error',
          itemMessage: message
        });
      }
    }
  },

  deleteItem: async ({ params }) => {
    guardStudio();

    const locale = getOperatorLocale();
    const t = getOperatorTranslator();

    try {
      assertContentId(params.id, t('fields.itemId'), locale);
      const item = readItemRecord(params.id);
      const title = typeof item.title === 'string' ? item.title : params.id;

      deleteItemRecord(params.id, locale);
      runStructuralValidation();

      redirect(303, `/studio/items?deleted=${encodeURIComponent(title)}`);
    } catch (deleteError) {
      if (isRedirect(deleteError)) {
        throw deleteError;
      }

      const message = deleteError instanceof Error ? deleteError.message : t('server.deleteItemError');

      try {
        return fail(400, {
          itemStatus: 'error',
          itemMessage: message,
          itemForm: loadItemForm(params.id)
        });
      } catch {
        return fail(400, {
          itemStatus: 'error',
          itemMessage: message
        });
      }
    }
  }
};
