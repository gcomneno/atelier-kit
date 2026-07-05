import { existsSync, readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { parse } from 'yaml';
import { createTranslator } from '../src/lib/i18n/index.js';
import { loadOperatorLocale } from '../src/lib/i18n/load-operator-locale.js';
import { isValidFooterHref } from '../src/lib/footer-links.js';
import { isValidSocialUrl, normalizeSocialId } from '../src/lib/social-networks.js';

const ROOT = process.cwd();
const t = createTranslator(loadOperatorLocale());

function fail(message) {
  console.error(`ERROR: ${message}`);
  process.exitCode = 1;
}

/** @param {string} key @param {Record<string, string | number>} [params] */
function failKey(key, params = {}) {
  fail(t(`validate.${key}`, params));
}

function readYaml(relativePath) {
  const absolutePath = path.join(ROOT, relativePath);

  try {
    const raw = readFileSync(absolutePath, 'utf8');
    const data = parse(raw);

    if (!data || typeof data !== 'object' || Array.isArray(data)) {
      failKey('yamlMustBeObject', { path: relativePath });
      return {};
    }

    return data;
  } catch (error) {
    failKey('yamlReadError', { path: relativePath, message: error.message });
    return {};
  }
}

function requireString(record, field, source) {
  const value = record[field];

  if (typeof value !== 'string' || value.trim() === '') {
    failKey('missingField', { source, field });
    return '';
  }

  return value;
}

function isValidId(value) {
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value);
}

function assertUnique(values, label) {
  const seen = new Set();

  for (const value of values) {
    if (seen.has(value)) {
      failKey('duplicate', { label, value });
    }

    seen.add(value);
  }
}

function validateMetaEntries(entries, source, pathLabel = 'meta') {
  if (entries === undefined) {
    return;
  }

  if (!Array.isArray(entries)) {
    failKey('metaMustBeArray', { source, pathLabel });
    return;
  }

  entries.forEach((entry, index) => {
    const entryPath = `${pathLabel}[${index}]`;

    if (!entry || typeof entry !== 'object' || Array.isArray(entry)) {
      failKey('metaEntryMustBeObject', { source, entryPath });
      return;
    }

    requireString(entry, 'label', `${source}:${entryPath}`);

    const hasValue = typeof entry.value === 'string' && entry.value.trim() !== '';
    const hasChildren = Array.isArray(entry.children) && entry.children.length > 0;

    if (!hasValue && !hasChildren) {
      failKey('metaEntryNeedsValueOrChildren', { source, entryPath });
    }

    if (entry.children !== undefined) {
      validateMetaEntries(entry.children, source, `${entryPath}.children`);
    }
  });
}

function validateSite() {
  const source = 'config/site.yaml';
  const data = readYaml(source);
  const site = data.site;

  if (!site || typeof site !== 'object' || Array.isArray(site)) {
    failKey('missingSiteObject', { source });
    return;
  }

  requireString(site, 'name', source);
  requireString(site, 'tagline', source);

  if ('appearance' in site && site.appearance !== undefined) {
    validateAppearance(site.appearance, source);
  }
}

const APPEARANCE_PRESETS = new Set(['warm', 'neutral', 'dark', 'custom']);
const HEX_COLOR = /^#[0-9a-fA-F]{6}$/;

/**
 * @param {unknown} appearance
 * @param {string} source
 */
function validateAppearance(appearance, source) {
  if (!appearance || typeof appearance !== 'object' || Array.isArray(appearance)) {
    failKey('appearanceMustBeObject', { source });
    return;
  }

  if ('preset' in appearance && appearance.preset !== undefined) {
    if (typeof appearance.preset !== 'string' || !APPEARANCE_PRESETS.has(appearance.preset)) {
      failKey('appearancePresetInvalid', { source });
    }
  }

  for (const field of ['base_color', 'accent_color', 'text_color']) {
    if (!(field in appearance) || appearance[field] === undefined) {
      continue;
    }

    if (typeof appearance[field] !== 'string' || !HEX_COLOR.test(appearance[field].trim())) {
      failKey('appearanceColorInvalid', { source, field });
    }
  }

  if ('background_image' in appearance && appearance.background_image !== undefined) {
    if (
      typeof appearance.background_image !== 'string' ||
      !appearance.background_image.startsWith('/images/site/')
    ) {
      failKey('appearanceBackgroundInvalid', { source });
    }
  }
}

function validateCatalog() {
  const source = 'config/catalog.yaml';
  const data = readYaml(source);
  const catalog = data.catalog;

  if (!catalog || typeof catalog !== 'object' || Array.isArray(catalog)) {
    failKey('missingCatalogObject', { source });
    return;
  }

  requireString(catalog, 'item_name_singular', source);
  requireString(catalog, 'item_name_plural', source);

  if ('route_segment' in catalog) {
    failKey('routeSegmentUnsupported', { source });
  }
}

