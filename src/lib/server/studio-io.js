// @ts-nocheck

import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { parse, stringify } from 'yaml';
import {
  ITEM_PRESET_OPTIONS,
  buildNewItemRecord,
  normalizeItemPreset,
  titleFromItemId
} from '$lib/item-presets.js';
import { translate } from '$lib/i18n/index.js';

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

      return {
        id: typeof item.id === 'string' ? item.id : fallbackId,
        title: typeof item.title === 'string' ? item.title : fallbackId,
        status: typeof item.status === 'string' ? item.status : ''
      };
    })
    .sort((left, right) => left.title.localeCompare(right.title));
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

      return {
        id: typeof collection.id === 'string' ? collection.id : fallbackId,
        title: typeof collection.title === 'string' ? collection.title : fallbackId,
        itemCount: Array.isArray(collection.items) ? collection.items.length : 0
      };
    })
    .sort((left, right) => left.title.localeCompare(right.title));
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
 * @param {unknown[]} originalMeta
 * @param {FormData} formData
 */
export function applyMetaFromForm(originalMeta, formData) {
  if (!Array.isArray(originalMeta)) {
    return [];
  }

  return originalMeta.map((entry, index) => {
    const updated = { label: entry.label };

    if (typeof entry.value === 'string') {
      updated.value = optionalField(formData.get(`meta_${index}_value`), entry.value);
    }

    if (Array.isArray(entry.children)) {
      updated.children = entry.children.map((child, childIndex) => ({
        label: child.label,
        ...(typeof child.value === 'string'
          ? {
              value: optionalField(
                formData.get(`meta_${index}_child_${childIndex}_value`),
                child.value
              )
            }
          : {})
      }));
    }

    return updated;
  });
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

      return {
        id: typeof post.id === 'string' ? post.id : fallbackId,
        title: typeof post.title === 'string' ? post.title : fallbackId,
        date: typeof post.date === 'string' ? post.date : ''
      };
    })
    .sort((left, right) => right.date.localeCompare(left.date));
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

  const fields = catalog.fields && typeof catalog.fields === 'object' ? catalog.fields : {};

  return {
    item_name_singular: typeof catalog.item_name_singular === 'string' ? catalog.item_name_singular : 'creation',
    item_name_plural: typeof catalog.item_name_plural === 'string' ? catalog.item_name_plural : 'creations',
    show_price: fields.show_price === true,
    show_availability: fields.show_availability !== false,
    show_material: fields.show_material !== false,
    show_dimensions: fields.show_dimensions !== false,
    show_status: fields.show_status !== false,
    show_meta: fields.show_meta !== false
  };
}

/**
 * @param {Record<string, unknown>} catalogForm
 * @param {string} [locale]
 */
export function writeCatalogForm(catalogForm, locale = 'en') {
  const singular = String(catalogForm.item_name_singular ?? '').trim();
  const plural = String(catalogForm.item_name_plural ?? '').trim();

  if (singular === '') {
    throw new Error(translate('errors.required', locale, { label: translate('fields.itemNameSingular', locale) }));
  }

  if (plural === '') {
    throw new Error(translate('errors.required', locale, { label: translate('fields.itemNamePlural', locale) }));
  }

  writeProjectYaml('config/catalog.yaml', {
    catalog: {
      item_name_singular: singular,
      item_name_plural: plural,
      fields: {
        show_price: catalogForm.show_price === true,
        show_availability: catalogForm.show_availability !== false,
        show_material: catalogForm.show_material !== false,
        show_dimensions: catalogForm.show_dimensions !== false,
        show_status: catalogForm.show_status !== false,
        show_meta: catalogForm.show_meta !== false
      }
    }
  });
}

export function loadAboutForm(locale = 'en') {
  const aboutPath = path.join(ROOT, 'config/about.yaml');

  if (!existsSync(aboutPath)) {
    return {
      enabled: false,
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
    enabled: about.enabled !== false,
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

  const enabled = aboutForm.enabled === true;
  const title = optionalField(String(aboutForm.title ?? ''));
  const intro = optionalField(String(aboutForm.intro ?? ''));
  const sectionHeading = optionalField(String(aboutForm.section_heading ?? ''));
  const sectionBody = optionalField(String(aboutForm.section_body ?? ''));
  const showPortrait = aboutForm.show_portrait === true;
  const portraitImageFile = optionalField(String(aboutForm.portrait_image_file ?? ''));
  const portraitImageAlt = optionalField(String(aboutForm.portrait_image_alt ?? ''));

  if (enabled && title === '') {
    throw new Error(translate('errors.aboutTitleRequired', locale));
  }

  /** @type {Record<string, unknown>} */
  const about = {
    enabled,
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
 * @param {FormData} formData
 */
export function applySignalCloudsFromForm(originalClouds, formData) {
  if (!Array.isArray(originalClouds)) {
    return [];
  }

  return originalClouds.map((cloud, cloudIndex) => {
    const updated = {
      id: cloud.id,
      enabled: checkboxEnabled(formData.get(`cloud_${cloudIndex}_enabled`)),
      question: optionalField(formData.get(`cloud_${cloudIndex}_question`), cloud.question),
      hint: optionalField(formData.get(`cloud_${cloudIndex}_hint`), cloud.hint ?? ''),
      options: Array.isArray(cloud.options)
        ? cloud.options.map((option, optionIndex) => ({
            id: option.id,
            label: optionalField(
              formData.get(`cloud_${cloudIndex}_option_${optionIndex}_label`),
              option.label
            )
          }))
        : []
    };

    return updated;
  });
}

/**
 * @param {unknown[]} clouds
 */
export function writeSignalCloudRecords(clouds) {
  writeProjectYaml('config/signal-clouds.yaml', { signal_clouds: clouds });
}
