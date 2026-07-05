import { parse } from 'yaml';
import { isValidFooterHref } from '$lib/footer-links.js';
import {
  DEFAULT_LATEST_NEWS_COUNT,
  DEFAULT_LAYOUT_PRESET,
  isLayoutPreset,
  MAX_LATEST_NEWS_COUNT
} from '$lib/layout-presets.js';
import { isValidSocialUrl, normalizeSocialId } from '$lib/social-networks.js';
import { resolveSiteAppearance } from '$lib/site-appearance.js';

const configFiles = import.meta.glob('/config/*.yaml', {
  query: '?raw',
  import: 'default',
  eager: true
});

const itemFiles = import.meta.glob('/content/items/*.yaml', {
  query: '?raw',
  import: 'default',
  eager: true
});

const collectionFiles = import.meta.glob('/content/collections/*.yaml', {
  query: '?raw',
  import: 'default',
  eager: true
});

const newsFiles = import.meta.glob('/content/news/*.yaml', {
  query: '?raw',
  import: 'default',
  eager: true
});

/**
 * @typedef {{ label: string, value?: string, children?: MetaInfoEntry[] }} MetaInfoEntry
 */

/**
 * @param {unknown} value
 * @returns {value is Record<string, unknown>}
 */
function isRecord(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

/**
 * @param {string} source
 * @param {string} raw
 * @returns {Record<string, unknown>}
 */
function parseYaml(source, raw) {
  const data = parse(raw);

  if (!isRecord(data)) {
    throw new Error(`${source} must contain a YAML object.`);
  }

  return data;
}

/**
 * @param {string} source
 * @returns {Record<string, unknown>}
 */
function readYaml(source) {
  const raw = configFiles[source];

  if (typeof raw !== 'string') {
    throw new Error(`Missing YAML file: ${source}`);
  }

  return parseYaml(source, raw);
}

/**
 * @param {Record<string, unknown>} record
 * @param {string} field
 * @param {string} source
 * @returns {string}
 */
function requiredString(record, field, source) {
  const value = record[field];

  if (typeof value !== 'string' || value.trim() === '') {
    throw new Error(`${source}: missing or invalid "${field}".`);
  }

  return value.trim();
}

/**
 * @param {Record<string, unknown>} record
 * @param {string} field
 * @param {string} [fallback]
 * @returns {string}
 */
function optionalString(record, field, fallback = '') {
  const value = record[field];

  if (typeof value !== 'string') {
    return fallback;
  }

  return value.trim();
}

/**
 * @param {unknown} entries
 * @param {string} source
 * @returns {MetaInfoEntry[]}
 */
function normalizeMetaEntries(entries, source) {
  if (entries === undefined) {
    return [];
  }

  if (!Array.isArray(entries)) {
    throw new Error(`${source}: "meta" must be an array when provided.`);
  }

  return entries.map((entry, index) => normalizeMetaEntry(entry, `${source}:meta[${index}]`));
}

/**
 * @param {unknown} entry
 * @param {string} source
 * @returns {MetaInfoEntry}
 */
function normalizeMetaEntry(entry, source) {
  if (!isRecord(entry)) {
    throw new Error(`${source}: meta entry must be an object.`);
  }

  const label = requiredString(entry, 'label', source);
  const value = optionalString(entry, 'value');
  const children = normalizeMetaEntries(entry.children, `${source}.children`);

  if (!value && children.length === 0) {
    throw new Error(`${source}: meta entry must have either "value" or "children".`);
  }

  return {
    label,
    ...(value ? { value } : {}),
    ...(children.length > 0 ? { children } : {})
  };
}

/**
 * @param {MetaInfoEntry[]} entries
 * @param {string} label
 * @returns {string}
 */
function findMetaValue(entries, label) {
  const wanted = label.toLowerCase();

  for (const entry of entries) {
    if (entry.label.toLowerCase() === wanted && entry.value) {
      return entry.value;
    }

    if (entry.children) {
      const value = findMetaValue(entry.children, label);

      if (value) {
        return value;
      }
    }
  }

  return '';
}

export function getSiteConfig() {
  const data = readYaml('/config/site.yaml');
  const site = data.site;

  if (!isRecord(site)) {
    throw new Error('config/site.yaml: missing "site" object.');
  }

  return {
    name: requiredString(site, 'name', 'config/site.yaml'),
    tagline: requiredString(site, 'tagline', 'config/site.yaml'),
    language: optionalString(site, 'language', 'en'),
    notice: optionalString(site, 'notice'),
    footer_note: optionalString(site, 'footer_note'),
    appearance: resolveSiteAppearance(isRecord(site.appearance) ? site.appearance : undefined)
  };
}

export function getCatalogConfig() {
  const data = readYaml('/config/catalog.yaml');
  const catalog = data.catalog;

  if (!isRecord(catalog)) {
    throw new Error('config/catalog.yaml: missing "catalog" object.');
  }

  const fields = isRecord(catalog.fields) ? catalog.fields : {};

  return {
    item_name_singular: requiredString(catalog, 'item_name_singular', 'config/catalog.yaml'),
    item_name_plural: requiredString(catalog, 'item_name_plural', 'config/catalog.yaml'),
    fields: {
      show_price: fields.show_price === true,
      show_availability: fields.show_availability !== false,
      show_material: fields.show_material !== false,
      show_dimensions: fields.show_dimensions !== false,
      show_status: fields.show_status !== false,
      show_meta: fields.show_meta !== false
    }
  };
}

export function getSignalClouds() {
  const data = readYaml('/config/signal-clouds.yaml');
  const clouds = data.signal_clouds;

  if (!Array.isArray(clouds)) {
    throw new Error('config/signal-clouds.yaml: missing "signal_clouds" array.');
  }

  return clouds
    .filter((cloud) => isRecord(cloud) && cloud.enabled !== false)
    .map((cloud, cloudIndex) => {
    const source = `config/signal-clouds.yaml:signal_clouds[${cloudIndex}]`;

    if (!isRecord(cloud)) {
      throw new Error(`${source}: cloud must be an object.`);
    }

    if (!Array.isArray(cloud.options) || cloud.options.length === 0) {
      throw new Error(`${source}: options must be a non-empty array.`);
    }

    return {
      id: requiredString(cloud, 'id', source),
      question: requiredString(cloud, 'question', source),
      hint: optionalString(cloud, 'hint'),
      options: cloud.options.map((option, optionIndex) => {
        const optionSource = `${source}.options[${optionIndex}]`;

        if (!isRecord(option)) {
          throw new Error(`${optionSource}: option must be an object.`);
        }

        return {
          id: requiredString(option, 'id', optionSource),
          label: requiredString(option, 'label', optionSource)
        };
      })
    };
  });
}

export function getAboutConfig() {
  const raw = configFiles['/config/about.yaml'];

  if (typeof raw !== 'string') {
    return null;
  }

  const data = parseYaml('/config/about.yaml', raw);
  const about = data.about;

  if (!isRecord(about) || about.enabled === false) {
    return null;
  }

  const sections = Array.isArray(about.sections)
    ? about.sections
        .filter((section) => isRecord(section))
        .map((section, index) => ({
          heading: requiredString(section, 'heading', `config/about.yaml:sections[${index}]`),
          body: requiredString(section, 'body', `config/about.yaml:sections[${index}]`)
        }))
    : [];

  return {
    title: requiredString(about, 'title', 'config/about.yaml'),
    intro: optionalString(about, 'intro'),
    sections
  };
}

export function getContactConfig() {
  const data = readYaml('/config/contact.yaml');
  const contact = data.contact;

  if (!isRecord(contact)) {
    return {
      email: {
        enabled: false,
        label: 'Email this brief',
        address: '',
        subject_prefix: 'Interest in'
      },
      whatsapp: {
        enabled: false,
        label: 'WhatsApp this brief',
        phone: ''
      }
    };
  }

  const email = isRecord(contact.email) ? contact.email : {};
  const whatsapp = isRecord(contact.whatsapp) ? contact.whatsapp : {};

  const emailAddress = optionalString(email, 'address');
  const whatsappPhone = optionalString(whatsapp, 'phone');

  return {
    email: {
      enabled: email.enabled === true && emailAddress !== '',
      label: optionalString(email, 'label', 'Email this brief'),
      address: emailAddress,
      subject_prefix: optionalString(email, 'subject_prefix', 'Interest in')
    },
    whatsapp: {
      enabled: whatsapp.enabled === true && whatsappPhone !== '',
      label: optionalString(whatsapp, 'label', 'WhatsApp this brief'),
      phone: whatsappPhone
    }
  };
}

/**
 * @typedef {{ label: string, href: string }} FooterLink
 * @typedef {{ title: string, links: FooterLink[] }} FooterColumn
 * @typedef {{ columns: FooterColumn[], copyright: string, legal_line: string, show_social: boolean }} FooterConfig
 * @typedef {{ slug: string, title: string, body: string }} LegalPage
 */

/**
 * @param {unknown} footer
 * @returns {footer is FooterConfig}
 */
export function isFooterActive(footer) {
  if (!footer || typeof footer !== 'object') {
    return false;
  }

  const config = /** @type {FooterConfig} */ (footer);

  return (
    config.columns.length > 0 ||
    config.copyright.trim() !== '' ||
    config.legal_line.trim() !== ''
  );
}

/**
 * @param {unknown} entry
 * @param {string} source
 * @returns {FooterLink | null}
 */
function normalizeFooterLink(entry, source) {
  if (!isRecord(entry)) {
    throw new Error(`${source}: link must be an object.`);
  }

  const label = optionalString(entry, 'label');
  const href = optionalString(entry, 'href');

  if (label === '' || href === '') {
    return null;
  }

  if (!isValidFooterHref(href)) {
    throw new Error(`${source}: href must start with "/" or be a valid http or https URL.`);
  }

  return { label, href };
}

/**
 * @param {unknown} column
 * @param {string} source
 * @returns {FooterColumn | null}
 */
function normalizeFooterColumn(column, source) {
  if (!isRecord(column)) {
    throw new Error(`${source}: column must be an object.`);
  }

  const title = optionalString(column, 'title');

  if (title === '') {
    return null;
  }

  if (!Array.isArray(column.links)) {
    throw new Error(`${source}: links must be an array when provided.`);
  }

  const links = column.links
    .map((link, index) => normalizeFooterLink(link, `${source}.links[${index}]`))
    .filter((link) => link !== null);

  if (links.length === 0) {
    return null;
  }

  return { title, links: /** @type {FooterLink[]} */ (links) };
}

export function getFooterConfig() {
  const raw = configFiles['/config/footer.yaml'];

  if (typeof raw !== 'string') {
    return null;
  }

  const data = parseYaml('/config/footer.yaml', raw);
  const footer = data.footer;

  if (!isRecord(footer)) {
    throw new Error('config/footer.yaml: missing "footer" object.');
  }

  /** @type {FooterColumn[]} */
  const columns = [];

  if (Array.isArray(footer.columns)) {
    footer.columns.forEach((column, index) => {
      const normalized = normalizeFooterColumn(column, `config/footer.yaml:columns[${index}]`);

      if (normalized) {
        columns.push(normalized);
      }
    });
  }

  return {
    columns,
    copyright: optionalString(footer, 'copyright'),
    legal_line: optionalString(footer, 'legal_line'),
    show_social: footer.show_social === true
  };
}

export function getLegalPages() {
  const raw = configFiles['/config/legal.yaml'];

  if (typeof raw !== 'string') {
    return [];
  }

  const data = parseYaml('/config/legal.yaml', raw);
  const legal = data.legal;

  if (!isRecord(legal) || !isRecord(legal.pages)) {
    return [];
  }

  return Object.entries(legal.pages)
    .map(([slug, page]) => {
      const source = `config/legal.yaml:pages.${slug}`;

      if (!isRecord(page)) {
        throw new Error(`${source}: page must be an object.`);
      }

      return {
        slug,
        title: requiredString(page, 'title', source),
        body: requiredString(page, 'body', source)
      };
    })
    .sort((left, right) => left.title.localeCompare(right.title));
}

/**
 * @param {string} slug
 * @returns {LegalPage | null}
 */
export function getLegalPage(slug) {
  return getLegalPages().find((page) => page.slug === slug) ?? null;
}

export function getSocialConfig() {
  const raw = configFiles['/config/social.yaml'];

  if (typeof raw !== 'string') {
    return { links: [] };
  }

  const data = parseYaml('/config/social.yaml', raw);
  const social = data.social;

  if (!isRecord(social) || !Array.isArray(social.links)) {
    return { links: [] };
  }

  return {
    links: social.links
      .map((entry, index) => {
        const source = `config/social.yaml:links[${index}]`;

        if (!isRecord(entry)) {
          throw new Error(`${source}: link must be an object.`);
        }

        const idValue = requiredString(entry, 'id', source);
        const id = normalizeSocialId(idValue);

        if (!id) {
          throw new Error(`${source}: id must be one of: instagram, facebook, x.`);
        }

        const url = requiredString(entry, 'url', source);

        if (!isValidSocialUrl(url)) {
          throw new Error(`${source}: url must be a valid http or https URL.`);
        }

        return { id, url };
      })
  };
}

export function getItems() {
  return Object.entries(itemFiles)
    .map(([source, raw]) => {
      if (typeof raw !== 'string') {
        throw new Error(`${source}: expected raw YAML content.`);
      }

      const item = parseYaml(source, raw);
      const meta = normalizeMetaEntries(item.meta, source);

      return {
        id: requiredString(item, 'id', source),
        title: requiredString(item, 'title', source),
        subtitle: optionalString(item, 'subtitle'),
        status: optionalString(item, 'status'),
        price_mode: optionalString(item, 'price_mode'),
        image_file: requiredString(item, 'image_file', source),
        image_alt: optionalString(item, 'image_alt'),
        description: requiredString(item, 'description', source),
        notice: optionalString(item, 'notice'),
        material: optionalString(item, 'material') || findMetaValue(meta, 'Material'),
        dimensions: optionalString(item, 'dimensions') || findMetaValue(meta, 'Dimensions'),
        availability: optionalString(item, 'availability') || findMetaValue(meta, 'Availability'),
        meta
      };
    })
    .sort((left, right) => left.title.localeCompare(right.title));
}

/**
 * @param {string} id
 */
export function getItemById(id) {
  return getItems().find((item) => item.id === id);
}

export function getCollections() {
  const items = getItems();
  const itemById = new Map(items.map((item) => [item.id, item]));

  return Object.entries(collectionFiles)
    .map(([source, raw]) => {
      if (typeof raw !== 'string') {
        throw new Error(`${source}: expected raw YAML content.`);
      }

      const collection = parseYaml(source, raw);
      const collectionItems = collection.items;

      if (!Array.isArray(collectionItems) || collectionItems.length === 0) {
        throw new Error(`${source}: "items" must be a non-empty array.`);
      }

      const itemIds = collectionItems.map((itemId, index) => {
        if (typeof itemId !== 'string' || itemId.trim() === '') {
          throw new Error(`${source}:items[${index}] must be a non-empty item id string.`);
        }

        return itemId.trim();
      });

      return {
        id: requiredString(collection, 'id', source),
        title: requiredString(collection, 'title', source),
        description: requiredString(collection, 'description', source),
        item_ids: itemIds,
        items: itemIds.map((itemId) => {
          const item = itemById.get(itemId);

          if (!item) {
            throw new Error(`${source}: unknown item id "${itemId}".`);
          }

          return item;
        })
      };
    })
    .sort((left, right) => left.title.localeCompare(right.title));
}

/**
 * @param {string} id
 */
export function getCollectionById(id) {
  return getCollections().find((collection) => collection.id === id);
}

export function getNewsPosts() {
  return Object.entries(newsFiles)
    .map(([source, raw]) => {
      if (typeof raw !== 'string') {
        throw new Error(`${source}: expected raw YAML content.`);
      }

      const post = parseYaml(source, raw);
      const imageFile = optionalString(post, 'image_file');

      return {
        id: requiredString(post, 'id', source),
        title: requiredString(post, 'title', source),
        date: requiredString(post, 'date', source),
        excerpt: optionalString(post, 'excerpt'),
        body: requiredString(post, 'body', source),
        ...(imageFile ? { image_file: imageFile, image_alt: optionalString(post, 'image_alt') } : {})
      };
    })
    .sort((left, right) => right.date.localeCompare(left.date));
}

/**
 * @param {string} id
 */
export function getNewsPost(id) {
  return getNewsPosts().find((post) => post.id === id);
}

/**
 * @typedef {{
 *   collections: boolean,
 *   about: boolean,
 *   latest_news: boolean,
 *   latest_news_count: number
 * }} SidebarWidgetConfig
 * @typedef {{
 *   preset: import('$lib/layout-presets.js').LayoutPreset,
 *   sidebar: SidebarWidgetConfig
 * }} LayoutConfig
 */

/** @type {LayoutConfig} */
const DEFAULT_LAYOUT_CONFIG = {
  preset: DEFAULT_LAYOUT_PRESET,
  sidebar: {
    collections: true,
    about: true,
    latest_news: true,
    latest_news_count: DEFAULT_LATEST_NEWS_COUNT
  }
};

/**
 * @param {unknown} value
 * @param {number} fallback
 * @returns {number}
 */
function optionalPositiveInt(value, fallback) {
  if (typeof value !== 'number' || !Number.isInteger(value) || value < 1) {
    return fallback;
  }

  return Math.min(value, MAX_LATEST_NEWS_COUNT);
}

export function getLayoutConfig() {
  const raw = configFiles['/config/layout.yaml'];

  if (typeof raw !== 'string') {
    return DEFAULT_LAYOUT_CONFIG;
  }

  const data = parseYaml('/config/layout.yaml', raw);
  const layout = data.layout;

  if (!isRecord(layout)) {
    throw new Error('config/layout.yaml: missing "layout" object.');
  }

  const presetValue = optionalString(layout, 'preset', DEFAULT_LAYOUT_PRESET);

  if (!isLayoutPreset(presetValue)) {
    throw new Error(
      'config/layout.yaml: layout.preset must be "single-column" or "catalog-sidebar".'
    );
  }

  const sidebar = isRecord(layout.sidebar) ? layout.sidebar : {};

  return {
    preset: presetValue,
    sidebar: {
      collections: sidebar.collections !== false,
      about: sidebar.about !== false,
      latest_news: sidebar.latest_news !== false,
      latest_news_count: optionalPositiveInt(
        sidebar.latest_news_count,
        DEFAULT_LATEST_NEWS_COUNT
      )
    }
  };
}

/**
 * @param {LayoutConfig} layout
 */
export function isCatalogSidebarActive(layout) {
  return layout.preset === 'catalog-sidebar';
}

/**
 * Sidebar applies on home (`/`) and the collections index (`/collections`) only.
 * Item detail, collection detail, news, about and legal pages stay single-column.
 *
 * @param {LayoutConfig} layout
 */
export function getCatalogSidebarPageData(layout) {
  if (!isCatalogSidebarActive(layout)) {
    return {
      sidebarActive: false,
      layout,
      sidebar: null
    };
  }

  const { sidebar } = layout;

  return {
    sidebarActive: true,
    layout,
    sidebar: {
      collections: sidebar.collections ? getCollections() : [],
      about: sidebar.about ? getAboutConfig() : null,
      newsPosts: sidebar.latest_news
        ? getNewsPosts().slice(0, sidebar.latest_news_count)
        : []
    }
  };
}