function validateSignalClouds() {
  const source = 'config/signal-clouds.yaml';
  const data = readYaml(source);
  const clouds = data.signal_clouds;

  if (!Array.isArray(clouds)) {
    failKey('missingSignalCloudsArray', { source });
    return;
  }

  assertUnique(
    clouds.map((cloud) => cloud?.id).filter(Boolean),
    'signal cloud id'
  );

  for (const cloud of clouds) {
    if (!cloud || typeof cloud !== 'object' || Array.isArray(cloud)) {
      failKey('cloudMustBeObject', { source });
      continue;
    }

    const cloudId = requireString(cloud, 'id', source);
    requireString(cloud, 'question', `${source}:${cloudId}`);

    if (!Array.isArray(cloud.options) || cloud.options.length === 0) {
      failKey('cloudOptionsRequired', { source, cloudId });
      continue;
    }

    assertUnique(
      cloud.options.map((option) => option?.id).filter(Boolean),
      `option id in cloud ${cloudId}`
    );

    for (const option of cloud.options) {
      if (!option || typeof option !== 'object' || Array.isArray(option)) {
        failKey('optionMustBeObject', { source, cloudId });
        continue;
      }

      const optionId = requireString(option, 'id', `${source}:${cloudId}`);
      requireString(option, 'label', `${source}:${cloudId}:${optionId}`);
    }
  }
}


function validateAbout() {
  const source = 'config/about.yaml';

  if (!existsSync(path.join(ROOT, source))) {
    return;
  }

  const data = readYaml(source);
  const about = data.about;

  if (!about || typeof about !== 'object' || Array.isArray(about)) {
    failKey('missingAboutObject', { source });
    return;
  }

  if (about.enabled === false) {
    return;
  }

  requireString(about, 'title', source);

  if (Array.isArray(about.sections)) {
    about.sections.forEach((section, index) => {
      const sectionSource = `${source}:sections[${index}]`;

      if (!section || typeof section !== 'object' || Array.isArray(section)) {
        failKey('sectionMustBeObject', { sectionSource });
        return;
      }

      requireString(section, 'heading', sectionSource);
      requireString(section, 'body', sectionSource);
    });
  }
}

function validateContact() {
  const source = 'config/contact.yaml';

  if (!existsSync(path.join(ROOT, source))) {
    return;
  }

  const data = readYaml(source);
  const contact = data.contact;

  if (!contact || typeof contact !== 'object' || Array.isArray(contact)) {
    failKey('missingContactObject', { source });
    return;
  }

  const email = contact.email;

  if (email !== undefined) {
    if (!email || typeof email !== 'object' || Array.isArray(email)) {
      failKey('contactEmailMustBeObject', { source });
    } else if (email.enabled === true) {
      requireString(email, 'address', `${source}:contact.email`);
    }
  }

  const whatsapp = contact.whatsapp;

  if (whatsapp !== undefined) {
    if (!whatsapp || typeof whatsapp !== 'object' || Array.isArray(whatsapp)) {
      failKey('contactWhatsappMustBeObject', { source });
    } else if (whatsapp.enabled === true) {
      requireString(whatsapp, 'phone', `${source}:contact.whatsapp`);
    }
  }
}


function validateSocial() {
  const source = 'config/social.yaml';

  if (!existsSync(path.join(ROOT, source))) {
    return;
  }

  const data = readYaml(source);
  const social = data.social;

  if (!social || typeof social !== 'object' || Array.isArray(social)) {
    failKey('missingSocialObject', { source });
    return;
  }

  if (!Array.isArray(social.links)) {
    failKey('socialLinksMustBeArray', { source });
    return;
  }

  const linkIds = [];

  social.links.forEach((entry, index) => {
    const entrySource = `${source}:links[${index}]`;

    if (!entry || typeof entry !== 'object' || Array.isArray(entry)) {
      failKey('socialLinkMustBeObject', { source: entrySource });
      return;
    }

    const idValue = requireString(entry, 'id', entrySource);
    const id = normalizeSocialId(idValue);

    if (!id) {
      failKey('socialLinkIdInvalid', { source: entrySource, id: idValue });
      return;
    }

    const url = requireString(entry, 'url', entrySource);

    if (!isValidSocialUrl(url)) {
      failKey('socialLinkUrlInvalid', { source: entrySource });
    }

    linkIds.push(id);
  });

  assertUnique(linkIds, 'social link id');
}

