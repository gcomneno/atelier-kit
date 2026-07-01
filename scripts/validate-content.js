import { existsSync, readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { parse } from 'yaml';

const ROOT = process.cwd();

function fail(message) {
  console.error(`ERROR: ${message}`);
  process.exitCode = 1;
}

function readYaml(relativePath) {
  const absolutePath = path.join(ROOT, relativePath);

  try {
    const raw = readFileSync(absolutePath, 'utf8');
    const data = parse(raw);

    if (!data || typeof data !== 'object' || Array.isArray(data)) {
      fail(`${relativePath} must contain a YAML object.`);
      return {};
    }

    return data;
  } catch (error) {
    fail(`Cannot read ${relativePath}: ${error.message}`);
    return {};
  }
}

function requireString(record, field, source) {
  const value = record[field];

  if (typeof value !== 'string' || value.trim() === '') {
    fail(`${source}: missing or invalid "${field}".`);
    return '';
  }

  return value;
}

function assertUnique(values, label) {
  const seen = new Set();

  for (const value of values) {
    if (seen.has(value)) {
      fail(`Duplicate ${label}: ${value}`);
    }

    seen.add(value);
  }
}

function validateMetaEntries(entries, source, pathLabel = 'meta') {
  if (entries === undefined) {
    return;
  }

  if (!Array.isArray(entries)) {
    fail(`${source}: "${pathLabel}" must be an array when provided.`);
    return;
  }

  entries.forEach((entry, index) => {
    const entryPath = `${pathLabel}[${index}]`;

    if (!entry || typeof entry !== 'object' || Array.isArray(entry)) {
      fail(`${source}: "${entryPath}" must be an object.`);
      return;
    }

    requireString(entry, 'label', `${source}:${entryPath}`);

    const hasValue = typeof entry.value === 'string' && entry.value.trim() !== '';
    const hasChildren = Array.isArray(entry.children) && entry.children.length > 0;

    if (!hasValue && !hasChildren) {
      fail(`${source}:${entryPath}: meta entry must have either a non-empty "value" or non-empty "children".`);
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
    fail(`${source}: missing "site" object.`);
    return;
  }

  requireString(site, 'name', source);
  requireString(site, 'tagline', source);
}

function validateCatalog() {
  const source = 'config/catalog.yaml';
  const data = readYaml(source);
  const catalog = data.catalog;

  if (!catalog || typeof catalog !== 'object' || Array.isArray(catalog)) {
    fail(`${source}: missing "catalog" object.`);
    return;
  }

  requireString(catalog, 'item_name_singular', source);
  requireString(catalog, 'item_name_plural', source);

  if ('route_segment' in catalog) {
    fail(`${source}: route_segment is intentionally not supported in Atelier-Kit 1.0. Items live under /items.`);
  }
}

function validateSignalClouds() {
  const source = 'config/signal-clouds.yaml';
  const data = readYaml(source);
  const clouds = data.signal_clouds;

  if (!Array.isArray(clouds)) {
    fail(`${source}: missing "signal_clouds" array.`);
    return;
  }

  assertUnique(
    clouds.map((cloud) => cloud?.id).filter(Boolean),
    'signal cloud id'
  );

  for (const cloud of clouds) {
    if (!cloud || typeof cloud !== 'object' || Array.isArray(cloud)) {
      fail(`${source}: every cloud must be an object.`);
      continue;
    }

    const cloudId = requireString(cloud, 'id', source);
    requireString(cloud, 'question', `${source}:${cloudId}`);

    if (!Array.isArray(cloud.options) || cloud.options.length === 0) {
      fail(`${source}:${cloudId}: options must be a non-empty array.`);
      continue;
    }

    assertUnique(
      cloud.options.map((option) => option?.id).filter(Boolean),
      `option id in cloud ${cloudId}`
    );

    for (const option of cloud.options) {
      if (!option || typeof option !== 'object' || Array.isArray(option)) {
        fail(`${source}:${cloudId}: every option must be an object.`);
        continue;
      }

      const optionId = requireString(option, 'id', `${source}:${cloudId}`);
      requireString(option, 'label', `${source}:${cloudId}:${optionId}`);
    }
  }
}

function validateItems() {
  const itemsDir = path.join(ROOT, 'content/items');

  if (!existsSync(itemsDir)) {
    fail('content/items directory does not exist.');
    return;
  }

  const files = readdirSync(itemsDir).filter((file) => file.endsWith('.yaml'));

  if (files.length === 0) {
    fail('content/items must contain at least one .yaml item.');
    return;
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
      fail(`${source}: image_file must start with "/".`);
      continue;
    }

    const staticImagePath = path.join(ROOT, 'static', imageFile.slice(1));

    if (!existsSync(staticImagePath)) {
      fail(`${source}: image_file does not exist in static/: ${imageFile}`);
    }
  }

  assertUnique(ids, 'item id');
}

validateSite();
validateCatalog();
validateSignalClouds();
validateItems();

if (process.exitCode) {
  process.exit();
}

console.log('Atelier-Kit content validation OK.');
