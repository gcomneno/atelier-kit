// @ts-nocheck

import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync, readFileSync, unlinkSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { parse, stringify } from 'yaml';
import {
  ITEM_PRESET_OPTIONS,
  buildNewItemRecord,
  normalizeItemPreset,
  titleFromItemId
} from '$lib/item-presets.js';
import { buildItemGalleryImageFilename } from '$lib/studio-item-gallery.js';
export { applySignalCloudsFromForm } from '$lib/studio-signal-clouds.js';
import {
  collectMetaSuggestions,
  flattenMetaForEdit,
  metaRowsToYaml,
  parseMetaRowsFromForm
} from '$lib/item-meta.js';
import { translate } from '$lib/i18n/index.js';
import { MAX_CATALOG_HOME_LIMIT } from '$lib/layout-presets.js';

const ROOT = process.cwd();
const ID_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const IMAGE_EXTENSIONS = new Set(['jpg', 'jpeg', 'png', 'webp']);
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

/**
 * @param {string} relativePath
 * @returns {Record<string, unknown>}
 */
export function readProjectYaml(relativePath) {
  const absolutePath = path.join(ROOT, relativePath);
  const data = parse(readFileSync(absolutePath, 'utf8'));

  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    throw new Error(`${relativePath} must contain a YAML object.`);
  }

  return data;
}

/**
 * @param {string} relativePath
 * @param {Record<string, unknown>} data
 */
export function writeProjectYaml(relativePath, data) {
  const absolutePath = path.join(ROOT, relativePath);
  writeFileSync(absolutePath, `${stringify(data).trim()}\n`, 'utf8');
}

/**
 * @returns {{ ok: boolean, output: string }}
 */
export function runStructuralValidation() {
  const result = spawnSync(process.execPath, ['scripts/validate-content.js'], {
    cwd: ROOT,
    encoding: 'utf8'
  });

  return {
    ok: result.status === 0,
    output: `${result.stdout || ''}${result.stderr || ''}`.trim()
  };
}

/**
 * @param {FormDataEntryValue | null} value
 * @param {string} label
 * @param {string} [locale]
 */
export function requiredField(value, label, locale = 'en') {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new Error(translate('errors.required', locale, { label }));
  }

  return value.trim();
}

/**
 * @param {FormDataEntryValue | null} value
 * @param {string} [fallback]
 */
export function optionalField(value, fallback = '') {
  if (typeof value !== 'string') {
    return fallback;
  }

  return value.trim();
}

/**
 * @param {FormDataEntryValue | null} value
 */
export function checkboxEnabled(value) {
  return value === 'on' || value === 'true' || value === '1';
}

/** @param {{ ok: boolean, output: string }} validation @param {string} [locale] */
export function validationMessage(validation, locale = 'en') {
  if (validation.ok) {
    return translate('server.saveSuccess', locale);
  }

  return translate('server.saveValidationProblem', locale, { output: validation.output });
}

/**
 * @param {string} id
 * @param {string} [label]
 * @param {string} [locale]
 */
export function assertContentId(id, label = 'Id', locale = 'en') {
  if (!ID_PATTERN.test(id)) {
    throw new Error(translate('errors.idFormat', locale, { label }));
  }
}

/**
 * @param {string} id
 * @param {string} folder
 */
function recordPath(folder, id) {
  assertContentId(id);
  return `${folder}/${id}.yaml`;
}

export function listItemSummaries() {
  const dir = path.join(ROOT, 'content/items');

  if (!existsSync(dir)) {
    return [];
  }

  return readdirSync(dir)
    .filter((file) => file.endsWith('.yaml'))
    .map((file) => {
      const fallbackId = file.replace(/\.yaml$/, '');
      const item = readProjectYaml(`content/items/${file}`);
      const sortOrder =
        typeof item.sort_order === 'number' && Number.isInteger(item.sort_order) ? item.sort_order : null;

      return {
        id: typeof item.id === 'string' ? item.id : fallbackId,
        title: typeof item.title === 'string' ? item.title : fallbackId,
        status: typeof item.status === 'string' ? item.status : '',
        sort_order: sortOrder
      };
    })
    .sort((left, right) => {
      const leftOrder = left.sort_order ?? Number.POSITIVE_INFINITY;
      const rightOrder = right.sort_order ?? Number.POSITIVE_INFINITY;

      if (leftOrder !== rightOrder) {
        return leftOrder - rightOrder;
      }

      return left.title.localeCompare(right.title);
    });
}

