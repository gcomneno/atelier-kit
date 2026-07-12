// @ts-nocheck

import { error, fail, isRedirect, redirect } from '@sveltejs/kit';
import { guardStudio } from '$lib/server/studio-guard.js';
import {
  assertContentId,
  deleteNewsRecord,
  newsRecordExists,
  optionalField,
  readNewsRecord,
  requiredField,
  runStructuralValidation,
  saveNewsImageUpload,
  validationMessage,
  writeNewsRecord
} from '$lib/server/studio-io.js';
import { getOperatorLocale, getOperatorTranslator } from '$lib/i18n/server.js';
import { assertValidMarkedText } from '$lib/marked-text.js';

function readString(record, key, fallback = '') {
  const value = record[key];
  return typeof value === 'string' ? value : fallback;
}

function loadNewsForm(id) {
  const post = readNewsRecord(id);

  return {
    id: readString(post, 'id', id),
    title: readString(post, 'title'),
    date: readString(post, 'date'),
    excerpt: readString(post, 'excerpt'),
    body: readString(post, 'body'),
    image_file: readString(post, 'image_file'),
    image_alt: readString(post, 'image_alt')
  };
}

export function load({ params }) {
  guardStudio();
  const locale = getOperatorLocale();
  const t = getOperatorTranslator();

  try {
    assertContentId(params.id, t('fields.newsId'), locale);
  } catch (loadError) {
    if (isRedirect(loadError)) {
      throw loadError;
    }

    error(404, t('server.newsNotFound'));
  }

  if (!newsRecordExists(params.id)) {
    redirect(303, `/studio/news?missing=${encodeURIComponent(params.id)}`);
  }

  try {
    return {
      newsForm: loadNewsForm(params.id)
    };
  } catch (loadError) {
    if (isRedirect(loadError)) {
      throw loadError;
    }

    error(404, t('server.newsNotFound'));
  }
}

/** @type {import('./$types').Actions} */
export const actions = {
  saveNews: async ({ params, request }) => {
    guardStudio();

    const locale = getOperatorLocale();
    const t = getOperatorTranslator();

    try {
      assertContentId(params.id, t('fields.newsId'), locale);
      const original = readNewsRecord(params.id);
      const formData = await request.formData();
      assertValidMarkedText([
        { path: `news.${params.id}.title`, value: String(formData.get('title') ?? '') },
        { path: `news.${params.id}.excerpt`, value: String(formData.get('excerpt') ?? ''), mode: 'multiline' },
        { path: `news.${params.id}.body`, value: String(formData.get('body') ?? ''), mode: 'multiline' }
      ]);
      const upload = formData.get('image_upload');
      let imageFile = optionalField(formData.get('image_file'));

      if (upload instanceof File && upload.size > 0) {
        imageFile = await saveNewsImageUpload(params.id, upload, locale);
      } else if (imageFile === '') {
        imageFile = readString(original, 'image_file');
      }

      const date = requiredField(formData.get('date'), t('fields.newsDate'), locale);

      if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        throw new Error(t('errors.newsDateInvalid'));
      }

      /** @type {Record<string, unknown>} */
      const post = {
        id: readString(original, 'id', params.id),
        title: requiredField(formData.get('title'), t('fields.newsTitle'), locale),
        date,
        body: requiredField(formData.get('body'), t('fields.newsBody'), locale)
      };

      if (typeof original.sort_order === 'number' && Number.isInteger(original.sort_order)) {
        post.sort_order = original.sort_order;
      }

      const excerpt = optionalField(formData.get('excerpt'));
      const imageAlt = optionalField(formData.get('image_alt'));

      if (excerpt !== '') {
        post.excerpt = excerpt;
      }

      if (imageFile !== '') {
        post.image_file = imageFile;

        if (imageAlt !== '') {
          post.image_alt = imageAlt;
        }
      }

      writeNewsRecord(params.id, post);
      const validation = runStructuralValidation();

      return {
        newsStatus: validation.ok ? 'success' : 'warning',
        newsMessage: validationMessage(validation, locale),
        newsForm: loadNewsForm(params.id)
      };
    } catch (saveError) {
      const message = saveError instanceof Error ? saveError.message : t('server.saveNewsError');

      try {
        return fail(400, {
          newsStatus: 'error',
          newsMessage: message,
          newsForm: loadNewsForm(params.id)
        });
      } catch {
        return fail(400, {
          newsStatus: 'error',
          newsMessage: message
        });
      }
    }
  },

  deleteNews: async ({ params }) => {
    guardStudio();

    const locale = getOperatorLocale();
    const t = getOperatorTranslator();

    try {
      assertContentId(params.id, t('fields.newsId'), locale);
      const post = readNewsRecord(params.id);
      const title = typeof post.title === 'string' ? post.title : params.id;

      deleteNewsRecord(params.id, locale);
      runStructuralValidation();

      redirect(303, `/studio/news?deleted=${encodeURIComponent(title)}`);
    } catch (deleteError) {
      if (isRedirect(deleteError)) {
        throw deleteError;
      }

      const message = deleteError instanceof Error ? deleteError.message : t('server.deleteNewsError');

      try {
        return fail(400, {
          newsStatus: 'error',
          newsMessage: message,
          newsForm: loadNewsForm(params.id)
        });
      } catch {
        return fail(400, {
          newsStatus: 'error',
          newsMessage: message
        });
      }
    }
  }
};
