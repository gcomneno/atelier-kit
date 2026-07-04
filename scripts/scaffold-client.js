#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const EXCLUDED_NAMES = new Set([
  '.git',
  'node_modules',
  '.svelte-kit',
  '.vercel'
]);

const SUPPORTED_TEMPLATES = new Set(['writing']);

function usage() {
  console.log(`Usage:
  node scripts/scaffold-client.js <target-dir> [--template writing] [--force]

Examples:
  npm run site:scaffold -- ../atelier-noir --template writing
  npm run site:scaffold -- ../client-site --template writing --force

Options:
  --template <name>   Template to apply. Currently supported: writing.
  --force             Remove the target directory first if it already exists.

Notes:
  This command creates a separate client site folder.
  It does not run npm install.
  It does not initialize Git.
  It does not create a GitHub repository.
  It does not deploy the site.`);
}

function parseArgs(argv) {
  const args = [...argv];
  let targetDir = '';
  let template = 'writing';
  let force = false;

  while (args.length > 0) {
    const arg = args.shift();

    if (arg === '--') {
      continue;
    }

    if (arg === '--help' || arg === '-h') {
      return { help: true };
    }

    if (arg === '--force') {
      force = true;
      continue;
    }

    if (arg === '--template') {
      template = args.shift() || '';
      continue;
    }

    if (arg.startsWith('--template=')) {
      template = arg.slice('--template='.length);
      continue;
    }

    if (arg.startsWith('--')) {
      throw new Error(`Unknown option: ${arg}`);
    }

    if (!targetDir) {
      targetDir = arg;
      continue;
    }

    throw new Error(`Unexpected argument: ${arg}`);
  }

  if (!targetDir) {
    throw new Error('Missing target directory.');
  }

  if (!SUPPORTED_TEMPLATES.has(template)) {
    throw new Error(`Unknown template: ${template}. Available templates: ${[...SUPPORTED_TEMPLATES].join(', ')}`);
  }

  return { targetDir, template, force, help: false };
}

function ensureInsideReasonableTarget(sourceRoot, targetRoot) {
  if (targetRoot === sourceRoot) {
    throw new Error('Target directory cannot be the Atelier-Kit source directory.');
  }

  if (sourceRoot.startsWith(`${targetRoot}${path.sep}`)) {
    throw new Error('Target directory cannot contain the Atelier-Kit source directory.');
  }
}

function copyTree(source, target) {
  const stat = fs.statSync(source);

  if (stat.isDirectory()) {
    const name = path.basename(source);

    if (EXCLUDED_NAMES.has(name)) {
      return;
    }

    fs.mkdirSync(target, { recursive: true });

    for (const entry of fs.readdirSync(source)) {
      copyTree(path.join(source, entry), path.join(target, entry));
    }

    return;
  }

  if (stat.isFile()) {
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.copyFileSync(source, target);
  }
}

function removeIfExists(target) {
  if (fs.existsSync(target)) {
    fs.rmSync(target, { recursive: true, force: true });
  }
}