/**
 * @param {string[]} orderedIds
 * @param {string} [locale]
 */
export function writeItemSortOrders(orderedIds, locale = 'en') {
  const normalized = orderedIds.map((id) => String(id).trim()).filter(Boolean);

  if (normalized.length === 0) {
    throw new Error(translate('errors.itemOrderEmpty', locale));
  }

  const unique = new Set(normalized);

  if (unique.size !== normalized.length) {
    throw new Error(translate('errors.itemOrderDuplicate', locale));
  }

  const dir = path.join(ROOT, 'content/items');
  const allIds = existsSync(dir)
    ? readdirSync(dir)
        .filter((file) => file.endsWith('.yaml'))
        .map((file) => file.replace(/\.yaml$/, ''))
    : [];

  if (normalized.length !== allIds.length) {
    throw new Error(translate('errors.itemOrderIncomplete', locale));
  }

  for (const id of normalized) {
    if (!itemRecordExists(id)) {
      throw new Error(translate('errors.itemNotFound', locale, { id }));
    }
  }

  normalized.forEach((id, index) => {
    const item = readItemRecord(id);
    writeItemRecord(id, {
      ...item,
      sort_order: (index + 1) * 10
    });
  });
}

export function readItemRecord(id) {
  return readProjectYaml(recordPath('content/items', id));
}

/**
 * @param {string} id
 */
export function itemRecordExists(id) {
  assertContentId(id, 'Item id');
  return existsSync(path.join(ROOT, recordPath('content/items', id)));
}

/**
 * @param {{ id: string, title: string, preset?: string, description?: string, notice?: string }} input
 * @param {string} [locale]
 */
export function createItemRecord(input, locale = 'en') {
  const id = requiredField(String(input.id ?? ''), translate('fields.itemId', locale), locale);
  const title = requiredField(String(input.title ?? ''), translate('fields.itemTitle', locale), locale).trim() || titleFromItemId(id);
  const preset = normalizeItemPreset(String(input.preset ?? 'default'));

  if (itemRecordExists(id)) {
    throw new Error(translate('errors.itemExists', locale, { id }));
  }

  mkdirSync(path.join(ROOT, 'content/items'), { recursive: true });

  const item = buildNewItemRecord(id, title, preset, {
    description:
      typeof input.description === 'string' && input.description.trim() !== ''
        ? input.description.trim()
        : undefined,
    notice: typeof input.notice === 'string' ? input.notice.trim() : undefined
  });

  writeItemRecord(id, item);

  return item;
}

export function listItemPresetOptions() {
  return ITEM_PRESET_OPTIONS;
}

/**
 * @param {string} id
 * @param {Record<string, unknown>} item
 */
export function writeItemRecord(id, item) {
  writeProjectYaml(recordPath('content/items', id), item);
}

/**
 * @param {string} itemId
 * @returns {Array<{ id: string, title: string }>}
 */
export function listCollectionsReferencingItem(itemId) {
  const dir = path.join(ROOT, 'content/collections');

  if (!existsSync(dir)) {
    return [];
  }

  return readdirSync(dir)
    .filter((file) => file.endsWith('.yaml'))
    .flatMap((file) => {
      const fallbackId = file.replace(/\.yaml$/, '');
      const collection = readProjectYaml(`content/collections/${file}`);
      const items = Array.isArray(collection.items) ? collection.items : [];

      if (!items.includes(itemId)) {
        return [];
      }

      return [
        {
          id: typeof collection.id === 'string' ? collection.id : fallbackId,
          title: typeof collection.title === 'string' ? collection.title : fallbackId
        }
      ];
    })
    .sort((left, right) => left.title.localeCompare(right.title));
}

/**
 * @param {string} id
 */
function deleteItemImageFiles(id) {
  const imagesDir = path.join(ROOT, 'static/images/items');

  for (const extension of IMAGE_EXTENSIONS) {
    const normalized = extension === 'jpeg' ? 'jpg' : extension;
    const absolutePath = path.join(imagesDir, `${id}.${normalized}`);

    if (existsSync(absolutePath)) {
      unlinkSync(absolutePath);
    }
  }
}

/**
 * @param {string} id
 * @param {string} [locale]
 */