function validateFooter() {
  const source = 'config/footer.yaml';

  if (!existsSync(path.join(ROOT, source))) {
    return;
  }

  const data = readYaml(source);
  const footer = data.footer;

  if (!footer || typeof footer !== 'object' || Array.isArray(footer)) {
    failKey('missingFooterObject', { source });
    return;
  }

  if (footer.columns !== undefined) {
    if (!Array.isArray(footer.columns)) {
      failKey('footerColumnsMustBeArray', { source });
      return;
    }

    footer.columns.forEach((column, columnIndex) => {
      const columnSource = `${source}:columns[${columnIndex}]`;

      if (!column || typeof column !== 'object' || Array.isArray(column)) {
        failKey('footerColumnMustBeObject', { source: columnSource });
        return;
      }

      const title =
        typeof column.title === 'string' ? column.title.trim() : '';

      if (title === '') {
        return;
      }

      if (!Array.isArray(column.links)) {
        failKey('footerColumnLinksMustBeArray', { source: columnSource });
        return;
      }

      column.links.forEach((link, linkIndex) => {
        const linkSource = `${columnSource}:links[${linkIndex}]`;

        if (!link || typeof link !== 'object' || Array.isArray(link)) {
          failKey('footerLinkMustBeObject', { source: linkSource });
          return;
        }

        const label = requireString(link, 'label', linkSource);
        const href = requireString(link, 'href', linkSource);

        if (!isValidFooterHref(href)) {
          failKey('footerLinkHrefInvalid', { source: linkSource });
        }

        if (label === '') {
          failKey('footerLinkLabelRequired', { source: linkSource });
        }
      });
    });
  }

  for (const field of ['copyright', 'legal_line']) {
    if (!(field in footer) || footer[field] === undefined) {
      continue;
    }

    if (typeof footer[field] !== 'string') {
      failKey('footerFieldMustBeString', { source, field });
    }
  }

  if ('show_social' in footer && footer.show_social !== undefined && typeof footer.show_social !== 'boolean') {
    failKey('footerShowSocialInvalid', { source });
  }
}

function validateLegal() {
  const source = 'config/legal.yaml';

  if (!existsSync(path.join(ROOT, source))) {
    return;
  }

  const data = readYaml(source);
  const legal = data.legal;

  if (!legal || typeof legal !== 'object' || Array.isArray(legal)) {
    failKey('missingLegalObject', { source });
    return;
  }

  if (!legal.pages || typeof legal.pages !== 'object' || Array.isArray(legal.pages)) {
    failKey('legalPagesMustBeObject', { source });
    return;
  }

  for (const [slug, page] of Object.entries(legal.pages)) {
    const pageSource = `${source}:pages.${slug}`;

    if (!page || typeof page !== 'object' || Array.isArray(page)) {
      failKey('legalPageMustBeObject', { source: pageSource });
      continue;
    }

    requireString(page, 'title', pageSource);
    requireString(page, 'body', pageSource);
  }
}

function validateItems() {
  const itemsDir = path.join(ROOT, 'content/items');

  if (!existsSync(itemsDir)) {
    failKey('itemsDirMissing');
    return new Set();
  }

  const files = readdirSync(itemsDir).filter((file) => file.endsWith('.yaml'));

  if (files.length === 0) {
    failKey('itemsDirEmpty');
    return new Set();
  }

  const ids = [];

  for (const file of files) {
    const source = `content/items/${file}`;
    const item = readYaml(source);
    const id = requireString(item, 'id', source);

    ids.push(id);

    requireString(item, 'title', source);
    requireString(item, 'description', source);
    validateMetaEntries(item.meta, source);

    const imageFile = requireString(item, 'image_file', source);

    if (!imageFile.startsWith('/')) {
      failKey('imageFileMustStartWithSlash', { source });
      continue;
    }

    const staticImagePath = path.join(ROOT, 'static', imageFile.slice(1));

    if (!existsSync(staticImagePath)) {
      failKey('imageFileMissing', { source, imageFile });
    }
  }

  assertUnique(ids, 'item id');

  return new Set(ids);
}

function validateCollections(itemIds) {
  const collectionsDir = path.join(ROOT, 'content/collections');

  if (!existsSync(collectionsDir)) {
    return;
  }

  const files = readdirSync(collectionsDir).filter((file) => file.endsWith('.yaml'));

  const collectionIds = [];

  for (const file of files) {
    const source = `content/collections/${file}`;
    const collection = readYaml(source);
    const id = requireString(collection, 'id', source);
    const expectedId = file.replace(/\.yaml$/, '');

    collectionIds.push(id);

    if (!isValidId(id)) {
      failKey('collectionIdInvalid', { source });
    }

    if (id !== expectedId) {
      failKey('collectionIdFilenameMismatch', { source, expectedId });
    }

    requireString(collection, 'title', source);
    requireString(collection, 'description', source);

    if (!Array.isArray(collection.items) || collection.items.length === 0) {
      failKey('collectionItemsRequired', { source });
      continue;
    }

    const references = [];

    collection.items.forEach((itemId, index) => {
      const itemSource = `${source}:items[${index}]`;

      if (typeof itemId !== 'string' || itemId.trim() === '') {
        failKey('collectionItemRefInvalid', { itemSource });
        return;
      }

      references.push(itemId);

      if (!itemIds.has(itemId)) {
        failKey('collectionItemRefUnknown', { itemSource, itemId });
      }
    });

    assertUnique(references, `item reference in collection ${id}`);
  }

  assertUnique(collectionIds, 'collection id');
}

validateSite();
validateCatalog();
validateAbout();
validateSignalClouds();
validateContact();
validateSocial();
validateFooter();
validateLegal();
const itemIds = validateItems();
validateCollections(itemIds);

if (process.exitCode) {
  process.exit();
}

console.log(t('validate.ok'));
