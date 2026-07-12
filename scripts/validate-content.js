import { existsSync, readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { parse } from 'yaml';
import { createTranslator } from '../src/lib/i18n/index.js';
import { loadOperatorLocale } from '../src/lib/i18n/load-operator-locale.js';
import { validateAboutPortraitContent } from '../src/lib/about-config.js';
import { validateEditorialFields } from '../src/lib/editorial-markup.js';
import { isValidFooterHref } from '../src/lib/footer-links.js';
import { isHomeShowMode, isLayoutPreset, MAX_CATALOG_HOME_LIMIT, MAX_LATEST_NEWS_COUNT } from '../src/lib/layout-presets.js';
import {
  isLayoutBlockId,
  isLayoutPlacement,
  LAYOUT_BLOCK_IDS
} from '../src/lib/layout-blocks.js';
import { isReadingFormat } from '../src/lib/reading-formats.js';
import { isValidSocialUrl, normalizeSocialId } from '../src/lib/social-networks.js';
import { isFontPreset } from '../src/lib/site-typography.js';
import { getSignalCloudFaqIssues } from '../src/lib/signal-cloud-faq-validation.js';

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

function validateStaticImageFile(imageFile, source) {
  if (!imageFile.startsWith('/')) {
    failKey('imageFileMustStartWithSlash', { source });
    return;
  }

  const staticImagePath = path.join(ROOT, 'static', imageFile.slice(1));

  if (!existsSync(staticImagePath)) {
    failKey('imageFileMissing', { source, imageFile });
  }
}

function validateItemImages(item, source) {
  const legacyImageFile = typeof item.image_file === 'string' ? item.image_file.trim() : '';

  if (item.images === undefined) {
    const imageFile = requireString(item, 'image_file', source);
    validateStaticImageFile(imageFile, source);
    return;
  }

  if (!Array.isArray(item.images)) {
    fail(`${source}: images must be an array when provided.`);

    if (legacyImageFile) {
      validateStaticImageFile(legacyImageFile, source);
    }

    return;
  }

  if (item.images.length === 0) {
    fail(`${source}: images must contain at least one image when provided.`);

    if (legacyImageFile) {
      validateStaticImageFile(legacyImageFile, source);
    }

    return;
  }

  const imageFiles = [];

  item.images.forEach((entry, index) => {
    const entrySource = `${source}:images[${index}]`;

    if (!entry || typeof entry !== 'object' || Array.isArray(entry)) {
      fail(`${entrySource} must be an object.`);
      return;
    }

    const imageFile = requireString(entry, 'file', entrySource);

    if (imageFile) {
      imageFiles.push(imageFile);
      validateStaticImageFile(imageFile, `${entrySource}.file`);
    }

    if ('alt' in entry && entry.alt !== undefined && typeof entry.alt !== 'string') {
      fail(`${entrySource}.alt must be a string when provided.`);
    }

    if ('role' in entry && entry.role !== undefined && typeof entry.role !== 'string') {
      fail(`${entrySource}.role must be a string when provided.`);
    }
  });

  assertUnique(imageFiles, `image file in ${source}`);

  if (legacyImageFile) {
    validateStaticImageFile(legacyImageFile, source);
  }
}

function validateSite() {
  const source = 'config/site.yaml';
  const data = readYaml(source);
  const site = data.site;

  if (!site || typeof site !== 'object' || Array.isArray(site)) {
    failKey('missingSiteObject', { source });
    return;
  }

  if ('tagline' in site && site.tagline !== undefined && typeof site.tagline !== 'string') {
    failKey('missingField', { source, field: 'tagline' });
  }

  if ('name' in site && site.name !== undefined && typeof site.name !== 'string') {
    failKey('missingField', { source, field: 'name' });
  }

  for (const field of ['intro_title', 'hero_intro']) {
    if (field in site && site[field] !== undefined && typeof site[field] !== 'string') {
      failKey('missingField', { source, field });
    }
  }

  const editorialErrors = validateEditorialFields({
    tagline: typeof site.tagline === 'string' ? site.tagline : '',
    intro_title: typeof site.intro_title === 'string' ? site.intro_title : '',
    hero_intro: typeof site.hero_intro === 'string' ? site.hero_intro : ''
  });
  for (const detail of editorialErrors) {
    failKey('editorialMarkupInvalid', { source, detail });
  }

  if ('appearance' in site && site.appearance !== undefined) {
    validateAppearance(site.appearance, source);
  }

  if ('url' in site && site.url !== undefined && site.url !== '') {
    if (typeof site.url !== 'string' || !isValidSocialUrl(site.url.trim())) {
      failKey('siteUrlInvalid', { source });
    }
  }

  if ('og_image' in site && site.og_image !== undefined) {
    validateOgImage(site.og_image, source);
  }

  if ('favicon' in site && site.favicon !== undefined && site.favicon !== '') {
    if (typeof site.favicon !== 'string' || !site.favicon.startsWith('/images/site/')) {
      failKey('siteFaviconInvalid', { source });
    } else {
      const staticFaviconPath = path.join(ROOT, 'static', site.favicon.slice(1));

      if (!existsSync(staticFaviconPath)) {
        failKey('imageFileMissing', { source, imageFile: site.favicon });
      }
    }
  }

  if (site.hero_banner && typeof site.hero_banner === 'object' && !Array.isArray(site.hero_banner)) {
    const banner = site.hero_banner;
    const bannerSource = `${source}:hero_banner`;

    if (banner.show === true) {
      const imageFile = requireString(banner, 'image_file', bannerSource);

      if (!imageFile.startsWith('/')) {
        failKey('imageFileMustStartWithSlash', { source: bannerSource });
      } else {
        const staticImagePath = path.join(ROOT, 'static', imageFile.slice(1));

        if (!existsSync(staticImagePath)) {
          failKey('imageFileMissing', { source: bannerSource, imageFile });
        }
      }
    } else if (typeof banner.image_file === 'string' && banner.image_file.trim() !== '') {
      const imageFile = banner.image_file.trim();

      if (!imageFile.startsWith('/')) {
        failKey('imageFileMustStartWithSlash', { source: bannerSource });
      } else {
        const staticImagePath = path.join(ROOT, 'static', imageFile.slice(1));

        if (!existsSync(staticImagePath)) {
          failKey('imageFileMissing', { source: bannerSource, imageFile });
        }
      }
    }
  }
}

const APPEARANCE_PRESETS = new Set(['warm', 'neutral', 'dark', 'noir', 'custom']);
const BACKGROUND_FITS = new Set(['top', 'center', 'contain']);
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

  for (const field of [
    'base_color',
    'accent_color',
    'text_color',
    'heading_color',
    'card_color',
    'header_title_color',
    'intro_title_color'
  ]) {
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

  if ('font_preset' in appearance && appearance.font_preset !== undefined) {
    if (typeof appearance.font_preset !== 'string' || !isFontPreset(appearance.font_preset)) {
      failKey('appearanceFontPresetInvalid', { source });
    }
  }

  if ('background_fit' in appearance && appearance.background_fit !== undefined) {
    if (typeof appearance.background_fit !== 'string' || !BACKGROUND_FITS.has(appearance.background_fit)) {
      failKey('appearanceBackgroundFitInvalid', { source });
    }
  }
}

/**
 * @param {unknown} ogImage
 * @param {string} source
 */
function validateOgImage(ogImage, source) {
  if (typeof ogImage !== 'string' || ogImage.trim() === '') {
    failKey('ogImageInvalid', { source });
    return;
  }

  const trimmed = ogImage.trim();

  if (/^https?:\/\//i.test(trimmed)) {
    if (!isValidSocialUrl(trimmed)) {
      failKey('ogImageUrlInvalid', { source });
    }

    return;
  }

  if (!trimmed.startsWith('/images/')) {
    failKey('ogImagePathInvalid', { source });
    return;
  }

  const staticImagePath = path.join(ROOT, 'static', trimmed.slice(1));

  if (!existsSync(staticImagePath)) {
    failKey('imageFileMissing', { source, imageFile: trimmed });
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

  if ('sort' in catalog) {
    const sort = catalog.sort;
    if (sort !== 'manual' && sort !== 'title_asc' && sort !== 'title_desc') {
      failKey('catalogSortInvalid', { source });
    }
  }

  if ('home_limit' in catalog) {
    const homeLimit = catalog.home_limit;
    if (typeof homeLimit !== 'number' || !Number.isInteger(homeLimit) || homeLimit < 1 || homeLimit > MAX_CATALOG_HOME_LIMIT) {
      failKey('catalogHomeLimitInvalid', { source, max: MAX_CATALOG_HOME_LIMIT });
    }
  }

  if ('eyebrow' in catalog && catalog.eyebrow !== undefined && typeof catalog.eyebrow !== 'string') {
    failKey('catalogEyebrowInvalid', { source });
  }

  if ('intro' in catalog && catalog.intro !== undefined && typeof catalog.intro !== 'string') {
    failKey('catalogIntroInvalid', { source });
  }

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

  for (const issue of getSignalCloudFaqIssues(clouds)) {
    failKey(issue.key, {
      source,
      cloudId: issue.cloudId
    });
  }

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

  requireString(about, 'title', source);

  if (about.portrait && typeof about.portrait === 'object' && !Array.isArray(about.portrait)) {
    const portrait = about.portrait;
    const portraitSource = `${source}:portrait`;

    if ('caption' in portrait && portrait.caption !== undefined && typeof portrait.caption !== 'string') {
      failKey('missingField', { source: portraitSource, field: 'caption' });
    }

    if ('image_alt' in portrait && portrait.image_alt !== undefined && typeof portrait.image_alt !== 'string') {
      failKey('missingField', { source: portraitSource, field: 'image_alt' });
    }

    const portraitContentErrors = validateAboutPortraitContent(data.about);
    for (const detail of portraitContentErrors) {
      failKey('editorialMarkupInvalid', { source: portraitSource, detail });
    }

    if (portrait.show === true) {
      const imageFile = requireString(portrait, 'image_file', portraitSource);

      if (!imageFile.startsWith('/')) {
        failKey('imageFileMustStartWithSlash', { source: portraitSource });
      } else {
        const staticImagePath = path.join(ROOT, 'static', imageFile.slice(1));

        if (!existsSync(staticImagePath)) {
          failKey('imageFileMissing', { source: portraitSource, imageFile });
        }
      }
    } else if (typeof portrait.image_file === 'string' && portrait.image_file.trim() !== '') {
      const imageFile = portrait.image_file.trim();

      if (!imageFile.startsWith('/')) {
        failKey('imageFileMustStartWithSlash', { source: portraitSource });
      } else {
        const staticImagePath = path.join(ROOT, 'static', imageFile.slice(1));

        if (!existsSync(staticImagePath)) {
          failKey('imageFileMissing', { source: portraitSource, imageFile });
        }
      }
    }
  }

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

function validateLayout() {
  const source = 'config/layout.yaml';

  if (!existsSync(path.join(ROOT, source))) {
    return;
  }

  const data = readYaml(source);
  const layout = data.layout;

  if (!layout || typeof layout !== 'object' || Array.isArray(layout)) {
    failKey('missingLayoutObject', { source });
    return;
  }

  if ('preset' in layout && layout.preset !== undefined && !isLayoutPreset(layout.preset)) {
    failKey('layoutPresetInvalid', { source });
  }

  const blocks = layout.blocks;

  if (blocks !== undefined) {
    if (!blocks || typeof blocks !== 'object' || Array.isArray(blocks)) {
      failKey('layoutBlocksMustBeObject', { source });
      return;
    }

    for (const [blockId, block] of Object.entries(blocks)) {
      const blockSource = `${source}:blocks.${blockId}`;

      if (!isLayoutBlockId(blockId)) {
        if (blockId === 'banner') {
          continue;
        }

        failKey('layoutBlockIdInvalid', { source: blockSource });
        continue;
      }

      if (!block || typeof block !== 'object' || Array.isArray(block)) {
        failKey('layoutBlockMustBeObject', { source: blockSource });
        continue;
      }

      if ('enabled' in block && block.enabled !== undefined && typeof block.enabled !== 'boolean') {
        failKey('layoutBlockEnabledInvalid', { source: blockSource });
      }

      if (
        'placement' in block &&
        block.placement !== undefined &&
        !isLayoutPlacement(block.placement)
      ) {
        failKey('layoutBlockPlacementInvalid', { source: blockSource });
      }

      if (blockId === 'news' && 'count' in block && block.count !== undefined) {
        const count = block.count;

        if (
          typeof count !== 'number' ||
          !Number.isInteger(count) ||
          count < 1 ||
          count > MAX_LATEST_NEWS_COUNT
        ) {
          failKey('layoutLatestNewsCountInvalid', { source: blockSource, max: MAX_LATEST_NEWS_COUNT });
        }
      }

      if ('label' in block && block.label !== undefined && typeof block.label !== 'string') {
        failKey('layoutBlockLabelInvalid', { source: blockSource });
      }
    }

    return;
  }

  const home = layout.home;

  if (home !== undefined) {
    if (!home || typeof home !== 'object' || Array.isArray(home)) {
      failKey('layoutHomeMustBeObject', { source });
    } else if ('show' in home && home.show !== undefined && !isHomeShowMode(home.show)) {
      failKey('layoutHomeShowInvalid', { source });
    }
  }

  const sidebar = layout.sidebar;

  if (sidebar === undefined) {
    return;
  }

  if (!sidebar || typeof sidebar !== 'object' || Array.isArray(sidebar)) {
    failKey('layoutSidebarMustBeObject', { source });
    return;
  }

  for (const field of ['collections', 'about', 'latest_news']) {
    if (field in sidebar && sidebar[field] !== undefined && typeof sidebar[field] !== 'boolean') {
      failKey('layoutSidebarFlagInvalid', { source, field });
    }
  }

  if ('latest_news_count' in sidebar && sidebar.latest_news_count !== undefined) {
    const count = sidebar.latest_news_count;

    if (
      typeof count !== 'number' ||
      !Number.isInteger(count) ||
      count < 1 ||
      count > MAX_LATEST_NEWS_COUNT
    ) {
      failKey('layoutLatestNewsCountInvalid', { source, max: MAX_LATEST_NEWS_COUNT });
    }
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

    validateItemImages(item, source);
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

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

function validateNews() {
  const newsDir = path.join(ROOT, 'content/news');

  if (!existsSync(newsDir)) {
    return;
  }

  const files = readdirSync(newsDir).filter((file) => file.endsWith('.yaml'));

  if (files.length === 0) {
    return;
  }

  const ids = [];

  for (const file of files) {
    const source = `content/news/${file}`;
    const post = readYaml(source);
    const id = requireString(post, 'id', source);
    const expectedId = file.replace(/\.yaml$/, '');

    ids.push(id);

    if (!isValidId(id)) {
      failKey('newsIdInvalid', { source });
    }

    if (id !== expectedId) {
      failKey('newsIdFilenameMismatch', { source, expectedId });
    }

    requireString(post, 'title', source);

    const date = requireString(post, 'date', source);

    if (!ISO_DATE.test(date)) {
      failKey('newsDateInvalid', { source });
    }

    requireString(post, 'body', source);

    if (
      post.sort_order !== undefined &&
      (typeof post.sort_order !== 'number' || !Number.isInteger(post.sort_order))
    ) {
      failKey('newsSortOrderInvalid', { source });
    }

    if (post.reading_format !== undefined && !isReadingFormat(post.reading_format)) {
      const value =
        typeof post.reading_format === 'string' ? post.reading_format : String(post.reading_format);

      failKey('newsReadingFormatInvalid', { source, value });
    }

    if (typeof post.image_file === 'string' && post.image_file.trim() !== '') {
      const imageFile = post.image_file.trim();

      if (!imageFile.startsWith('/')) {
        failKey('imageFileMustStartWithSlash', { source });
        continue;
      }

      const staticImagePath = path.join(ROOT, 'static', imageFile.slice(1));

      if (!existsSync(staticImagePath)) {
        failKey('imageFileMissing', { source, imageFile });
      }
    }
  }

  assertUnique(ids, 'news id');
}

validateSite();
validateCatalog();
validateAbout();
validateSignalClouds();
validateContact();
validateSocial();
validateFooter();
validateLayout();
validateLegal();
const itemIds = validateItems();
validateCollections(itemIds);
validateNews();

if (process.exitCode) {
  process.exit();
}

console.log(t('validate.ok'));