export function deleteItemRecord(id, locale = 'en') {
  assertContentId(id, translate('fields.itemId', locale), locale);

  if (!itemRecordExists(id)) {
    throw new Error(translate('errors.itemNotFound', locale));
  }

  const collections = listCollectionsReferencingItem(id);

  if (collections.length > 0) {
    throw new Error(
      translate('errors.itemInCollections', locale, {
        collections: collections.map((collection) => collection.title).join(', ')
      })
    );
  }

  const itemPath = path.join(ROOT, recordPath('content/items', id));
  unlinkSync(itemPath);
  deleteItemImageFiles(id);
}

export function listCollectionSummaries() {
  const dir = path.join(ROOT, 'content/collections');

  if (!existsSync(dir)) {
    return [];
  }

  return readdirSync(dir)
    .filter((file) => file.endsWith('.yaml'))
    .map((file) => {
      const fallbackId = file.replace(/\.yaml$/, '');
      const collection = readProjectYaml(`content/collections/${file}`);
      const sortOrder =
        typeof collection.sort_order === 'number' && Number.isInteger(collection.sort_order)
          ? collection.sort_order
          : null;

      return {
        id: typeof collection.id === 'string' ? collection.id : fallbackId,
        title: typeof collection.title === 'string' ? collection.title : fallbackId,
        itemCount: Array.isArray(collection.items) ? collection.items.length : 0,
        sort_order: sortOrder
      };
    })
    .sort((left, right) => {
      const leftOrder = left.sort_order ?? Number.POSITIVE_INFINITY;
      const rightOrder = right.sort_order ?? Number.POSITIVE_INFINITY;

      if (leftOrder !== rightOrder) {
        return leftOrder - rightOrder;
      }

      return left.title.localeCompare(right.title);
    });
}

/**
 * @param {string[]} orderedIds
 * @param {string} [locale]
 */
export function writeCollectionSortOrders(orderedIds, locale = 'en') {
  const normalized = orderedIds.map((id) => String(id).trim()).filter(Boolean);

  if (normalized.length === 0) {
    throw new Error(translate('errors.collectionOrderEmpty', locale));
  }

  const unique = new Set(normalized);

  if (unique.size !== normalized.length) {
    throw new Error(translate('errors.collectionOrderDuplicate', locale));
  }

  const dir = path.join(ROOT, 'content/collections');
  const allIds = existsSync(dir)
    ? readdirSync(dir)
        .filter((file) => file.endsWith('.yaml'))
        .map((file) => file.replace(/\.yaml$/, ''))
    : [];

  if (normalized.length !== allIds.length) {
    throw new Error(translate('errors.collectionOrderIncomplete', locale));
  }

  for (const id of normalized) {
    if (!collectionRecordExists(id)) {
      throw new Error(translate('errors.collectionNotFound', locale));
    }
  }

  normalized.forEach((id, index) => {
    const collection = readCollectionRecord(id);
    writeCollectionRecord(id, {
      ...collection,
      sort_order: (index + 1) * 10
    });
  });
}

export function readCollectionRecord(id) {
  return readProjectYaml(recordPath('content/collections', id));
}

/**
 * @param {string} id
 */
export function collectionRecordExists(id) {
  assertContentId(id, 'Collection id');
  return existsSync(path.join(ROOT, recordPath('content/collections', id)));
}

/**
 * @param {{ id: string, title: string, description: string, items?: string[] }} input
 * @param {string} [locale]
 */
export function createCollectionRecord(input, locale = 'en') {
  const id = requiredField(String(input.id ?? ''), translate('fields.collectionId', locale), locale);
  assertContentId(id, translate('fields.collectionId', locale), locale);

  const titleInput = String(input.title ?? '').trim();
  const title = titleInput || titleFromItemId(id);
  const description = requiredField(
    String(input.description ?? ''),
    translate('fields.collectionDescription', locale),
    locale
  );
  const items = Array.isArray(input.items)
    ? input.items.map((itemId) => String(itemId).trim()).filter(Boolean)
    : [];

  if (collectionRecordExists(id)) {
    throw new Error(translate('errors.collectionExists', locale, { id }));
  }

  if (items.length === 0) {
    throw new Error(translate('errors.collectionNeedsItems', locale));
  }

  mkdirSync(path.join(ROOT, 'content/collections'), { recursive: true });

  const collection = {
    id,
    title,
    description,
    items
  };

  writeCollectionRecord(id, collection);

  return collection;
}

/**
 * @param {string} id
 * @param {Record<string, unknown>} collection
 */
export function writeCollectionRecord(id, collection) {
  writeProjectYaml(recordPath('content/collections', id), collection);
}

/**
 * @param {string} id
 * @param {string} [locale]
 */