function writeFile(targetRoot, relativePath, content) {
  const filePath = path.join(targetRoot, relativePath);
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${content.trim()}\n`);
}

function patchPackageJson(targetRoot) {
  const packagePath = path.join(targetRoot, 'package.json');
  const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));

  packageJson.name = path.basename(targetRoot)
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'atelier-kit-client-site';

  packageJson.private = true;

  fs.writeFileSync(packagePath, `${JSON.stringify(packageJson, null, 2)}\n`);
}

function applyWritingTemplate(targetRoot) {
  removeIfExists(path.join(targetRoot, 'content', 'items'));
  removeIfExists(path.join(targetRoot, 'content', 'collections'));

  writeFile(targetRoot, 'config/site.yaml', `
name: "Noir writing showcase"
tagline: "Stories, drafts and narrative projects in a darker key."
description: "A small file-based showcase for novels, short stories and narrative projects."
language: "en"
notice:
  enabled: true
  text: "Starter writing scaffold. Replace with real author copy before publishing."
`);

  writeFile(targetRoot, 'config/catalog.yaml', `
title: "Writing desk"
description: "A small selection of narrative projects, drafts and stories."
empty_state: "No writing projects have been added yet."
`);

  writeFile(targetRoot, 'config/signal-clouds.yaml', `
clouds:
  - id: "atmosphere"
    label: "Atmosphere"
    options:
      - "rain"
      - "smoke"
      - "silence"
      - "old papers"
      - "city night"

  - id: "reader-interest"
    label: "Reader interest"
    options:
      - "novel"
      - "short story"
      - "work in progress"
      - "behind the scenes"
      - "collaboration"

  - id: "tone"
    label: "Tone"
    options:
      - "noir"
      - "psychological"
      - "absurd"
      - "grotesque"
      - "restrained"
`);

  writeFile(targetRoot, 'config/contact.yaml', `
email:
  enabled: true
  label: "Email"
  address: "hello@example.com"
  subject_prefix: "Interest in"

whatsapp:
  enabled: false
  label: "WhatsApp"
  phone: ""
`);

  writeFile(targetRoot, 'content/items/first-draft.yaml', `
id: "first-draft"
title: "First Draft"
subtitle: "A writing project placeholder"
status: "draft"
price_mode: "hidden"
image_file: "/images/items/placeholder.svg"
image_alt: "Neutral placeholder image for a writing project"
description: "Replace this placeholder with a real novel, short story or narrative project."
notice: "Writing scaffold placeholder. Replace before publishing."

meta:
  - label: "Format"
    value: "Novel, short story or narrative project"

  - label: "Genre"
    value: "Noir"

  - label: "Language"
    value: "Replace with language"

  - label: "Length"
    value: "Replace with length or stage"

  - label: "Reading status"
    value: "Replace with public reading status"

  - label: "Availability"
    value: "Replace with availability"

  - label: "Project notes"
    children:
      - label: "Tone"
        value: "Replace with tone"

      - label: "Setting"
        value: "Replace with setting"
`);

  writeFile(targetRoot, 'content/collections/writing-desk.yaml', `
id: "writing-desk"
title: "Writing desk"
description: "A first curated group of writing projects."
items:
  - first-draft
`);
}

function printNextSteps(targetRoot) {
  const relativeTarget = path.relative(process.cwd(), targetRoot) || targetRoot;

  console.log('');
  console.log('Client site scaffold created.');
  console.log('');
  console.log(`Target: ${relativeTarget}`);
  console.log('');
  console.log('Next steps:');
  console.log(`  cd ${relativeTarget}`);
  console.log('  npm install');
  console.log('  npm run content:validate');
  console.log('  npm run item:validate');
  console.log('  npm run content:doctor');
  console.log('  npm run check');
  console.log('  npm run build');
  console.log('');
  console.log('Then replace scaffold placeholders before publishing.');
}

function main() {
  let options;

  try {
    options = parseArgs(process.argv.slice(2));
  } catch (error) {
    console.error(`ERROR: ${error.message}`);
    console.error('');
    usage();
    process.exit(1);
  }

  if (options.help) {
    usage();
    return;
  }

  const sourceRoot = process.cwd();
  const targetRoot = path.resolve(sourceRoot, options.targetDir);

  try {
    ensureInsideReasonableTarget(sourceRoot, targetRoot);

    if (fs.existsSync(targetRoot)) {
      if (!options.force) {
        throw new Error(`Target directory already exists: ${targetRoot}. Use --force to replace it.`);
      }

      removeIfExists(targetRoot);
    }

    copyTree(sourceRoot, targetRoot);

    if (options.template === 'writing') {
      applyWritingTemplate(targetRoot);
    }

    patchPackageJson(targetRoot);
    printNextSteps(targetRoot);
  } catch (error) {
    console.error(`ERROR: ${error.message}`);
    process.exit(1);
  }
}

main();
