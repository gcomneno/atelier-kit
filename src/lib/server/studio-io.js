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
 */
export function requiredField(value, label) {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new Error(`${label} is required.`);
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

/** @param {{ ok: boolean, output: string }} validation */
export function validationMessage(validation) {
  if (validation.ok) {
    return 'Saved successfully. Structural validation passed. Refresh the preview tab to see changes.';
  }

  return `Saved, but validation reported a problem:\n${validation.output}`;
}

/**
 * @param {string} id
 * @param {string} [label]
 */
export function assertContentId(id, label = 'Id') {
  if (!ID_PATTERN.test(id)) {
    throw new Error(`${label} must use lowercase letters, numbers and hyphens only.`);
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
 */
export function createItemRecord(input) {
  const id = requiredField(String(input.id ?? ''), 'Item id');
  const title = requiredField(String(input.title ?? ''), 'Item title').trim() || titleFromItemId(id);
  const preset = normalizeItemPreset(String(input.preset ?? 'default'));

  if (itemRecordExists(id)) {
    throw new Error(`An item with id "${id}" already exists.`);
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
 */
export function createCollectionRecord(input) {
  const id = requiredField(String(input.id ?? ''), 'Collection id');
  assertContentId(id, 'Collection id');

  const titleInput = String(input.title ?? '').trim();
  const title = titleInput || titleFromItemId(id);
  const description = requiredField(String(input.description ?? ''), 'Collection description');
  const items = Array.isArray(input.items)
    ? input.items.map((itemId) => String(itemId).trim()).filter(Boolean)
    : [];

  if (collectionRecordExists(id)) {
    throw new Error(`A collection with id "${id}" already exists.`);
  }

  if (items.length === 0) {
    throw new Error('Choose at least one item for this collection.');
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
    ok: output.includes('found nothing obvious'),
    output
  };
}

/**
 * @param {string} filename
 */
function imageExtensionFromName(filename) {
  const match = filename.toLowerCase().match(/\.([a-z0-9]+)$/);

  if (!match || !IMAGE_EXTENSIONS.has(match[1])) {
    throw new Error('Use a JPG, PNG or WebP image.');
  }

  return match[1] === 'jpeg' ? 'jpg' : match[1];
}

/**
 * @param {string} id
 * @param {File} file
 */
export async function saveItemImageUpload(id, file) {
  assertContentId(id, 'Item id');

  if (!(file instanceof File) || file.size === 0) {
    throw new Error('Choose an image file to upload.');
  }

  if (file.size > MAX_IMAGE_BYTES) {
    throw new Error('Image must be 5 MB or smaller.');
  }

  const extension = imageExtensionFromName(file.name);
  const imagesDir = path.join(ROOT, 'static/images/items');
  mkdirSync(imagesDir, { recursive: true });

  const filename = `${id}.${extension}`;
  const absolutePath = path.join(imagesDir, filename);
  const buffer = Buffer.from(await file.arrayBuffer());
  writeFileSync(absolutePath, buffer);

  return `/images/items/${filename}`;
}

export function defaultItemImagePath(id) {
  assertContentId(id, 'Item id');
  return `/images/items/${id}.jpg`;
}

export function loadCatalogForm() {
  const data = readProjectYaml('config/catalog.yaml');
  const catalog = data.catalog;

  if (!catalog || typeof catalog !== 'object' || Array.isArray(catalog)) {
    throw new Error('config/catalog.yaml is missing a catalog object.');
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
 */
export function writeCatalogForm(catalogForm) {
  const singular = String(catalogForm.item_name_singular ?? '').trim();
  const plural = String(catalogForm.item_name_plural ?? '').trim();

  if (singular === '') {
    throw new Error('Item name (singular) is required.');
  }

  if (plural === '') {
    throw new Error('Item name (plural) is required.');
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

export function loadAboutForm() {
  const aboutPath = path.join(ROOT, 'config/about.yaml');

  if (!existsSync(aboutPath)) {
    return {
      enabled: false,
      title: '',
      intro: '',
      section_heading: '',
      section_body: ''
    };
  }

  const data = readProjectYaml('config/about.yaml');
  const about = data.about;

  if (!about || typeof about !== 'object' || Array.isArray(about)) {
    throw new Error('config/about.yaml is missing an about object.');
  }

  const sections = Array.isArray(about.sections) ? about.sections : [];
  const firstSection = sections[0] && typeof sections[0] === 'object' ? sections[0] : {};

  return {
    enabled: about.enabled !== false,
    title: typeof about.title === 'string' ? about.title : '',
    intro: typeof about.intro === 'string' ? about.intro : '',
    section_heading: typeof firstSection.heading === 'string' ? firstSection.heading : '',
    section_body: typeof firstSection.body === 'string' ? firstSection.body : ''
  };
}

/**
 * @param {Record<string, unknown>} aboutForm
 */
export function writeAboutForm(aboutForm) {
  const enabled = aboutForm.enabled === true;
  const title = optionalField(String(aboutForm.title ?? ''));
  const intro = optionalField(String(aboutForm.intro ?? ''));
  const sectionHeading = optionalField(String(aboutForm.section_heading ?? ''));
  const sectionBody = optionalField(String(aboutForm.section_body ?? ''));

  if (enabled && title === '') {
    throw new Error('About page title is required when the page is enabled.');
  }

  /** @type {Record<string, unknown>} */
  const about = {
    enabled,
    title,
    intro
  };

  if (sectionHeading !== '' || sectionBody !== '') {
    about.sections = [
      {
        heading: sectionHeading || 'Process',
        body: sectionBody
      }
    ];
  }

  writeProjectYaml('config/about.yaml', { about });
}

export function readSignalCloudRecords() {
  const data = readProjectYaml('config/signal-clouds.yaml');
  const clouds = data.signal_clouds;

  if (!Array.isArray(clouds)) {
    throw new Error('config/signal-clouds.yaml is missing signal_clouds.');
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
      enabled: cloud.enabled !== false,
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