export function deleteCollectionRecord(id, locale = 'en') {
  assertContentId(id, translate('fields.collectionId', locale), locale);

  if (!collectionRecordExists(id)) {
    throw new Error(translate('errors.collectionNotFound', locale));
  }

  const collectionPath = path.join(ROOT, recordPath('content/collections', id));
  unlinkSync(collectionPath);
}

/**
 * @param {FormData} formData
 * @param {string} [locale]
 */
export function parseItemMetaFromForm(formData, locale = 'en') {
  const rows = parseMetaRowsFromForm(formData);

  for (const row of rows) {
    if (row.label.trim() === '') {
      throw new Error(translate('errors.metaLabelRequired', locale));
    }
  }

  return metaRowsToYaml(rows);
}

export function listItemMetaSuggestions() {
  const dir = path.join(ROOT, 'content/items');

  if (!existsSync(dir)) {
    return collectMetaSuggestions([]);
  }

  const items = readdirSync(dir)
    .filter((file) => file.endsWith('.yaml'))
    .map((file) => readProjectYaml(`content/items/${file}`));

  return collectMetaSuggestions(items);
}

/** @returns {{ ok: boolean, output: string }} */
export function runContentDoctorReport() {
  const result = spawnSync(process.execPath, ['scripts/content-doctor.js'], {
    cwd: ROOT,
    encoding: 'utf8'
  });

  const output = `${result.stdout || ''}${result.stderr || ''}`.trim();

  return {
    ok: output.includes('found nothing obvious') || output.includes('nulla di evidente'),
    output
  };
}

/** @returns {{ ok: boolean, output: string }} */
export function runPublishPrepReport() {
  const result = spawnSync(process.execPath, ['scripts/publish.js'], {
    cwd: ROOT,
    encoding: 'utf8',
    env: { ...process.env, FORCE_COLOR: '0' },
    timeout: 600_000
  });

  const output = `${result.stdout || ''}${result.stderr || ''}`.trim();

  return {
    ok: result.status === 0,
    output: output || (result.status === 0 ? 'OK' : 'Publish prep failed.')
  };
}

/**
 * @param {string} filename
 * @param {string} [locale]
 */
function imageExtensionFromName(filename, locale = 'en') {
  const match = filename.toLowerCase().match(/\.([a-z0-9]+)$/);

  if (!match || !IMAGE_EXTENSIONS.has(match[1])) {
    throw new Error(translate('errors.imageType', locale));
  }

  return match[1] === 'jpeg' ? 'jpg' : match[1];
}

/**
 * @param {string} id
 * @param {File} file
 * @param {string} [locale]
 */
export async function saveItemImageUpload(id, file, locale = 'en') {
  assertContentId(id, translate('fields.itemId', locale), locale);

  if (!(file instanceof File) || file.size === 0) {
    throw new Error(translate('errors.imageRequired', locale));
  }

  if (file.size > MAX_IMAGE_BYTES) {
    throw new Error(translate('errors.imageSize', locale));
  }

  const extension = imageExtensionFromName(file.name, locale);
  const imagesDir = path.join(ROOT, 'static/images/items');
  mkdirSync(imagesDir, { recursive: true });

  const filename = `${id}.${extension}`;
  const absolutePath = path.join(imagesDir, filename);
  const buffer = Buffer.from(await file.arrayBuffer());
  writeFileSync(absolutePath, buffer);

  return `/images/items/${filename}`;
}

/**
 * @param {string} id
 * @param {File} file
 * @param {string} [locale]
 */
export async function saveItemGalleryImageUpload(id, file, locale = 'en') {
  assertContentId(id, translate('fields.itemId', locale), locale);

  if (!(file instanceof File) || file.size === 0) {
    throw new Error(translate('errors.imageRequired', locale));
  }

  if (file.size > MAX_IMAGE_BYTES) {
    throw new Error(translate('errors.imageSize', locale));
  }

  const extension = imageExtensionFromName(file.name, locale);
  const imagesDir = path.join(ROOT, 'static/images/items');
  mkdirSync(imagesDir, { recursive: true });

  const filename = buildItemGalleryImageFilename(id, extension, (candidate) =>
    existsSync(path.join(imagesDir, candidate))
  );
  const absolutePath = path.join(imagesDir, filename);
  const buffer = Buffer.from(await file.arrayBuffer());
  writeFileSync(absolutePath, buffer);

  return `/images/items/${filename}`;
}

/**
 * Removes an item image previously written by Studio when a later save step fails.
 *
 * @param {string} imagePath
 */
