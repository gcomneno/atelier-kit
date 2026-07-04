import { existsSync, readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { parse } from 'yaml';

const ROOT = process.cwd();
const STRICT_MODE = process.argv.includes('--strict');
const VERBOSE_MODE = process.argv.includes('--verbose');

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
      title: 'Missing file',
      problem: 'A required content file is missing.',
      action: 'Restore the file or recreate the site content from the Atelier-Kit docs.',
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
        title: 'Unreadable file',
        problem: 'This file could not be read as a normal content file.',
        action: 'Open the file and check that the content structure matches the other config or item files.',
        technical: 'File does not contain a YAML object.'
      });
      return null;
    }

    return data;
  } catch (error) {
    addWarning({
      source: relativePath,
      title: 'Unreadable file',
      problem: 'This file contains a formatting problem.',
      action: 'Open the file and fix the formatting issue shown below, or compare it with a working example file.',
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

const FIELD_LABELS = {
  'site.name': 'Site title',
  'site.tagline': 'Site tagline',
  'site.notice': 'Site notice',
  'site.footer_note': 'Footer note',
  'site.language': 'Site language',
  'contact.email.label': 'Email button label',
  'contact.email.address': 'Contact email',
  'contact.email.subject_prefix': 'Email subject prefix',
  'contact.whatsapp.label': 'WhatsApp button label',
  'contact.whatsapp.phone': 'WhatsApp phone number',
  'item.id': 'Item id',
  'item.title': 'Item title',
  'item.subtitle': 'Item subtitle',
  'item.description': 'Item description',
  'item.image_file': 'Item image path',
  'item.image_alt': 'Image description',
  'item.notice': 'Item notice',
  'item.status': 'Item status'
};

function labelForPath(pathLabel) {
  if (FIELD_LABELS[pathLabel]) {
    return FIELD_LABELS[pathLabel];
  }

  if (pathLabel.startsWith('signal_clouds[')) {
    if (pathLabel.endsWith('.question')) {
      return 'Visitor question';
    }

    if (pathLabel.endsWith('.hint')) {
      return 'Visitor question hint';
    }

    if (pathLabel.includes('.options[') && pathLabel.endsWith('.label')) {
      return 'Answer choice';
    }

    if (pathLabel.endsWith('.id')) {
      return 'Visitor question id';
    }
  }

  return 'Content field';
}

function defaultAction(source, title) {
  return `Open ${source} and update ${title.toLowerCase()} with real content.`;
}

function inspectStarterString(source, pathLabel, value) {
  if (!textLooksStarter(value)) {
    return;
  }

  const title = labelForPath(pathLabel);

  addWarning({
    source,
    title,
    problem: `${title} still looks like starter or placeholder text.`,
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
      title: 'Site title',
      problem: 'The public site title still contains the word "demo".',
      action: 'Open config/site.yaml and set the real name visitors should see.',
      detail: site.name,
      technical: 'Site name still contains "demo".'
    });
  }

  if (typeof site.notice === 'string' && site.notice.trim() !== '') {
    if (textLooksStarter(site.notice)) {
      addWarning({
        source,
        title: 'Site notice banner',
        problem: 'Visitors still see a starter notice at the top of the site.',
        action: 'Open config/site.yaml and replace the notice with real text, or clear it if you do not need a banner.',
        detail: site.notice,
        technical: 'Site notice still looks like starter/demo text.'
      });
    } else {
      addWarning({
        source,
        title: 'Site notice banner',
        problem: 'A notice banner is still visible to visitors.',
        action: 'Open config/site.yaml and confirm the notice text is intentional before publishing.',
        detail: site.notice,
        technical: 'Site notice is enabled. Check that it is intentional before publishing.'
      });
    }
  }
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

  if (email.enabled === true) {
    const address = typeof email.address === 'string' ? email.address.trim().toLowerCase() : '';

    if (address === 'hello@example.com') {
      addWarning({
        source,
        title: 'Contact email',
        problem: 'Visitors would still contact the starter address hello@example.com.',
        action: 'Open config/contact.yaml and set the real email address for Visitor Brief messages.',
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
        title: 'WhatsApp contact',
        problem: 'WhatsApp contact is turned on, but no usable phone number is set.',
        action: 'Open config/contact.yaml and add a phone number, or turn WhatsApp contact off.',
        technical: 'WhatsApp contact action is enabled but phone is empty or invalid.'
      });
    }

    for (const [key, value] of Object.entries(whatsapp)) {
      inspectDeepStrings(source, `contact.whatsapp.${key}`, value);
    }
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

    const cloudLabel = typeof cloud.question === 'string' && cloud.question.trim() !== ''
      ? cloud.question
      : (typeof cloud.id === 'string' ? cloud.id : `Question ${cloudIndex + 1}`);

    inspectDeepStrings(source, `signal_clouds[${cloudIndex}]`, cloud);

    if (Array.isArray(cloud.options) && cloud.options.length < 2) {
      addWarning({
        source,
        title: `Visitor question "${cloudLabel}"`,
        problem: 'This visitor question needs at least two answer choices.',
        action: 'Open config/signal-clouds.yaml and add more answer options for this question.',
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
      : `${parentLabel || 'Detail'} ${index + 1}`;

    if (typeof entry.value === 'string' && textLooksStarter(entry.value)) {
      addWarning({
        source,
        title: `${label} on "${itemTitle}"`,
        problem: `"${label}" still looks like placeholder text.`,
        action: `Open ${source} and replace "${label}" with real information about this item.`,
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
      title: 'Items folder',
      problem: 'The site does not have an items folder yet.',
      action: 'Create at least one item with npm run item:new or add a YAML file under content/items/.',
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
      title: 'Items folder',
      problem: 'The site does not contain any items yet.',
      action: 'Create at least one item with npm run item:new before publishing.',
      technical: 'No item YAML files found.'
    });
    return;
  }

  for (const file of files) {
    const source = `content/items/${file}`;
    const item = readYaml(source);

    if (!item) {
      continue;
    }

    const id = typeof item.id === 'string' ? item.id : file.replace(/\.yaml$/, '');
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
        title: `${fieldTitle} for "${itemTitle}"`,
        problem: `${fieldTitle} still looks like starter or placeholder text.`,
        action: `Open ${source} and update ${fieldTitle.toLowerCase()} with real content.`,
        detail: value,
        technical: `item.${key} still looks like starter/demo text: "${value}"`
      });
    }

    inspectMetaEntries(source, itemTitle, item.meta);

    if (/(^|[-_])(test|smoke|sample)([-_]|$)/i.test(id)) {
      addWarning({
        source,
        title: `Item "${itemTitle}"`,
        problem: 'This item id looks like a test or sample entry.',
        action: 'Create a real item with npm run item:new or rename this item id before publishing.',
        detail: id,
        technical: `Item id "${id}" looks like a test/smoke/sample item.`
      });
    }

    if (imageFile.toLowerCase().includes('placeholder')) {
      addWarning({
        source,
        title: `Image for "${itemTitle}"`,
        problem: 'This item still uses the neutral placeholder image.',
        action: 'Add a real photo to static/images/items/ and update the image path in this item file.',
        detail: imageFile,
        technical: 'Item still uses a starter placeholder image.'
      });
    }

    if (typeof item.status === 'string' && ['demo', 'draft'].includes(item.status.toLowerCase())) {
      addWarning({
        source,
        title: `Publication status for "${itemTitle}"`,
        problem: `This item is still marked as "${item.status}".`,
        action: 'Open this item file and set a public-ready status such as "available", or remove the status if you do not use it.',
        detail: item.status,
        technical: `Item status is "${item.status}". Check before publishing.`
      });
    }

    if (description.length > 0 && description.length < 40) {
      addWarning({
        source,
        title: `Description for "${itemTitle}"`,
        problem: 'The item description is very short and may feel unfinished to visitors.',
        action: 'Open this item file and add a clearer description of the object, artwork or project.',
        detail: description,
        technical: 'Description is quite short. Consider adding more useful context.'
      });
    }

    if (!Array.isArray(item.meta) || item.meta.length === 0) {
      addWarning({
        source,
        title: `Details for "${itemTitle}"`,
        problem: 'This item has no extra detail fields yet.',
        action: 'Add helpful details such as material, dimensions, availability or technique in the item file.',
        technical: 'Item has no meta information.'
      });
    }
  }
}

function printWarnings() {
  console.log(`Atelier-Kit content doctor found ${warnings.length} thing(s) to review before publishing:`);
  console.log('');

  warnings.forEach((warning, index) => {
    if (VERBOSE_MODE) {
      console.log(`- ${warning.source}: ${warning.technical || warning.problem}`);
      return;
    }

    console.log(`${index + 1}. ${warning.title}`);
    console.log(`   File: ${warning.source}`);

    if (warning.detail) {
      console.log(`   Current: "${warning.detail}"`);
    }

    console.log(`   ${warning.problem}`);
    console.log(`   → ${warning.action}`);
    console.log('');
  });

  if (VERBOSE_MODE) {
    console.log('');
  }

  console.log('These notes are reminders, not errors. The site may still run locally.');
  console.log('Check structure with: npm run content:validate');
  console.log('Fail on these notes before launch with: npm run content:doctor -- --strict');
  console.log('Show technical details with: npm run content:doctor -- --verbose');
}

inspectSite();
inspectContact();
inspectSignalClouds();
inspectItems();

if (warnings.length === 0) {
  console.log('Atelier-Kit content doctor found nothing obvious to review before publishing.');
  process.exit(0);
}

printWarnings();

if (STRICT_MODE) {
  process.exitCode = 1;
}
