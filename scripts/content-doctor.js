import { existsSync, readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { parse } from 'yaml';
import { createTranslator } from '../src/lib/i18n/index.js';
import { loadOperatorLocale } from '../src/lib/i18n/load-operator-locale.js';
import { validateEditorialFields } from '../src/lib/editorial-markup.js';
import { validateAboutPortraitContent } from '../src/lib/about-config.js';
import { validateMarkedTextValues } from '../src/lib/marked-text.js';
import { analyzeCatalogItemRelations, normalizeCatalogItemId } from '../src/lib/item-relations.js';

const ROOT = process.cwd();
const STRICT_MODE = process.argv.includes('--strict');
const VERBOSE_MODE = process.argv.includes('--verbose');
const locale = loadOperatorLocale();
const t = createTranslator(locale);

/** @type {{ source: string, title: string, problem: string, action: string, detail?: string, technical?: string }[]} */
const warnings = [];

function addWarning({ source, title, problem, action, detail = '', technical = '' }) {
  warnings.push({
    source,
    title,
    problem,
    action,
    ...(detail ? { detail: truncate(detail) } : {}),
    ...(technical ? { technical } : {})
  });
}

function truncate(value, max = 96) {
  const text = String(value).trim();

  if (text.length <= max) {
    return text;
  }

  return `${text.slice(0, max - 3)}...`;
}

function isRecord(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function readYaml(relativePath) {
  const absolutePath = path.join(ROOT, relativePath);

  if (!existsSync(absolutePath)) {
    addWarning({
      source: relativePath,
      title: t('doctor.missingFile.title'),
      problem: t('doctor.missingFile.problem'),
      action: t('doctor.missingFile.action'),
      technical: 'File does not exist.'
    });
    return null;
  }

  try {
    const raw = readFileSync(absolutePath, 'utf8');
    const data = parse(raw);

    if (!isRecord(data)) {
      addWarning({
        source: relativePath,
        title: t('doctor.unreadableFile.title'),
        problem: t('doctor.unreadableFile.problemStructure'),
        action: t('doctor.unreadableFile.actionStructure'),
        technical: 'File does not contain a YAML object.'
      });
      return null;
    }

    return data;
  } catch (error) {
    addWarning({
      source: relativePath,
      title: t('doctor.unreadableFile.title'),
      problem: t('doctor.unreadableFile.problemFormat'),
      action: t('doctor.unreadableFile.actionFormat'),
      detail: error.message,
      technical: `Could not read or parse YAML: ${error.message}`
    });
    return null;
  }
}

function textLooksStarter(value) {
  if (typeof value !== 'string') {
    return false;
  }

  const text = value.toLowerCase();

  return [
    'replace with',
    'demo content',
    'demo item',
    'draft item',
    'lorem ipsum',
    'todo',
    'placeholder',
    'example creation',
    'my first item',
    'starter scaffold',
    'scaffold placeholder',
    'writing scaffold',
    'artwork scaffold',
    'handmade scaffold',
    'jewelry scaffold',
    'furniture scaffold',
    'neutral placeholder image'
  ].some((needle) => text.includes(needle));
}

const FIELD_LABEL_KEYS = {
  'site.name': 'doctor.fields.siteName',
  'site.tagline': 'doctor.fields.siteTagline',
  'site.notice': 'doctor.fields.siteNotice',
  'site.footer_note': 'doctor.fields.siteFooter',
  'site.language': 'doctor.fields.siteLanguage',
  'contact.email.label': 'doctor.fields.emailLabel',
  'contact.email.address': 'doctor.fields.emailAddress',
  'contact.email.subject_prefix': 'doctor.fields.emailSubject',
  'contact.whatsapp.label': 'doctor.fields.whatsappLabel',
  'contact.whatsapp.phone': 'doctor.fields.whatsappPhone',
  'item.id': 'doctor.fields.itemId',
  'item.title': 'doctor.fields.itemTitle',
  'item.subtitle': 'doctor.fields.itemSubtitle',
  'item.description': 'doctor.fields.itemDescription',
  'item.image_file': 'doctor.fields.itemImageAlt',
  'item.image_alt': 'doctor.fields.itemImageAlt',
  'item.notice': 'doctor.fields.itemNotice',
  'item.status': 'doctor.fields.itemStatus',
  'news.id': 'doctor.fields.newsId',
  'news.title': 'doctor.fields.newsTitle',
  'news.excerpt': 'doctor.fields.newsExcerpt',
  'news.body': 'doctor.fields.newsBody',
  'news.image_file': 'doctor.fields.newsImageAlt',
  'news.image_alt': 'doctor.fields.newsImageAlt'
};

function labelForPath(pathLabel) {
  if (FIELD_LABEL_KEYS[pathLabel]) {
    return t(FIELD_LABEL_KEYS[pathLabel]);
  }

  if (pathLabel.startsWith('signal_clouds[')) {
    if (pathLabel.endsWith('.question')) {
      return t('doctor.fields.signalQuestion');
    }

    if (pathLabel.endsWith('.hint')) {
      return t('doctor.fields.signalHint');
    }

    if (pathLabel.includes('.options[') && pathLabel.endsWith('.label')) {
      return t('doctor.fields.signalAnswer');
    }

    if (pathLabel.endsWith('.id')) {
      return t('doctor.fields.signalQuestionId');
    }
  }

  return t('doctor.fields.contentField');
}

function defaultAction(source, title) {
  return t('doctor.warnings.starterText.action', { source, field: title.toLowerCase() });
}

function inspectStarterString(source, pathLabel, value) {
  if (!textLooksStarter(value)) {
    return;
  }

  const title = labelForPath(pathLabel);

  addWarning({
    source,
    title,
    problem: t('doctor.warnings.starterText.problem', { title }),
    action: defaultAction(source, title),
    detail: value,
    technical: `${pathLabel} still looks like starter/demo text: "${value}"`
  });
}

function inspectDeepStrings(source, pathLabel, value) {
  if (typeof value === 'string') {
    inspectStarterString(source, pathLabel, value);
    return;
  }

  if (Array.isArray(value)) {
    value.forEach((entry, index) => {
      inspectDeepStrings(source, `${pathLabel}[${index}]`, entry);
    });
    return;
  }

  if (isRecord(value)) {
    for (const [key, child] of Object.entries(value)) {
      inspectDeepStrings(source, `${pathLabel}.${key}`, child);
    }
  }
}

function inspectSite() {
  const source = 'config/site.yaml';
  const data = readYaml(source);

  if (!data || !isRecord(data.site)) {
    return;
  }

  const site = data.site;

  for (const [key, value] of Object.entries(site)) {
    if (key === 'notice') {
      continue;
    }

    inspectDeepStrings(source, `site.${key}`, value);
  }

  if (typeof site.name === 'string' && site.name.toLowerCase().includes('demo')) {
    addWarning({
      source,
      title: t('doctor.warnings.siteDemoTitle.title'),
      problem: t('doctor.warnings.siteDemoTitle.problem'),
      action: t('doctor.warnings.siteDemoTitle.action'),
      detail: site.name,
      technical: 'Site name still contains "demo".'
    });
  }

  const banner = isRecord(site.hero_banner) ? site.hero_banner : {};
  const editorialErrors = validateMarkedTextValues([
    { path: 'site.tagline', value: site.tagline },
    { path: 'site.header_title', value: site.header_title },
    { path: 'site.intro_title', value: site.intro_title },
    { path: 'site.hero_intro', value: site.hero_intro, mode: 'multiline' },
    { path: 'site.hero_signature', value: site.hero_signature, mode: 'multiline' },
    { path: 'site.footer_note', value: site.footer_note },
    { path: 'site.hero_banner.description', value: banner.description, mode: 'multiline' },
    { path: 'site.hero_banner.caption', value: banner.caption }
  ]);

  for (const error of editorialErrors) {
    addWarning({
      source,
      title: t('doctor.warnings.editorialMarkup.title'),
      problem: t('doctor.warnings.editorialMarkup.problem', { detail: error }),
      action: t('doctor.warnings.editorialMarkup.action'),
      detail: error,
      technical: error
    });
  }
}

function reportMarkedErrors(source, values) {
  for (const error of validateMarkedTextValues(values)) {
    addWarning({
      source,
      title: t('doctor.warnings.editorialMarkup.title'),
      problem: t('doctor.warnings.editorialMarkup.problem', { detail: error }),
      action: t('doctor.warnings.editorialMarkup.action'),
      detail: error,
      technical: error
    });
  }
}

function inspectMarkedConfig() {
  const catalog = readYaml('config/catalog.yaml')?.catalog;
  if (isRecord(catalog)) reportMarkedErrors('config/catalog.yaml', [
    { path: 'catalog.eyebrow', value: catalog.eyebrow },
    { path: 'catalog.intro', value: catalog.intro, mode: 'multiline' }
  ]);

  const about = readYaml('config/about.yaml')?.about;
  if (isRecord(about)) reportMarkedErrors('config/about.yaml', [
    { path: 'about.title', value: about.title },
    { path: 'about.intro', value: about.intro, mode: 'multiline' },
    ...(Array.isArray(about.sections) ? about.sections.flatMap((section, index) => [
      { path: `about.sections.${index}.heading`, value: section?.heading },
      { path: `about.sections.${index}.body`, value: section?.body, mode: 'multiline' }
    ]) : [])
  ]);

  const footer = readYaml('config/footer.yaml')?.footer;
  if (isRecord(footer)) reportMarkedErrors('config/footer.yaml', [
    { path: 'footer.copyright', value: footer.copyright },
    { path: 'footer.legal_line', value: footer.legal_line },
    ...(Array.isArray(footer.columns) ? footer.columns.flatMap((column, index) => [
      { path: `footer.columns.${index}.title`, value: column?.title },
      ...(Array.isArray(column?.links) ? column.links.map((link, linkIndex) => ({ path: `footer.columns.${index}.links.${linkIndex}.label`, value: link?.label })) : [])
    ]) : [])
  ]);

  const layout = readYaml('config/layout.yaml')?.layout;
  if (isRecord(layout?.blocks)) reportMarkedErrors('config/layout.yaml', Object.entries(layout.blocks).map(([id, block]) => ({ path: `layout.blocks.${id}.label`, value: block?.label })));
}

function inspectContact() {
  const source = 'config/contact.yaml';

  if (!existsSync(path.join(ROOT, source))) {
    return;
  }

  const data = readYaml(source);

  if (!data || !isRecord(data.contact)) {
    return;
  }

  const contact = data.contact;
  const email = isRecord(contact.email) ? contact.email : {};
  const whatsapp = isRecord(contact.whatsapp) ? contact.whatsapp : {};
  reportMarkedErrors(source, [
    { path: 'contact.email.label', value: email.label },
    { path: 'contact.whatsapp.label', value: whatsapp.label }
  ]);

  if (email.enabled === true) {
    const address = typeof email.address === 'string' ? email.address.trim().toLowerCase() : '';

    if (address === 'hello@example.com') {
      addWarning({
        source,
        title: t('doctor.warnings.contactEmailPlaceholder.title'),
        problem: t('doctor.warnings.contactEmailPlaceholder.problem'),
        action: t('doctor.warnings.contactEmailPlaceholder.action'),
        detail: email.address,
        technical: 'Email contact address is still hello@example.com.'
      });
    } else {
      for (const [key, value] of Object.entries(email)) {
        inspectDeepStrings(source, `contact.email.${key}`, value);
      }
    }
  }

  if (whatsapp.enabled === true) {
    const phone = typeof whatsapp.phone === 'string' ? whatsapp.phone.replace(/[^0-9]/g, '') : '';

    if (!phone) {
      addWarning({
        source,
        title: t('doctor.warnings.whatsappMissingPhone.title'),
        problem: t('doctor.warnings.whatsappMissingPhone.problem'),
        action: t('doctor.warnings.whatsappMissingPhone.action'),
        technical: 'WhatsApp contact action is enabled but phone is empty or invalid.'
      });
    }

    for (const [key, value] of Object.entries(whatsapp)) {
      inspectDeepStrings(source, `contact.whatsapp.${key}`, value);
    }
  }
}

function inspectAbout() {
  const source = 'config/about.yaml';
  if (!existsSync(path.join(ROOT, source))) return;

  const data = readYaml(source);
  if (!data || !isRecord(data.about) || !isRecord(data.about.portrait)) return;

  const errors = validateAboutPortraitContent(data.about);

  for (const error of errors) {
    addWarning({
      source,
      title: t('doctor.warnings.editorialMarkup.title'),
      problem: t('doctor.warnings.editorialMarkup.problem', { detail: error }),
      action: t('doctor.warnings.editorialMarkup.action'),
      detail: error,
      technical: error
    });
  }
}

function inspectSignalClouds() {
  const source = 'config/signal-clouds.yaml';
  const data = readYaml(source);

  if (!data || !Array.isArray(data.signal_clouds)) {
    return;
  }

  data.signal_clouds.forEach((cloud, cloudIndex) => {
    if (!isRecord(cloud)) {
      return;
    }

    if (cloud.enabled === false) {
      return;
    }

    const cloudLabel = typeof cloud.question === 'string' && cloud.question.trim() !== ''
      ? cloud.question
      : (typeof cloud.id === 'string'
        ? cloud.id
        : t('doctor.warnings.defaultQuestionLabel', { index: cloudIndex + 1 }));

    inspectDeepStrings(source, `signal_clouds[${cloudIndex}]`, cloud);
    reportMarkedErrors(source, [
      { path: `signal_clouds.${cloudIndex}.question`, value: cloud.question },
      { path: `signal_clouds.${cloudIndex}.hint`, value: cloud.hint },
      ...(Array.isArray(cloud.options) ? cloud.options.map((option, optionIndex) => ({ path: `signal_clouds.${cloudIndex}.options.${optionIndex}.label`, value: option?.label })) : []),
      { path: `signal_clouds.${cloudIndex}.faq.answer`, value: cloud.faq?.answer, mode: 'multiline' },
      { path: `signal_clouds.${cloudIndex}.faq.group`, value: cloud.faq?.group }
    ]);

    if (Array.isArray(cloud.options) && cloud.options.length < 2) {
      addWarning({
        source,
        title: t('doctor.warnings.signalCloudOptions.title', { label: cloudLabel }),
        problem: t('doctor.warnings.signalCloudOptions.problem'),
        action: t('doctor.warnings.signalCloudOptions.action'),
        technical: `Signal cloud "${cloud.id ?? cloudIndex}" has fewer than two options.`
      });
    }
  });
}

function inspectMetaEntries(source, itemTitle, entries, parentLabel = '') {
  if (!Array.isArray(entries)) {
    return;
  }

  entries.forEach((entry, index) => {
    if (!isRecord(entry)) {
      return;
    }

    const label = typeof entry.label === 'string' && entry.label.trim() !== ''
      ? entry.label
      : t('doctor.warnings.metaFallbackLabel', { index: index + 1 });

    if (typeof entry.value === 'string' && textLooksStarter(entry.value)) {
      addWarning({
        source,
        title: t('doctor.warnings.metaPlaceholder.title', { label, itemTitle }),
        problem: t('doctor.warnings.metaPlaceholder.problem', { label }),
        action: t('doctor.warnings.metaPlaceholder.action', { source, label }),
        detail: entry.value,
        technical: `item.meta label "${label}" still looks like starter/demo text: "${entry.value}"`
      });
    }

    if (Array.isArray(entry.children)) {
      inspectMetaEntries(source, itemTitle, entry.children, label);
    }
  });
}

function inspectItems() {
  const itemsDir = path.join(ROOT, 'content/items');

  if (!existsSync(itemsDir)) {
    addWarning({
      source: 'content/items',
      title: t('doctor.warnings.itemsFolderMissing.title'),
      problem: t('doctor.warnings.itemsFolderMissing.problem'),
      action: t('doctor.warnings.itemsFolderMissing.action'),
      technical: 'Items directory does not exist.'
    });
    return;
  }

  const files = readdirSync(itemsDir)
    .filter((file) => file.endsWith('.yaml'))
    .sort();

  if (files.length === 0) {
    addWarning({
      source: 'content/items',
      title: t('doctor.warnings.itemsFolderEmpty.title'),
      problem: t('doctor.warnings.itemsFolderEmpty.problem'),
      action: t('doctor.warnings.itemsFolderEmpty.action'),
      technical: 'No item YAML files found.'
    });
    return;
  }

  const relationRecords = [];

  for (const file of files) {
    const source = `content/items/${file}`;
    const item = readYaml(source);

    if (!item) {
      continue;
    }

    const id = normalizeCatalogItemId(item.id);
    relationRecords.push({ id, source, relations: item.relations });
    const itemTitle = typeof item.title === 'string' && item.title.trim() !== '' ? item.title.trim() : id;
    const imageFile = typeof item.image_file === 'string' ? item.image_file : '';
    const description = typeof item.description === 'string' ? item.description.trim() : '';

    for (const [key, value] of Object.entries(item)) {
      if (key === 'meta' || key === 'image_file') {
        continue;
      }

      if (typeof value !== 'string' || !textLooksStarter(value)) {
        continue;
      }

      const fieldTitle = labelForPath(`item.${key}`);

      addWarning({
        source,
        title: t('doctor.warnings.itemFieldStarter.title', { fieldTitle, itemTitle }),
        problem: t('doctor.warnings.itemFieldStarter.problem', { fieldTitle }),
        action: t('doctor.warnings.itemFieldStarter.action', { source, fieldTitle: fieldTitle.toLowerCase() }),
        detail: value,
        technical: `item.${key} still looks like starter/demo text: "${value}"`
      });
    }

    inspectMetaEntries(source, itemTitle, item.meta);
    reportMarkedErrors(source, [
      { path: `items.${id}.title`, value: item.title },
      { path: `items.${id}.subtitle`, value: item.subtitle },
      { path: `items.${id}.description`, value: item.description, mode: 'multiline' },
      { path: `items.${id}.notice`, value: item.notice, mode: 'multiline' }
    ]);

    if (/(^|[-_])(test|smoke|sample)([-_]|$)/i.test(id)) {
      addWarning({
        source,
        title: t('doctor.warnings.itemTestId.title', { itemTitle }),
        problem: t('doctor.warnings.itemTestId.problem'),
        action: t('doctor.warnings.itemTestId.action'),
        detail: id,
        technical: `Item id "${id}" looks like a test/smoke/sample item.`
      });
    }

    if (imageFile.toLowerCase().includes('placeholder')) {
      addWarning({
        source,
        title: t('doctor.warnings.itemPlaceholderImage.title', { itemTitle }),
        problem: t('doctor.warnings.itemPlaceholderImage.problem'),
        action: t('doctor.warnings.itemPlaceholderImage.action'),
        detail: imageFile,
        technical: 'Item still uses a starter placeholder image.'
      });
    }

    if (typeof item.status === 'string' && ['demo', 'draft'].includes(item.status.toLowerCase())) {
      addWarning({
        source,
        title: t('doctor.warnings.itemDraftStatus.title', { itemTitle }),
        problem: t('doctor.warnings.itemDraftStatus.problem', { status: item.status }),
        action: t('doctor.warnings.itemDraftStatus.action'),
        detail: item.status,
        technical: `Item status is "${item.status}". Check before publishing.`
      });
    }

    if (description.length > 0 && description.length < 40) {
      addWarning({
        source,
        title: t('doctor.warnings.itemShortDescription.title', { itemTitle }),
        problem: t('doctor.warnings.itemShortDescription.problem'),
        action: t('doctor.warnings.itemShortDescription.action'),
        detail: description,
        technical: 'Description is quite short. Consider adding more useful context.'
      });
    }

    if (!Array.isArray(item.meta) || item.meta.length === 0) {
      addWarning({
        source,
        title: t('doctor.warnings.itemNoMeta.title', { itemTitle }),
        problem: t('doctor.warnings.itemNoMeta.problem'),
        action: t('doctor.warnings.itemNoMeta.action'),
        technical: 'Item has no meta information.'
      });
    }
  }

  for (const diagnostic of analyzeCatalogItemRelations(relationRecords)) {
    const key = ['missing-target', 'self-reference', 'duplicate'].includes(diagnostic.code)
      ? diagnostic.code
      : 'structure';
    addWarning({
      source: `${diagnostic.source}${Number.isInteger(diagnostic.index) ? `:relations[${diagnostic.index}]` : ''}`,
      title: t(`doctor.warnings.itemRelation.${key}.title`),
      problem: t(`doctor.warnings.itemRelation.${key}.problem`, {
        item: diagnostic.itemId || '?',
        type: diagnostic.type || '?',
        target: diagnostic.target || '?',
        firstIndex: diagnostic.firstIndex ?? '?'
      }),
      action: t('doctor.warnings.itemRelation.action', { source: diagnostic.source }),
      technical: diagnostic.message
    });
  }
}

function inspectCollections() {
  const dir = path.join(ROOT, 'content/collections');
  if (!existsSync(dir)) return;
  for (const file of readdirSync(dir).filter((entry) => entry.endsWith('.yaml')).sort()) {
    const source = `content/collections/${file}`;
    const collection = readYaml(source);
    if (!collection) continue;
    const id = typeof collection.id === 'string' ? collection.id : file.replace(/\.yaml$/, '');
    reportMarkedErrors(source, [
      { path: `collections.${id}.title`, value: collection.title },
      { path: `collections.${id}.description`, value: collection.description, mode: 'multiline' }
    ]);
  }
}

function inspectNews() {
  const newsDir = path.join(ROOT, 'content/news');

  if (!existsSync(newsDir)) {
    return;
  }

  const files = readdirSync(newsDir)
    .filter((file) => file.endsWith('.yaml'))
    .sort();

  if (files.length === 0) {
    return;
  }

  for (const file of files) {
    const source = `content/news/${file}`;
    const post = readYaml(source);

    if (!post) {
      continue;
    }

    const id = typeof post.id === 'string' ? post.id : file.replace(/\.yaml$/, '');
    const postTitle = typeof post.title === 'string' && post.title.trim() !== '' ? post.title.trim() : id;
    const imageFile = typeof post.image_file === 'string' ? post.image_file : '';
    const body = typeof post.body === 'string' ? post.body.trim() : '';

    for (const [key, value] of Object.entries(post)) {
      if (key === 'image_file' || key === 'date') {
        continue;
      }

      if (typeof value !== 'string' || !textLooksStarter(value)) {
        continue;
      }

      const fieldTitle = labelForPath(`news.${key}`);

      addWarning({
        source,
        title: t('doctor.warnings.newsFieldStarter.title', { fieldTitle, postTitle }),
        problem: t('doctor.warnings.newsFieldStarter.problem', { fieldTitle }),
        action: t('doctor.warnings.newsFieldStarter.action', {
          source,
          fieldTitle: fieldTitle.toLowerCase()
        }),
        detail: value,
        technical: `news.${key} still looks like starter/demo text: "${value}"`
      });
    }

    if (/(^|[-_])(test|smoke|sample)([-_]|$)/i.test(id)) {
      addWarning({
        source,
        title: t('doctor.warnings.newsTestId.title', { postTitle }),
        problem: t('doctor.warnings.newsTestId.problem'),
        action: t('doctor.warnings.newsTestId.action'),
        detail: id,
        technical: `News id "${id}" looks like a test/smoke/sample post.`
      });
    }

    if (imageFile.toLowerCase().includes('placeholder')) {
      addWarning({
        source,
        title: t('doctor.warnings.newsPlaceholderImage.title', { postTitle }),
        problem: t('doctor.warnings.newsPlaceholderImage.problem'),
        action: t('doctor.warnings.newsPlaceholderImage.action'),
        detail: imageFile,
        technical: 'News post still uses a starter placeholder image.'
      });
    }

    if (body.length > 0 && body.length < 40) {
      addWarning({
        source,
        title: t('doctor.warnings.newsShortBody.title', { postTitle }),
        problem: t('doctor.warnings.newsShortBody.problem'),
        action: t('doctor.warnings.newsShortBody.action'),
        detail: body,
        technical: 'News body is quite short. Consider adding more useful context.'
      });
    }
    reportMarkedErrors(source, [
      { path: `news.${id}.title`, value: post.title },
      { path: `news.${id}.excerpt`, value: post.excerpt, mode: 'multiline' },
      { path: `news.${id}.body`, value: post.body, mode: 'multiline' }
    ]);
  }
}

function printWarnings() {
  console.log(t('doctor.foundCount', { count: warnings.length }));
  console.log('');

  warnings.forEach((warning, index) => {
    if (VERBOSE_MODE) {
      console.log(`- ${warning.source}: ${warning.technical || warning.problem}`);
      return;
    }

    console.log(`${index + 1}. ${warning.title}`);
    console.log(t('doctor.fileLabel', { source: warning.source }));

    if (warning.detail) {
      console.log(t('doctor.currentLabel', { detail: warning.detail }));
    }

    console.log(`   ${warning.problem}`);
    console.log(`   → ${warning.action}`);
    console.log('');
  });

  if (VERBOSE_MODE) {
    console.log('');
  }

  console.log(t('doctor.footerReminders'));
  console.log(t('doctor.footerValidate'));
  console.log(t('doctor.footerStrict'));
  console.log(t('doctor.footerVerbose'));
}

inspectSite();
inspectAbout();
inspectMarkedConfig();
inspectContact();
inspectSignalClouds();
inspectItems();
inspectCollections();
inspectNews();

if (warnings.length === 0) {
  console.log(t('doctor.foundNothing'));
  process.exit(0);
}

printWarnings();

if (STRICT_MODE) {
  process.exitCode = 1;
}