export function deleteItemImageUpload(imagePath) {
  if (typeof imagePath !== 'string' || !imagePath.startsWith('/images/items/')) {
    return;
  }

  const filename = path.basename(imagePath);

  if (filename !== imagePath.slice('/images/items/'.length)) {
    return;
  }

  const absolutePath = path.join(ROOT, 'static/images/items', filename);

  if (existsSync(absolutePath)) {
    unlinkSync(absolutePath);
  }
}

/**
 * @param {File} file
 * @param {string} [locale]
 */
export async function saveAboutPortraitUpload(file, locale = 'en') {
  if (!(file instanceof File) || file.size === 0) {
    throw new Error(translate('errors.imageRequired', locale));
  }

  if (file.size > MAX_IMAGE_BYTES) {
    throw new Error(translate('errors.imageSize', locale));
  }

  const extension = imageExtensionFromName(file.name, locale);
  const aboutImagesDir = path.join(ROOT, 'static/images/about');
  mkdirSync(aboutImagesDir, { recursive: true });

  const filename = `portrait.${extension}`;
  const absolutePath = path.join(aboutImagesDir, filename);
  const buffer = Buffer.from(await file.arrayBuffer());
  writeFileSync(absolutePath, buffer);

  return `/images/about/${filename}`;
}

/**
 * @param {File} file
 * @param {string} [locale]
 */
export async function saveHeroBannerUpload(file, locale = 'en') {
  if (!(file instanceof File) || file.size === 0) {
    throw new Error(translate('errors.imageRequired', locale));
  }

  if (file.size > MAX_IMAGE_BYTES) {
    throw new Error(translate('errors.imageSize', locale));
  }

  const extension = imageExtensionFromName(file.name, locale);
  const siteImagesDir = path.join(ROOT, 'static/images/site');
  mkdirSync(siteImagesDir, { recursive: true });

  const filename = `hero-banner.${extension}`;
  const absolutePath = path.join(siteImagesDir, filename);
  const buffer = Buffer.from(await file.arrayBuffer());
  writeFileSync(absolutePath, buffer);

  return `/images/site/${filename}`;
}

/**
 * @param {File} file
 * @param {string} [locale]
 */
export async function saveSiteBackgroundUpload(file, locale = 'en') {
  if (!(file instanceof File) || file.size === 0) {
    throw new Error(translate('errors.imageRequired', locale));
  }

  if (file.size > MAX_IMAGE_BYTES) {
    throw new Error(translate('errors.imageSize', locale));
  }

  const extension = imageExtensionFromName(file.name, locale);
  const siteImagesDir = path.join(ROOT, 'static/images/site');
  mkdirSync(siteImagesDir, { recursive: true });

  const filename = `background.${extension}`;
  const absolutePath = path.join(siteImagesDir, filename);
  const buffer = Buffer.from(await file.arrayBuffer());
  writeFileSync(absolutePath, buffer);

  return `/images/site/${filename}`;
}

/**
 * @param {File} file
 * @param {string} [locale]
 */
export async function saveHeaderLogoUpload(file, locale = 'en') {
  if (!(file instanceof File) || file.size === 0) {
    throw new Error(translate('errors.imageRequired', locale));
  }

  if (file.size > MAX_IMAGE_BYTES) {
    throw new Error(translate('errors.imageSize', locale));
  }

  const extension = imageExtensionFromName(file.name, locale);
  const siteImagesDir = path.join(ROOT, 'static/images/site');
  mkdirSync(siteImagesDir, { recursive: true });

  const filename = `header-logo.${extension}`;
  const absolutePath = path.join(siteImagesDir, filename);
  const buffer = Buffer.from(await file.arrayBuffer());
  writeFileSync(absolutePath, buffer);

  return `/images/site/${filename}`;
}


/**
 * @param {File} file
 * @param {string} [locale]
 */
export async function saveSiteFaviconUpload(file, locale = 'en') {
  if (!(file instanceof File) || file.size === 0) {
    throw new Error(translate('errors.imageRequired', locale));
  }

  if (file.size > MAX_IMAGE_BYTES) {
    throw new Error(translate('errors.imageSize', locale));
  }

  const extension = imageExtensionFromName(file.name, locale);
  const siteImagesDir = path.join(ROOT, 'static/images/site');
  mkdirSync(siteImagesDir, { recursive: true });

  const filename = `favicon.${extension}`;
  const absolutePath = path.join(siteImagesDir, filename);
  const buffer = Buffer.from(await file.arrayBuffer());
  writeFileSync(absolutePath, buffer);

  return `/images/site/${filename}`;
}

