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

const SUPPORTED_TEMPLATES = new Set(['writing', 'artwork']);

const TEMPLATE_APPLIERS = {
  writing: applyWritingTemplate,
  artwork: applyArtworkTemplate
};

function usage() {
  console.log(`Usage:
  node scripts/scaffold-client.js <target-dir> [--template <name>] [--force]

Examples:
  npm run site:scaffold -- ../atelier-noir --template writing
  npm run site:scaffold -- ../artist-site --template artwork
  npm run site:scaffold -- ../client-site --template writing --force

Options:
  --template <name>   Template to apply. Supported: ${[...SUPPORTED_TEMPLATES].join(', ')}.
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

function resetScaffoldContent(targetRoot) {
  removeIfExists(path.join(targetRoot, 'content', 'items'));
  removeIfExists(path.join(targetRoot, 'content', 'collections'));
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
  resetScaffoldContent(targetRoot);

  writeFile(targetRoot, 'config/site.yaml', `
site:
  name: "Noir writing showcase"
  tagline: "Stories, drafts and narrative projects in a darker key."
  language: "en"
  notice: "Starter writing scaffold. Replace with real author copy before publishing."
  footer_note: "Built with Atelier-Kit"
`);

  writeFile(targetRoot, 'config/catalog.yaml', `
catalog:
  item_name_singular: "project"
  item_name_plural: "projects"

  fields:
    show_price: false
    show_availability: true
    show_material: false
    show_dimensions: false
    show_status: true
    show_meta: true
`);

  writeFile(targetRoot, 'config/signal-clouds.yaml', `
signal_clouds:
  - id: atmosphere
    enabled: true
    question: "This project feels..."
    hint: "Choose the atmosphere that fits best."
    options:
      - id: rain
        label: "rain"
      - id: smoke
        label: "smoke"
      - id: silence
        label: "silence"
      - id: old-papers
        label: "old papers"
      - id: city-night
        label: "city night"

  - id: reader-interest
    enabled: true
    question: "What interests you?"
    hint: "Choose one starting point."
    options:
      - id: novel
        label: "a novel"
      - id: short-story
        label: "a short story"
      - id: work-in-progress
        label: "work in progress"
      - id: behind-the-scenes
        label: "behind the scenes"
      - id: collaboration
        label: "collaboration"

  - id: tone
    enabled: true
    question: "The tone feels..."
    hint: "Choose the tone that fits best."
    options:
      - id: noir
        label: "noir"
      - id: psychological
        label: "psychological"
      - id: absurd
        label: "absurd"
      - id: grotesque
        label: "grotesque"
      - id: restrained
        label: "restrained"
`);

  writeFile(targetRoot, 'config/contact.yaml', `
contact:
  email:
    enabled: true
    label: "Email this brief"
    address: "hello@example.com"
    subject_prefix: "Interest in"

  whatsapp:
    enabled: false
    label: "WhatsApp this brief"
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

  - label: "Notes"
    value: "Replace with writing notes"
`);

  writeFile(targetRoot, 'content/collections/writing-desk.yaml', `
id: "writing-desk"
title: "Writing desk"
description: "A first curated group of writing projects."
items:
  - first-draft
`);
}

function applyArtworkTemplate(targetRoot) {
  resetScaffoldContent(targetRoot);

  writeFile(targetRoot, 'config/site.yaml', `
site:
  name: "Studio artwork showcase"
  tagline: "Paintings, sculptures and visual works"
  language: "en"
  notice: "Starter artwork scaffold. Replace with real studio copy before publishing."
  footer_note: "Built with Atelier-Kit"
`);

  writeFile(targetRoot, 'config/catalog.yaml', `
catalog:
  item_name_singular: "work"
  item_name_plural: "works"

  fields:
    show_price: false
    show_availability: true
    show_material: true
    show_dimensions: true
    show_status: true
    show_meta: true
`);

  writeFile(targetRoot, 'config/signal-clouds.yaml', `
signal_clouds:
  - id: material
    enabled: true
    question: "This work feels made of..."
    hint: "Choose the material or medium that fits best."
    options:
      - id: oil
        label: "oil"
      - id: acrylic
        label: "acrylic"
      - id: bronze
        label: "bronze"
      - id: ceramic
        label: "ceramic"
      - id: mixed-media
        label: "mixed media"

  - id: presence
    enabled: true
    question: "Its presence feels..."
    hint: "Choose the presence that fits best."
    options:
      - id: quiet
        label: "quiet"
      - id: dramatic
        label: "dramatic"
      - id: intimate
        label: "intimate"
      - id: monumental
        label: "monumental"
      - id: playful
        label: "playful"

  - id: interest
    enabled: true
    question: "What interests you?"
    hint: "Choose one starting point."
    options:
      - id: available-work
        label: "available work"
      - id: commission
        label: "a commission"
      - id: studio-visit
        label: "a studio visit"
      - id: collaboration
        label: "collaboration"
      - id: process
        label: "the process"
`);

  writeFile(targetRoot, 'config/contact.yaml', `
contact:
  email:
    enabled: true
    label: "Email this brief"
    address: "hello@example.com"
    subject_prefix: "Interest in"

  whatsapp:
    enabled: false
    label: "WhatsApp this brief"
    phone: ""
`);

  writeFile(targetRoot, 'content/items/studio-study.yaml', `
id: "studio-study"
title: "Studio Study"
subtitle: "An artwork placeholder"
status: "draft"
price_mode: "hidden"
image_file: "/images/items/placeholder.svg"
image_alt: "Neutral placeholder image for an artwork"
description: "Replace this placeholder with a real painting, sculpture, installation or visual work."
notice: "Artwork scaffold placeholder. Replace before publishing."

meta:
  - label: "Technique"
    value: "Replace with technique"

  - label: "Support"
    value: "Replace with support"

  - label: "Dimensions"
    value: "Replace with dimensions"

  - label: "Year"
    value: "Replace with year"

  - label: "Frame"
    value: "Replace with frame details"

  - label: "Availability"
    value: "Replace with availability"

  - label: "Notes"
    value: "Replace with artwork notes"
`);

  writeFile(targetRoot, 'content/collections/recent-works.yaml', `
id: "recent-works"
title: "Recent works"
description: "A first curated group of artworks, sculptures or visual pieces."
items:
  - studio-study
`);
}

function printNextSteps(targetRoot, template) {
  const relativeTarget = path.relative(process.cwd(), targetRoot) || targetRoot;

  console.log('');
  console.log('Client site scaffold created.');
  console.log('');
  console.log(`Target: ${relativeTarget}`);
  console.log(`Template: ${template}`);
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

    TEMPLATE_APPLIERS[options.template](targetRoot);

    patchPackageJson(targetRoot);
    printNextSteps(targetRoot, options.template);
  } catch (error) {
    console.error(`ERROR: ${error.message}`);
    process.exit(1);
  }
}

main();
