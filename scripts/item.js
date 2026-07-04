#!/usr/bin/env node
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { parse, stringify } from 'yaml';
import {
  META_PRESETS,
  PLACEHOLDER_IMAGE,
  buildNewItemRecord,
  normalizeItemPreset,
  titleFromItemId
} from '../src/lib/item-presets.js';

const ROOT = process.cwd();
const ITEMS_DIR = path.join(ROOT, 'content/items');

function availablePresets() {
  return Object.keys(META_PRESETS).join(', ');
}

function usage() {
  console.log(`Atelier-Kit item helper

Usage:
  node scripts/item.js new <id> [title] [--preset <name>]
  node scripts/item.js list
  node scripts/item.js validate

Available presets:
  ${availablePresets()}

Examples:
  npm run item:new -- ceramic-blue-bowl "Ceramic Blue Bowl"
  npm run item:new -- ceramic-blue-bowl "Ceramic Blue Bowl" -- --preset handmade
  npm run item:new -- oil-study "Oil Study" -- --preset artwork
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
  return titleFromItemId(id);
}

function yamlString(value) {
  return JSON.stringify(String(value));
}

function parseNewArgs(args) {
  const positional = [];
  let preset = 'default';

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];

    if (arg === '--') {
      continue;
    }

    if (arg === '--preset') {
      const value = args[index + 1];

      if (!value || value.startsWith('--')) {
        fail(`Missing preset name. Available presets: ${availablePresets()}`);
      }

      preset = value;
      index += 1;
      continue;
    }

    if (arg.startsWith('--preset=')) {
      preset = arg.slice('--preset='.length);
      continue;
    }

    if (arg.startsWith('--')) {
      fail(`Unknown option: ${arg}`);
    }

    positional.push(arg);
  }

  if (!Object.hasOwn(META_PRESETS, preset)) {
    fail(`Unknown preset: ${preset}. Available presets: ${availablePresets()}`);
  }

  const [id, ...titleParts] = positional;

  return { id, titleParts, preset: normalizeItemPreset(preset) };
}

function renderMetaEntry(entry, indent = '  ') {
  const lines = [`${indent}- label: ${yamlString(entry.label)}`];

  if (Object.hasOwn(entry, 'value')) {
    lines.push(`${indent}  value: ${yamlString(entry.value)}`);
  }

  if (Array.isArray(entry.children) && entry.children.length > 0) {
    lines.push(`${indent}  children:`);

    for (const child of entry.children) {
      lines.push(...renderMetaEntry(child, `${indent}    `));
    }
  }

  return lines;
}

function renderMeta(preset) {
  const entries = META_PRESETS[preset];

  return ['meta:', ...entries.flatMap((entry, index) => {
    const lines = renderMetaEntry(entry);

    if (index < entries.length - 1) {
      lines.push('');
    }

    return lines;
  })];
}

function createItem(args) {
  const { id, titleParts, preset } = parseNewArgs(args);

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
    ...renderMeta(preset),
    ''
  ].join('\n');

  writeFileSync(itemPath, content, 'utf8');

  console.log(`Created content/items/${id}.yaml`);
  console.log(`Meta preset: ${preset}`);
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