export function defaultItemImagePath(id) {
  assertContentId(id, 'Item id');
  return `/images/items/${id}.jpg`;
}

export function listNewsSummaries() {
  const dir = path.join(ROOT, 'content/news');

  if (!existsSync(dir)) {
    return [];
  }

  return readdirSync(dir)
    .filter((file) => file.endsWith('.yaml'))
    .map((file) => {
      const fallbackId = file.replace(/\.yaml$/, '');
      const post = readProjectYaml(`content/news/${file}`);
      const sortOrder =
        typeof post.sort_order === 'number' && Number.isInteger(post.sort_order)
          ? post.sort_order
          : null;

      return {
        id: typeof post.id === 'string' ? post.id : fallbackId,
        title: typeof post.title === 'string' ? post.title : fallbackId,
        date: typeof post.date === 'string' ? post.date : '',
        sort_order: sortOrder
      };
    })
    .sort((left, right) => {
      const leftOrder = left.sort_order ?? Number.POSITIVE_INFINITY;
      const rightOrder = right.sort_order ?? Number.POSITIVE_INFINITY;

      if (leftOrder !== rightOrder) {
        return leftOrder - rightOrder;
      }

      const dateCompare = right.date.localeCompare(left.date);

      if (dateCompare !== 0) {
        return dateCompare;
      }

      return left.title.localeCompare(right.title);
    });
}

/**
 * @param {string[]} orderedIds
 * @param {string} [locale]
 */
export function writeNewsSortOrders(orderedIds, locale = 'en') {
  const normalized = orderedIds.map((id) => String(id).trim()).filter(Boolean);

  if (normalized.length === 0) {
    throw new Error(translate('errors.newsOrderEmpty', locale));
  }

  const unique = new Set(normalized);

  if (unique.size !== normalized.length) {
    throw new Error(translate('errors.newsOrderDuplicate', locale));
  }

  const dir = path.join(ROOT, 'content/news');
  const allIds = existsSync(dir)
    ? readdirSync(dir)
        .filter((file) => file.endsWith('.yaml'))
        .map((file) => file.replace(/\.yaml$/, ''))
    : [];

  if (normalized.length !== allIds.length) {
    throw new Error(translate('errors.newsOrderIncomplete', locale));
  }

  for (const id of normalized) {
    if (!newsRecordExists(id)) {
      throw new Error(translate('errors.newsNotFound', locale, { id }));
    }
  }

  normalized.forEach((id, index) => {
    const post = readNewsRecord(id);
    writeNewsRecord(id, {
      ...post,
      sort_order: (index + 1) * 10
    });
  });
}

function deleteNewsImageFiles(id) {
  const imagesDir = path.join(ROOT, 'static/images/news');

  for (const extension of IMAGE_EXTENSIONS) {
    const normalized = extension === 'jpeg' ? 'jpg' : extension;
    const absolutePath = path.join(imagesDir, `${id}.${normalized}`);

    if (existsSync(absolutePath)) {
      unlinkSync(absolutePath);
    }
  }
}

/**
 * @param {string} id
 * @param {string} [locale]
 */
export function deleteNewsRecord(id, locale = 'en') {
  assertContentId(id, translate('fields.newsId', locale), locale);

  if (!newsRecordExists(id)) {
    throw new Error(translate('errors.newsNotFound', locale, { id }));
  }

  const postPath = path.join(ROOT, recordPath('content/news', id));
  unlinkSync(postPath);
  deleteNewsImageFiles(id);
}

export function readNewsRecord(id) {
  return readProjectYaml(recordPath('content/news', id));
}

/**
 * @param {string} id
 */
export function newsRecordExists(id) {
  assertContentId(id, 'News id');
  return existsSync(path.join(ROOT, recordPath('content/news', id)));
}

/**
 * @param {{ id: string, title?: string, date: string, body: string, excerpt?: string }} input
 * @param {string} [locale]
 */
