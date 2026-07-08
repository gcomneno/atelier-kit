import { parse } from 'yaml';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { isValidFooterHref } from '$lib/footer-links.js';
import {
  DEFAULT_LATEST_NEWS_COUNT,
  DEFAULT_LAYOUT_PRESET,
  isLayoutPreset,
  MAX_LATEST_NEWS_COUNT,
  MAX_CATALOG_HOME_LIMIT
} from '$lib/layout-presets.js';
import {
  LAYOUT_BLOCK_IDS,
  effectiveBlockPlacement,
  hasSidebarBlocks,
  migrateLegacyLayoutBlocks,
  normalizeLayoutBlocks,
  resolveLayoutPreset
} from '$lib/layout-blocks.js';
import { isValidSocialUrl, normalizeSocialId } from '$lib/social-networks.js';
import { resolveSiteAppearance } from '$lib/site-appearance.js';
import { resolveLocale } from '$lib/i18n/resolve-locale.js';
import { getDefaultLayoutBlockLabel } from '$lib/layout-block-labels.js';
import { normalizeMetaHierarchy } from '$lib/item-meta.js';
import { parseTaglineDisplay } from '$lib/editorial-markup.js';

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

/** @type {Record<string, string>} */
const bundledYamlFiles = {
  ...configFiles,
  ...itemFiles,
  ...collectionFiles,
  ...newsFiles
};

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
 * @returns {string | null}
 */
