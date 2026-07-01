#!/usr/bin/env node
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { parse } from 'yaml';

const ROOT = process.cwd();
const ITEMS_DIR = path.join(ROOT, 'content/items');
const PLACEHOLDER_IMAGE = '/images/items/placeholder.svg';

function usage() {
  console.log(`Atelier-Kit item helper

Usage:
  node scripts/item.js new <id> [title]
  node scripts/item.js list
  node scripts/item.js validate

Examples:
  npm run item:new -- ceramic-blue-bowl "Ceramic Blue Bowl"
  npm run item:list
  npm run item:validate
`);
}

function fail(message) {
  console.error(`ERROR: ${message}`);
  process.exit(1);
}

function validateId(id) {
  if (!id || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(id)) {
    fail('Item id must use lowercase letters, numbers and single hyphens only, for example: ceramic-blue-bowl');
  }
}

function titleFromId(id) {
  return id
    .split('-')
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

function yamlString(value) {
  return JSON.stringify(String(value));
}

function createItem(args) {
  const [id, ...titleParts] = args;

  validateId(id);

  const title = titleParts.join(' ').trim() || titleFromId(id);
  const itemPath = path.join(ITEMS_DIR, `${id}.yaml`);

  if (existsSync(itemPath)) {
    fail(`Item already exists: content/items/${id}.yaml`);
  }

  mkdirSync(ITEMS_DIR, { recursive: true });

  const content = [
    `id: ${yamlString(id)}`,
    `title: ${yamlString(title)}`,
    'subtitle: ""',
    'status: "draft"',
    'price_mode: "hidden"',
    `image_file: ${yamlString(PLACEHOLDER_IMAGE)}`,
    'image_alt: ""',
    'description: "Replace with a real description."',
    'notice: "Draft item. Replace before publishing."',
    '',
    'meta:',
    '  - label: "Material"',
    '    value: "Replace with material"',
    '',
    '  - label: "Dimensions"',
    '    value: "Replace with dimensions"',
    '',
    '  - label: "Availability"',
    '    value: "Replace with availability"',
    '',
    '  - label: "Object details"',
    '    children:',
    '      - label: "Finish"',
    '        value: "Replace with finish"',
    '',
    '      - label: "Care"',
    '        value: "Replace with care instructions"',
    ''
  ].join('\n');

  writeFileSync(itemPath, content, 'utf8');

  console.log(`Created content/items/${id}.yaml`);
  console.log(`Image placeholder: ${PLACEHOLDER_IMAGE}`);
  console.log('Next: edit the YAML file, then run npm run item:validate');
}

function listItems() {
  if (!existsSync(ITEMS_DIR)) {
    fail('content/items directory does not exist.');
  }

  const files = readdirSync(ITEMS_DIR)
    .filter((file) => file.endsWith('.yaml'))
    .sort();

  if (files.length === 0) {
    console.log('No items found.');
    return;
  }

  const rows = files.map((file) => {
    const source = path.join(ITEMS_DIR, file);
    const raw = readFileSync(source, 'utf8');
    const item = parse(raw) ?? {};

    return {
      id: item.id ?? file.replace(/\.yaml$/, ''),
      title: item.title ?? '',
      status: item.status ?? '',
      image: item.image_file ?? ''
    };
  });

  const idWidth = Math.max(2, ...rows.map((row) => String(row.id).length));
  const titleWidth = Math.max(5, ...rows.map((row) => String(row.title).length));
  const statusWidth = Math.max(6, ...rows.map((row) => String(row.status).length));

  console.log(
    `${'ID'.padEnd(idWidth)}  ${'TITLE'.padEnd(titleWidth)}  ${'STATUS'.padEnd(statusWidth)}  IMAGE`
  );

  console.log(
    `${'-'.repeat(idWidth)}  ${'-'.repeat(titleWidth)}  ${'-'.repeat(statusWidth)}  ${'-'.repeat(5)}`
  );

  for (const row of rows) {
    console.log(
      `${String(row.id).padEnd(idWidth)}  ${String(row.title).padEnd(titleWidth)}  ${String(row.status).padEnd(statusWidth)}  ${row.image}`
    );
  }
}

function validateItems() {
  const result = spawnSync(process.execPath, ['scripts/validate-content.js'], {
    cwd: ROOT,
    stdio: 'inherit'
  });

  process.exit(result.status ?? 1);
}

const [command, ...args] = process.argv.slice(2);

switch (command) {
  case 'new':
    createItem(args);
    break;

  case 'list':
    listItems();
    break;

  case 'validate':
    validateItems();
    break;

  case undefined:
  case 'help':
  case '--help':
  case '-h':
    usage();
    break;

  default:
    fail(`Unknown command: ${command}`);
}
