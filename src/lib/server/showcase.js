import { error } from '@sveltejs/kit';
import { parse } from 'yaml';

/**
 * @typedef {Record<string, unknown>} UnknownRecord
 */

const siteModules = import.meta.glob('/config/site.yaml', {
  query: '?raw',
  import: 'default',
  eager: true
});

const catalogModules = import.meta.glob('/config/catalog.yaml', {
  query: '?raw',
  import: 'default',
  eager: true
});

const signalCloudModules = import.meta.glob('/config/signal-clouds.yaml', {
  query: '?raw',
  import: 'default',
  eager: true
});

const itemModules = import.meta.glob('/content/items/*.yaml', {
  query: '?raw',
  import: 'default',
  eager: true
});

/**
 * @param {Record<string, string>} modules
 * @param {string} label
 * @returns {string}
 */
function readSingleModule(modules, label) {
  const values = Object.values(modules);

  if (values.length !== 1) {
    throw new Error(`Expected exactly one YAML module for ${label}, found ${values.length}`);
  }

  return values[0];
}

/**
 * @param {unknown} value
 * @param {string} source
 * @returns {UnknownRecord}
 */
function asRecord(value, source) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(`Invalid object in ${source}`);
  }

  return /** @type {UnknownRecord} */ (value);
}

/**
 * @param {string} raw
 * @param {string} source
 * @returns {UnknownRecord}
 */
function parseYaml(raw, source) {
  return asRecord(parse(raw), source);
}

/**
 * @param {UnknownRecord} record
 * @param {string} field
 * @param {string} source
 * @returns {string}
 */
function requireString(record, field, source) {
  const value = record[field];

  if (typeof value !== 'string' || value.trim() === '') {
    throw new Error(`Missing or invalid "${field}" in ${source}`);
  }

  return value;
}

function normalizeSite() {
  const source = 'config/site.yaml';
  const data = parseYaml(readSingleModule(siteModules, source), source);
  const site = asRecord(data.site, source);

  return {
    name: requireString(site, 'name', source),
    tagline: requireString(site, 'tagline', source),
    language: typeof site.language === 'string' ? site.language : 'en',
    notice: typeof site.notice === 'string' ? site.notice : '',
    footer_note: typeof site.footer_note === 'string' ? site.footer_note : ''
  };
}

function normalizeCatalog() {
  const source = 'config/catalog.yaml';
  const data = parseYaml(readSingleModule(catalogModules, source), source);
  const catalog = asRecord(data.catalog, source);
  const fields = asRecord(catalog.fields ?? {}, `${source} fields`);

  return {
    item_name_singular: requireString(catalog, 'item_name_singular', source),
    item_name_plural: requireString(catalog, 'item_name_plural', source),
    fields: {
      show_price: Boolean(fields.show_price),
      show_availability: fields.show_availability !== false,
      show_material: fields.show_material !== false,
      show_dimensions: fields.show_dimensions !== false,
      show_status: fields.show_status !== false
    }
  };
}

function normalizeSignalClouds() {
  const source = 'config/signal-clouds.yaml';
  const data = parseYaml(readSingleModule(signalCloudModules, source), source);
  const clouds = data.signal_clouds;

  if (!Array.isArray(clouds)) {
    throw new Error(`Missing "signal_clouds" array in ${source}`);
  }

  return clouds
    .filter((cloud) => asRecord(cloud, source).enabled !== false)
    .map((cloud, cloudIndex) => {
      const cloudSource = `${source} cloud #${cloudIndex + 1}`;
      const cloudRecord = asRecord(cloud, cloudSource);
      const options = cloudRecord.options;

      if (!Array.isArray(options) || options.length === 0) {
        throw new Error(`Missing options in ${cloudSource}`);
      }

      return {
        id: requireString(cloudRecord, 'id', cloudSource),
        question: requireString(cloudRecord, 'question', cloudSource),
        hint: typeof cloudRecord.hint === 'string' ? cloudRecord.hint : '',
        options: options
          .filter((option) => asRecord(option, cloudSource).enabled !== false)
          .map((option, optionIndex) => {
            const optionSource = `${cloudSource} option #${optionIndex + 1}`;
            const optionRecord = asRecord(option, optionSource);

            return {
              id: requireString(optionRecord, 'id', optionSource),
              label: requireString(optionRecord, 'label', optionSource)
            };
          })
      };
    });
}

/**
 * @param {UnknownRecord} rawItem
 * @param {string} source
 */
function normalizeItem(rawItem, source) {
  const item = {
    id: requireString(rawItem, 'id', source),
    title: requireString(rawItem, 'title', source),
    subtitle: typeof rawItem.subtitle === 'string' ? rawItem.subtitle : '',
    status: typeof rawItem.status === 'string' ? rawItem.status : '',
    material: typeof rawItem.material === 'string' ? rawItem.material : '',
    dimensions: typeof rawItem.dimensions === 'string' ? rawItem.dimensions : '',
    availability: typeof rawItem.availability === 'string' ? rawItem.availability : '',
    price_mode: typeof rawItem.price_mode === 'string' ? rawItem.price_mode : '',
    image_file: requireString(rawItem, 'image_file', source),
    description: requireString(rawItem, 'description', source),
    notice: typeof rawItem.notice === 'string' ? rawItem.notice : ''
  };

  if (!item.image_file.startsWith('/')) {
    throw new Error(`image_file must start with "/" in ${source}`);
  }

  return item;
}

function normalizeItems() {
  return Object.entries(itemModules)
    .map(([source, raw]) => normalizeItem(parseYaml(raw, source), source))
    .sort((a, b) => a.title.localeCompare(b.title));
}

const SITE = normalizeSite();
const CATALOG = normalizeCatalog();
const SIGNAL_CLOUDS = normalizeSignalClouds();
const ITEMS = normalizeItems();

export function getSiteConfig() {
  return SITE;
}

export function getCatalogConfig() {
  return CATALOG;
}

export function getSignalClouds() {
  return SIGNAL_CLOUDS;
}

export function getItems() {
  return ITEMS;
}

/**
 * @param {string} id
 */
export function getItemById(id) {
  const item = ITEMS.find((entry) => entry.id === id);

  if (!item) {
    error(404, `Catalog item not found: ${id}`);
  }

  return item;
}
