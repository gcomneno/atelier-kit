import { existsSync, readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { parse } from 'yaml';

const ROOT = process.cwd();
const STRICT_MODE = process.argv.includes('--strict');

/** @type {{ source: string, message: string }[]} */
const warnings = [];

function warn(source, message) {
  warnings.push({ source, message });
}

function isRecord(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function readYaml(relativePath) {
  const absolutePath = path.join(ROOT, relativePath);

  if (!existsSync(absolutePath)) {
    warn(relativePath, 'File does not exist.');
    return null;
  }

  try {
    const raw = readFileSync(absolutePath, 'utf8');
    const data = parse(raw);

    if (!isRecord(data)) {
      warn(relativePath, 'File does not contain a YAML object.');
      return null;
    }

    return data;
  } catch (error) {
    warn(relativePath, `Could not read or parse YAML: ${error.message}`);
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
    'my first item'
  ].some((needle) => text.includes(needle));
}

function inspectString(source, field, value) {
  if (textLooksStarter(value)) {
    warn(source, `${field} still looks like starter/demo text: "${value}"`);
  }
}

function inspectDeepStrings(source, pathLabel, value) {
  if (typeof value === 'string') {
    inspectString(source, pathLabel, value);
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

  inspectDeepStrings(source, 'site', site);

  if (typeof site.name === 'string' && site.name.toLowerCase().includes('demo')) {
    warn(source, 'Site name still contains "demo".');
  }

  if (typeof site.notice === 'string' && site.notice.trim() !== '') {
    warn(source, 'Site notice is enabled. Check that it is intentional before publishing.');
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
      warn(source, 'Email contact address is still hello@example.com.');
    }

    inspectDeepStrings(source, 'contact.email', email);
  }

  if (whatsapp.enabled === true) {
    const phone = typeof whatsapp.phone === 'string' ? whatsapp.phone.replace(/[^0-9]/g, '') : '';

    if (!phone) {
      warn(source, 'WhatsApp contact action is enabled but phone is empty or invalid.');
    }

    inspectDeepStrings(source, 'contact.whatsapp', whatsapp);
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

    inspectDeepStrings(source, `signal_clouds[${cloudIndex}]`, cloud);

    if (Array.isArray(cloud.options) && cloud.options.length < 2) {
      warn(source, `Signal cloud "${cloud.id ?? cloudIndex}" has fewer than two options.`);
    }
  });
}

function inspectItems() {
  const itemsDir = path.join(ROOT, 'content/items');

  if (!existsSync(itemsDir)) {
    warn('content/items', 'Items directory does not exist.');
    return;
  }

  const files = readdirSync(itemsDir)
    .filter((file) => file.endsWith('.yaml'))
    .sort();

  if (files.length === 0) {
    warn('content/items', 'No item YAML files found.');
    return;
  }

  for (const file of files) {
    const source = `content/items/${file}`;
    const item = readYaml(source);

    if (!item) {
      continue;
    }

    const id = typeof item.id === 'string' ? item.id : file.replace(/\.yaml$/, '');
    const imageFile = typeof item.image_file === 'string' ? item.image_file : '';
    const description = typeof item.description === 'string' ? item.description.trim() : '';

    inspectDeepStrings(source, 'item', item);

    if (/(^|[-_])(test|smoke|sample)([-_]|$)/i.test(id)) {
      warn(source, `Item id "${id}" looks like a test/smoke/sample item.`);
    }

    if (imageFile.toLowerCase().includes('placeholder')) {
      warn(source, 'Item still uses a starter placeholder image.');
    }

    if (typeof item.status === 'string' && ['demo', 'draft'].includes(item.status.toLowerCase())) {
      warn(source, `Item status is "${item.status}". Check before publishing.`);
    }

    if (description.length > 0 && description.length < 40) {
      warn(source, 'Description is quite short. Consider adding more useful context.');
    }

    if (!Array.isArray(item.meta) || item.meta.length === 0) {
      warn(source, 'Item has no meta information.');
    }
  }
}

inspectSite();
inspectContact();
inspectSignalClouds();
inspectItems();

if (warnings.length === 0) {
  console.log('Atelier-Kit content doctor found no publishing warnings.');
  process.exit(0);
}

console.log(`Atelier-Kit content doctor found ${warnings.length} publishing warning(s):`);
console.log('');

for (const warning of warnings) {
  console.log(`- ${warning.source}: ${warning.message}`);
}

console.log('');
console.log('Warnings are non-fatal. Run npm run content:validate for structural validation.');

if (STRICT_MODE) {
  process.exitCode = 1;
}