export function createNewsRecord(input, locale = 'en') {
  const id = requiredField(String(input.id ?? ''), translate('fields.newsId', locale), locale);
  assertContentId(id, translate('fields.newsId', locale), locale);

  const titleInput = String(input.title ?? '').trim();
  const title = titleInput || titleFromItemId(id);
  const date = requiredField(String(input.date ?? ''), translate('fields.newsDate', locale), locale);
  const body = requiredField(String(input.body ?? ''), translate('fields.newsBody', locale), locale);
  const excerpt =
    typeof input.excerpt === 'string' && input.excerpt.trim() !== '' ? input.excerpt.trim() : '';

  if (newsRecordExists(id)) {
    throw new Error(translate('errors.newsExists', locale, { id }));
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    throw new Error(translate('errors.newsDateInvalid', locale));
  }

  mkdirSync(path.join(ROOT, 'content/news'), { recursive: true });

  /** @type {Record<string, unknown>} */
  const post = {
    id,
    title,
    date,
    body
  };

  if (excerpt !== '') {
    post.excerpt = excerpt;
  }

  writeNewsRecord(id, post);

  return post;
}

/**
 * @param {string} id
 * @param {Record<string, unknown>} post
 */
export function writeNewsRecord(id, post) {
  writeProjectYaml(recordPath('content/news', id), post);
}

/**
 * @param {string} id
 * @param {File} file
 * @param {string} [locale]
 */
export async function saveNewsImageUpload(id, file, locale = 'en') {
  assertContentId(id, translate('fields.newsId', locale), locale);

  if (!(file instanceof File) || file.size === 0) {
    throw new Error(translate('errors.imageRequired', locale));
  }

  if (file.size > MAX_IMAGE_BYTES) {
    throw new Error(translate('errors.imageSize', locale));
  }

  const extension = imageExtensionFromName(file.name, locale);
  const imagesDir = path.join(ROOT, 'static/images/news');
  mkdirSync(imagesDir, { recursive: true });

  const filename = `${id}.${extension}`;
  const absolutePath = path.join(imagesDir, filename);
  const buffer = Buffer.from(await file.arrayBuffer());
  writeFileSync(absolutePath, buffer);

  return `/images/news/${filename}`;
}

export function loadCatalogForm(locale = 'en') {
  const data = readProjectYaml('config/catalog.yaml');
  const catalog = data.catalog;

  if (!catalog || typeof catalog !== 'object' || Array.isArray(catalog)) {
    throw new Error(translate('errors.missingCatalog', locale));
  }

  return {
    item_name_singular: typeof catalog.item_name_singular === 'string' ? catalog.item_name_singular : 'creation',
    item_name_plural: typeof catalog.item_name_plural === 'string' ? catalog.item_name_plural : 'creations',
    eyebrow: typeof catalog.eyebrow === 'string' ? catalog.eyebrow : '',
    intro: typeof catalog.intro === 'string' ? catalog.intro : '',
    sort:
      catalog.sort === 'title_asc' || catalog.sort === 'title_desc' ? catalog.sort : 'manual',
    home_limit:
      typeof catalog.home_limit === 'number' &&
      Number.isInteger(catalog.home_limit) &&
      catalog.home_limit > 0
        ? Math.min(catalog.home_limit, MAX_CATALOG_HOME_LIMIT)
        : 0
  };
}

/**
 * @param {Record<string, unknown>} catalogForm
 * @param {string} [locale]
 */
export function writeCatalogForm(catalogForm, locale = 'en') {
  const singular = String(catalogForm.item_name_singular ?? '').trim();
  const plural = String(catalogForm.item_name_plural ?? '').trim();
  const eyebrow = optionalField(String(catalogForm.eyebrow ?? ''));
  const intro = optionalField(String(catalogForm.intro ?? ''));
  const sortRaw = String(catalogForm.sort ?? 'manual').trim();
  const sort = sortRaw === 'title_asc' || sortRaw === 'title_desc' ? sortRaw : 'manual';
  const homeLimitInput = String(catalogForm.home_limit ?? '0').trim();
  const homeLimitRaw = Number.parseInt(homeLimitInput, 10);
  const homeLimit = Number.isInteger(homeLimitRaw) && homeLimitRaw > 0 ? homeLimitRaw : 0;

  if (singular === '') {
    throw new Error(translate('errors.required', locale, { label: translate('fields.itemNameSingular', locale) }));
  }

  if (plural === '') {
    throw new Error(translate('errors.required', locale, { label: translate('fields.itemNamePlural', locale) }));
  }

  if (homeLimitInput !== '' && (!Number.isInteger(homeLimitRaw) || homeLimitRaw < 0)) {
    throw new Error(
      translate('errors.catalogHomeLimitInvalid', locale, { max: MAX_CATALOG_HOME_LIMIT })
    );
  }

  if (homeLimit > MAX_CATALOG_HOME_LIMIT) {
    throw new Error(
      translate('errors.catalogHomeLimitMax', locale, { max: MAX_CATALOG_HOME_LIMIT })
    );
  }

  /** @type {Record<string, unknown>} */
  const catalog = {
    item_name_singular: singular,
    item_name_plural: plural,
    sort
  };

  if (eyebrow !== '') {
    catalog.eyebrow = eyebrow;
  }

  if (intro !== '') {
    catalog.intro = intro;
  }

  if (homeLimit > 0) {
    catalog.home_limit = homeLimit;
  }

  writeProjectYaml('config/catalog.yaml', { catalog });
}