function readYamlRaw(source) {
  if (import.meta.env.DEV) {
    const relativePath = source.replace(/^\//, '');
    const absolutePath = join(process.cwd(), relativePath);

    if (existsSync(absolutePath)) {
      return readFileSync(absolutePath, 'utf8');
    }
  }

  const bundled = bundledYamlFiles[source];

  return typeof bundled === 'string' ? bundled : null;
}

/**
 * @param {Record<string, string>} globMap
 * @param {string} directory
 * @returns {string[]}
 */
function listYamlSources(globMap, directory) {
  if (import.meta.env.DEV) {
    const absoluteDirectory = join(process.cwd(), directory);

    if (!existsSync(absoluteDirectory)) {
      return [];
    }

    return readdirSync(absoluteDirectory)
      .filter((filename) => filename.endsWith('.yaml'))
      .map((filename) => `/${directory}/${filename}`)
      .sort();
  }

  return Object.keys(globMap).sort();
}

/**
 * @param {Record<string, string>} globMap
 * @param {string} directory
 * @returns {[string, string][]}
 */
function readContentYamlEntries(globMap, directory) {
  return listYamlSources(globMap, directory).map((source) => {
    const raw = readYamlRaw(source);

    if (raw === null) {
      throw new Error(`Missing YAML file: ${source}`);
    }

    return [source, raw];
  });
}

/**
 * @param {string} source
 * @returns {Record<string, unknown>}
 */
function readYaml(source) {
  const raw = readYamlRaw(source);

  if (raw === null) {
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
 * @param {Record<string, unknown>} record
 * @param {string} field
 * @returns {number | null}
 */
function optionalSortOrder(record, field) {
  const value = record[field];

  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value);

    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return null;
}

/**
 * @param {unknown} preview
 */
function normalizeItemPreview(preview) {
  if (!preview || typeof preview !== 'object' || Array.isArray(preview)) {
    return null;
  }

  const record = /** @type {Record<string, unknown>} */ (preview);
  const href = optionalString(record, 'href');

  if (!href.startsWith('/')) {
    return null;
  }

  const label = optionalString(record, 'label');

  return {
    href,
    label: label || 'Preview'
  };
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

  const hierarchy = normalizeMetaHierarchy(entries);

  return hierarchy.map((entry, index) => normalizeMetaEntry(entry, `${source}:meta[${index}]`));
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
    name: optionalString(site, 'name'),
    header_title:
      'header_title' in site ? optionalString(site, 'header_title') : optionalString(site, 'name'),
    intro_title:
      'intro_title' in site ? optionalString(site, 'intro_title') : optionalString(site, 'name'),
    header_logo: optionalString(site, 'header_logo'),
    header_logo_alt: optionalString(site, 'header_logo_alt'),
    tagline: optionalString(site, 'tagline'),
    language: optionalString(site, 'language', 'en'),
    hero_intro: optionalString(site, 'hero_intro'),
    hero_signature: optionalString(site, 'hero_signature'),
    footer_note: optionalString(site, 'footer_note'),
    url: optionalString(site, 'url'),
    og_image: optionalString(site, 'og_image'),
    appearance: resolveSiteAppearance(isRecord(site.appearance) ? site.appearance : undefined),
    hero_banner: parseHeroBanner(site),
    tagline_display: parseTaglineDisplay(site.tagline_display)
  };
}

/**
 * @param {Record<string, unknown>} site
 */
function parseHeroBanner(site) {
  const banner = site.hero_banner;

  if (!isRecord(banner) || banner.show !== true) {
    return null;
  }

  const imageFile = optionalString(banner, 'image_file');

  if (!imageFile) {
    return null;
  }

  const href = optionalString(banner, 'href');

  return {
    image_file: imageFile,
    image_alt: optionalString(site, 'name') ?? 'Hero banner',
    description: optionalString(banner, 'description'),
    caption: optionalString(banner, 'caption'),
    ...(href ? { href } : {})
  };
}

/**
 * @returns {{
 *   item_name_singular: string,
 *   item_name_plural: string,
 *   eyebrow: string,
 *   intro: string,
 *   sort: 'manual' | 'title_asc' | 'title_desc',
 *   home_limit: number
 * }}
 */
export function getCatalogConfig() {
  const data = readYaml('/config/catalog.yaml');
  const catalog = data.catalog;

  if (!isRecord(catalog)) {
    throw new Error('config/catalog.yaml: missing "catalog" object.');
  }

  const sort = optionalString(catalog, 'sort');
  const homeLimitRaw = catalog.home_limit;

  return {
    item_name_singular: requiredString(catalog, 'item_name_singular', 'config/catalog.yaml'),
    item_name_plural: requiredString(catalog, 'item_name_plural', 'config/catalog.yaml'),
    eyebrow: optionalString(catalog, 'eyebrow'),
    intro: optionalString(catalog, 'intro'),
    sort: sort === 'title_asc' || sort === 'title_desc' ? sort : 'manual',
    home_limit:
      typeof homeLimitRaw === 'number' && Number.isInteger(homeLimitRaw) && homeLimitRaw > 0
        ? Math.min(homeLimitRaw, MAX_CATALOG_HOME_LIMIT)
        : 0
  };
}

/**
 * @param {any[]} items
 * @param {'manual' | 'title_asc' | 'title_desc'} sortMode
 */
function sortCatalogItems(items, sortMode) {
  const sorted = [...items];

  if (sortMode === 'title_asc') {
    return sorted.sort((left, right) => left.title.localeCompare(right.title));
  }

  if (sortMode === 'title_desc') {
    return sorted.sort((left, right) => right.title.localeCompare(left.title));
  }

  return sorted.sort((left, right) => {
    const leftOrder = left.sort_order ?? Number.POSITIVE_INFINITY;
    const rightOrder = right.sort_order ?? Number.POSITIVE_INFINITY;

    if (leftOrder !== rightOrder) {
      return leftOrder - rightOrder;
    }

    return left.title.localeCompare(right.title);
  });
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
  const raw = readYamlRaw('/config/about.yaml');

  if (raw === null) {
    return null;
  }

  const data = parseYaml('/config/about.yaml', raw);
  const about = data.about;

  if (!isRecord(about)) {
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
    sections,
    portrait: parseAboutPortrait(about)
  };
}

/**
 * @param {Record<string, unknown>} about
 */
function parseAboutPortrait(about) {
  const portrait = about.portrait;

  if (!isRecord(portrait) || portrait.show !== true) {
    return null;
  }

  const imageFile = optionalString(portrait, 'image_file');

  if (!imageFile) {
    return null;
  }

  return {
    image_file: imageFile,
    image_alt: optionalString(portrait, 'image_alt') ?? optionalString(about, 'title') ?? 'Portrait'
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
  const raw = readYamlRaw('/config/footer.yaml');

  if (raw === null) {
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
  const raw = readYamlRaw('/config/legal.yaml');

  if (raw === null) {
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
  const raw = readYamlRaw('/config/social.yaml');

  if (raw === null) {
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
  const sortMode = getCatalogConfig().sort;

  return sortCatalogItems(
    readContentYamlEntries(itemFiles, 'content/items')
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
        preview: normalizeItemPreview(item.preview),
        sort_order: optionalSortOrder(item, 'sort_order'),
        material: optionalString(item, 'material') || findMetaValue(meta, 'Material'),
        dimensions: optionalString(item, 'dimensions') || findMetaValue(meta, 'Dimensions'),
        availability: optionalString(item, 'availability') || findMetaValue(meta, 'Availability'),
        meta
      };
    }),
    sortMode
  );
}

/**
 * @param {string} id
 */
export function getItemById(id) {
  return getItems().find((item) => item.id === id);
}

/**
 * @param {string} id
 */
export function getItemNeighbors(id) {
  const items = getItems();
  const index = items.findIndex((item) => item.id === id);

  if (index === -1) {
    return { previous: null, next: null };
  }

  const previous = index > 0 ? items[index - 1] : null;
  const next = index < items.length - 1 ? items[index + 1] : null;

  return {
    previous: previous ? { id: previous.id, title: previous.title } : null,
    next: next ? { id: next.id, title: next.title } : null
  };
}

export function getCollections() {
  const items = getItems();
  const itemById = new Map(items.map((item) => [item.id, item]));

  return readContentYamlEntries(collectionFiles, 'content/collections')
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
        sort_order: optionalSortOrder(collection, 'sort_order'),
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
 * @param {string} id
 */
export function getCollectionById(id) {
  return getCollections().find((collection) => collection.id === id);
}

export function getNewsPosts() {
  return readContentYamlEntries(newsFiles, 'content/news')
    .map(([source, raw]) => {
      if (typeof raw !== 'string') {
        throw new Error(`${source}: expected raw YAML content.`);
      }

      const post = parseYaml(source, raw);
      const imageFile = optionalString(post, 'image_file');
      const readingFormat = optionalString(post, 'reading_format');
      const sortOrder =
        typeof post.sort_order === 'number' && Number.isInteger(post.sort_order)
          ? post.sort_order
          : null;

      return {
        id: requiredString(post, 'id', source),
        title: requiredString(post, 'title', source),
        date: requiredString(post, 'date', source),
        excerpt: optionalString(post, 'excerpt'),
        body: requiredString(post, 'body', source),
        sort_order: sortOrder,
        ...(readingFormat ? { reading_format: readingFormat } : {}),
        ...(imageFile ? { image_file: imageFile, image_alt: optionalString(post, 'image_alt') } : {})
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
 * @param {string} id
 */
export function getNewsPost(id) {
  return getNewsPosts().find((post) => post.id === id);
}

/**
 * @typedef {import('$lib/layout-blocks.js').LayoutBlockId} LayoutBlockId
 * @typedef {import('$lib/layout-blocks.js').LayoutBlockConfig} LayoutBlockConfig
 * @typedef {{
 *   preset: import('$lib/layout-presets.js').LayoutPreset,
 *   blocks: Record<LayoutBlockId, LayoutBlockConfig>
 * }} LayoutConfig
 */

/** @type {Record<LayoutBlockId, LayoutBlockConfig>} */
const defaultLayoutBlocks = normalizeLayoutBlocks();

/** @type {LayoutConfig} */
const DEFAULT_LAYOUT_CONFIG = {
  preset: resolveLayoutPreset(DEFAULT_LAYOUT_PRESET, defaultLayoutBlocks),
  blocks: defaultLayoutBlocks
};

export function getLayoutConfig() {
  const raw = readYamlRaw('/config/layout.yaml');

  if (raw === null) {
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

  const blocks = isRecord(layout.blocks)
    ? normalizeLayoutBlocks(layout.blocks)
    : migrateLegacyLayoutBlocks(layout);

  return {
    preset: resolveLayoutPreset(presetValue, blocks),
    blocks
  };
}

/**
 * @param {LayoutConfig} layout
 */
export function isCatalogSidebarActive(layout) {
  return layout.preset === 'catalog-sidebar' && hasSidebarBlocks(layout.preset, layout.blocks);
}

/**
 * @typedef {{ surface?: 'menu' | 'main' | 'sidebar' }} LayoutBlockLabelOptions
 * @param {LayoutBlockId} blockId
 * @param {LayoutBlockConfig} block
 * @param {string} locale
 * @param {LayoutBlockLabelOptions} [_options]
 */
export function resolveLayoutBlockLabel(blockId, block, locale, _options = {}) {
  const custom = typeof block.label === 'string' ? block.label.trim() : '';

  if (custom) {
    return custom;
  }

  return getDefaultLayoutBlockLabel(blockId, locale);
}

/**
 * @param {LayoutConfig} layout
 * @param {string} locale
 */
export function getLayoutBlockLabels(layout, locale) {
  /** @type {Record<LayoutBlockId, string>} */
  const labels = /** @type {Record<LayoutBlockId, string>} */ ({});

  for (const blockId of LAYOUT_BLOCK_IDS) {
    const placement = effectiveBlockPlacement(layout.preset, layout.blocks, blockId);
    const surface =
      placement === 'menu' ? 'menu' : placement === 'main' ? 'main' : 'sidebar';

    labels[blockId] = resolveLayoutBlockLabel(blockId, layout.blocks[blockId], locale, { surface });
  }

  return labels;
}

/**
 * @param {LayoutConfig} layout
 */
export function getHomeLayoutPageData(layout) {
  const locale = resolveLocale(getSiteConfig().language);
  const blockLabels = getLayoutBlockLabels(layout, locale);
  /** @type {Record<LayoutBlockId, 'main' | 'sidebar' | null>} */
  const placements = /** @type {Record<LayoutBlockId, 'main' | 'sidebar' | null>} */ (
    Object.fromEntries(
      LAYOUT_BLOCK_IDS.map((blockId) => [
        blockId,
        effectiveBlockPlacement(layout.preset, layout.blocks, blockId)
      ])
    )
  );

  const newsCount = layout.blocks.news.count ?? DEFAULT_LATEST_NEWS_COUNT;

  const main = {
    about: placements.about === 'main' ? getAboutConfig() : null,
    newsPosts: placements.news === 'main' ? getNewsPosts().slice(0, newsCount) : []
  };

  const sidebarActive = isCatalogSidebarActive(layout);

  if (!sidebarActive) {
    return {
      layout,
      sidebarActive: false,
      placements,
      blockLabels,
      main,
      sidebar: null
    };
  }

  return {
    layout,
    sidebarActive: true,
    placements,
    blockLabels,
    main,
    sidebar: {
      collections: placements.collections === 'sidebar' ? getCollections() : [],
      about: placements.about === 'sidebar' ? getAboutConfig() : null,
      newsPosts:
        placements.news === 'sidebar' ? getNewsPosts().slice(0, newsCount) : [],
      catalogItems: placements.catalog === 'sidebar' ? getItems() : [],
      catalog: placements.catalog === 'sidebar' ? getCatalogConfig() : null
    }
  };
}

/**
 * Sidebar applies on home (`/`), catalog (`/catalog`), collections index and detail.
 *
 * @param {LayoutConfig} layout
 */
export function getCatalogSidebarPageData(layout) {
  return getHomeLayoutPageData(layout);
}

/**
 * @typedef {{ href: string, label: string }} LayoutMenuNavItem
 * @param {LayoutConfig} layout
 * @param {string} locale
 * @returns {LayoutMenuNavItem[]}
 */
export function getLayoutMenuNav(layout, locale) {
  /** @type {LayoutMenuNavItem[]} */
  const items = [];

  for (const blockId of LAYOUT_BLOCK_IDS) {
    if (effectiveBlockPlacement(layout.preset, layout.blocks, blockId) !== 'menu') {
      continue;
    }

    if (blockId === 'about') {
      const about = getAboutConfig();

      if (about) {
        items.push({
          href: '/about',
          label: resolveLayoutBlockLabel(blockId, layout.blocks[blockId], locale, { surface: 'menu' })
        });
      }

      continue;
    }

    if (blockId === 'news') {
      if (getNewsPosts().length > 0) {
        items.push({
          href: '/news',
          label: resolveLayoutBlockLabel(blockId, layout.blocks[blockId], locale, { surface: 'menu' })
        });
      }

      continue;
    }

    if (blockId === 'collections') {
      if (getCollections().length > 0) {
        items.push({
          href: '/collections',
          label: resolveLayoutBlockLabel(blockId, layout.blocks[blockId], locale, { surface: 'menu' })
        });
      }

      continue;
    }

    if (blockId === 'catalog' && getItems().length > 0) {
      items.push({
        href: '/catalog',
        label: resolveLayoutBlockLabel(blockId, layout.blocks[blockId], locale, { surface: 'menu' })
      });
    }
  }

  return items;
}