export function loadAboutForm(locale = 'en') {
  const aboutPath = path.join(ROOT, 'config/about.yaml');

  if (!existsSync(aboutPath)) {
    return {
      title: '',
      intro: '',
      section_heading: '',
      section_body: '',
      show_portrait: false,
      portrait_image_file: '',
      portrait_image_alt: ''
    };
  }

  const data = readProjectYaml('config/about.yaml');
  const about = data.about;

  if (!about || typeof about !== 'object' || Array.isArray(about)) {
    throw new Error(translate('errors.missingAbout', locale));
  }

  const sections = Array.isArray(about.sections) ? about.sections : [];
  const firstSection = sections[0] && typeof sections[0] === 'object' ? sections[0] : {};
  const portrait =
    about.portrait && typeof about.portrait === 'object' && !Array.isArray(about.portrait)
      ? about.portrait
      : {};

  return {
    title: typeof about.title === 'string' ? about.title : '',
    intro: typeof about.intro === 'string' ? about.intro : '',
    section_heading: typeof firstSection.heading === 'string' ? firstSection.heading : '',
    section_body: typeof firstSection.body === 'string' ? firstSection.body : '',
    show_portrait: portrait.show === true,
    portrait_image_file: typeof portrait.image_file === 'string' ? portrait.image_file : '',
    portrait_image_alt: typeof portrait.image_alt === 'string' ? portrait.image_alt : ''
  };
}

/**
 * @param {Record<string, unknown>} aboutForm
 * @param {string} [locale]
 */
export function writeAboutForm(aboutForm, locale = 'en') {
  const existing = readProjectYaml('config/about.yaml');
  const existingAbout =
    existing.about && typeof existing.about === 'object' && !Array.isArray(existing.about)
      ? existing.about
      : {};

  const title = optionalField(String(aboutForm.title ?? ''));
  const intro = optionalField(String(aboutForm.intro ?? ''));
  const sectionHeading = optionalField(String(aboutForm.section_heading ?? ''));
  const sectionBody = optionalField(String(aboutForm.section_body ?? ''));
  const showPortrait = aboutForm.show_portrait === true;
  const portraitImageFile = optionalField(String(aboutForm.portrait_image_file ?? ''));
  const portraitImageAlt = optionalField(String(aboutForm.portrait_image_alt ?? ''));

  if (title === '') {
    throw new Error(translate('errors.aboutTitleRequired', locale));
  }

  /** @type {Record<string, unknown>} */
  const about = {
    title,
    intro
  };

  const existingSections = Array.isArray(existingAbout.sections) ? existingAbout.sections : [];

  if (sectionHeading !== '' || sectionBody !== '') {
    about.sections = [
      {
        heading: sectionHeading || 'Process',
        body: sectionBody
      },
      ...existingSections.slice(1)
    ];
  } else if (existingSections.length > 0) {
    about.sections = existingSections;
  }

  if (showPortrait && portraitImageFile !== '') {
    about.portrait = {
      show: true,
      image_file: portraitImageFile,
      ...(portraitImageAlt !== '' ? { image_alt: portraitImageAlt } : {})
    };
  } else if (portraitImageFile !== '') {
    about.portrait = {
      show: false,
      image_file: portraitImageFile,
      ...(portraitImageAlt !== '' ? { image_alt: portraitImageAlt } : {})
    };
  }

  writeProjectYaml('config/about.yaml', { about });
}

export function readSignalCloudRecords(locale = 'en') {
  const data = readProjectYaml('config/signal-clouds.yaml');
  const clouds = data.signal_clouds;

  if (!Array.isArray(clouds)) {
    throw new Error(translate('errors.missingSignalClouds', locale));
  }

  return clouds;
}

/**
 * @param {unknown[]} clouds
 */
export function writeSignalCloudRecords(clouds) {
  writeProjectYaml('config/signal-clouds.yaml', { signal_clouds: clouds });
}
