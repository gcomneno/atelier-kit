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

const SUPPORTED_TEMPLATES = new Set(['writing', 'artwork', 'handmade', 'jewelry', 'furniture']);

const TEMPLATE_APPLIERS = {
  writing: applyWritingTemplate,
  artwork: applyArtworkTemplate,
  handmade: applyHandmadeTemplate,
  jewelry: applyJewelryTemplate,
  furniture: applyFurnitureTemplate
};

function usage() {
  console.log(`Usage:
  node scripts/scaffold-client.js <target-dir> [--template <name>] [--force]

Examples:
  npm run site:scaffold -- ../atelier-noir --template writing
  npm run site:scaffold -- ../artist-site --template artwork
  npm run site:scaffold -- ../quiet-clay --template handmade
  npm run site:scaffold -- ../tiny-silver --template jewelry
  npm run site:scaffold -- ../quiet-room --template furniture
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

function writeSourcePointer(targetRoot, sourceRoot) {
  const relativeKit = path.relative(targetRoot, sourceRoot) || '.';
  writeFile(targetRoot, '.atelier-kit-source', relativeKit);
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

function writeScaffoldContact(targetRoot) {
  writeFile(targetRoot, 'config/contact.yaml', `
contact:
  email:
    enabled: false
    label: "Email this brief"
    address: ""
    subject_prefix: "Interest in"

  whatsapp:
    enabled: false
    label: "WhatsApp this brief"
    phone: ""
`);
}

function applyWritingTemplate(targetRoot) {
  resetScaffoldContent(targetRoot);

  writeFile(targetRoot, 'config/site.yaml', `
site:
  name: "Noir writing showcase"
  tagline: "Stories, drafts and narrative projects in a darker key."
  language: "en"
  notice: ""
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

  writeScaffoldContact(targetRoot);

  writeFile(targetRoot, 'content/items/first-draft.yaml', `
id: "first-draft"
title: "First Draft"
subtitle: "Novel project in progress"
status: "available"
price_mode: "hidden"
image_file: "/images/items/placeholder.svg"
image_alt: "Cover-style view awaiting final artwork"
description: "A narrative project entry for the writing desk collection. Update the title, description and detail fields to match your published novel, short story or hybrid work."

meta:
  - label: "Format"
    value: "Novel or short story"

  - label: "Genre"
    value: "Literary fiction"

  - label: "Language"
    value: "English"

  - label: "Length"
    value: "Novel-length draft"

  - label: "Reading status"
    value: "Work in progress"

  - label: "Availability"
    value: "Reading excerpts on request"

  - label: "Notes"
    value: "Sample entry for the writing showcase template"
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
  notice: ""
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

  writeScaffoldContact(targetRoot);

  writeFile(targetRoot, 'content/items/studio-study.yaml', `
id: "studio-study"
title: "Studio Study"
subtitle: "Oil study on canvas"
status: "available"
price_mode: "hidden"
image_file: "/images/items/placeholder.svg"
image_alt: "Studio photograph awaiting final installation shot"
description: "A visual work entry for the recent works collection. Swap the title, description and detail fields for your painting, sculpture, installation or other artwork."

meta:
  - label: "Technique"
    value: "Oil on canvas"

  - label: "Support"
    value: "Stretched canvas"

  - label: "Dimensions"
    value: "40 × 50 cm"

  - label: "Year"
    value: "2026"

  - label: "Frame"
    value: "Unframed"

  - label: "Availability"
    value: "Available for viewing"

  - label: "Notes"
    value: "Sample entry for the artwork showcase template"
`);

  writeFile(targetRoot, 'content/collections/recent-works.yaml', `
id: "recent-works"
title: "Recent works"
description: "A first curated group of artworks, sculptures or visual pieces."
items:
  - studio-study
`);
}

function applyHandmadeTemplate(targetRoot) {
  resetScaffoldContent(targetRoot);

  writeFile(targetRoot, 'config/site.yaml', `
site:
  name: "Quiet craft showcase"
  tagline: "Handmade objects for everyday use and quiet homes"
  language: "en"
  notice: ""
  footer_note: "Built with Atelier-Kit"
`);

  writeFile(targetRoot, 'config/catalog.yaml', `
catalog:
  item_name_singular: "piece"
  item_name_plural: "pieces"

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
    question: "This piece feels made of..."
    hint: "Choose the material that fits best."
    options:
      - id: clay
        label: "clay"
      - id: wood
        label: "wood"
      - id: textile
        label: "textile"
      - id: metal
        label: "metal"
      - id: paper
        label: "paper"

  - id: use-case
    enabled: true
    question: "I would use it for..."
    hint: "Choose the use case that fits best."
    options:
      - id: daily-use
        label: "daily use"
      - id: gift
        label: "a quiet gift"
      - id: decor
        label: "home decor"
      - id: table-ritual
        label: "a table ritual"
      - id: custom-work
        label: "custom work"

  - id: style
    enabled: true
    question: "Its style feels..."
    hint: "Choose the style that fits best."
    options:
      - id: calm
        label: "calm"
      - id: earthy
        label: "earthy"
      - id: playful
        label: "playful"
      - id: rustic
        label: "rustic"
      - id: refined
        label: "refined"

  - id: interest
    enabled: true
    question: "What interests you?"
    hint: "Choose one starting point."
    options:
      - id: available-piece
        label: "an available piece"
      - id: custom-work
        label: "custom work"
      - id: care-instructions
        label: "care instructions"
      - id: process
        label: "the process"
      - id: collaboration
        label: "collaboration"
`);

  writeScaffoldContact(targetRoot);

  writeFile(targetRoot, 'content/items/maker-piece.yaml', `
id: "maker-piece"
title: "Maker Piece"
subtitle: "Stoneware vessel for daily use"
status: "available"
price_mode: "hidden"
image_file: "/images/items/placeholder.svg"
image_alt: "Studio photograph awaiting final product shot"
description: "A handmade object entry for the curated selection. Update the title, description and detail fields to match your ceramic, textile, carved or other craft piece."

meta:
  - label: "Material"
    value: "Stoneware clay"

  - label: "Dimensions"
    value: "12 × 10 cm"

  - label: "Finish"
    value: "Matte glaze"

  - label: "Care"
    value: "Hand wash only"

  - label: "Availability"
    value: "Made to order in small batches"

  - label: "Object details"
    children:
      - label: "Technique"
        value: "Wheel-thrown"

      - label: "Made in"
        value: "Small studio batch"
`);

  writeFile(targetRoot, 'content/collections/curated-selection.yaml', `
id: "curated-selection"
title: "Curated selection"
description: "A first curated group of handmade pieces, available works or seasonal objects."
items:
  - maker-piece
`);
}

function applyJewelryTemplate(targetRoot) {
  resetScaffoldContent(targetRoot);

  writeFile(targetRoot, 'config/site.yaml', `
site:
  name: "Small jewelry showcase"
  tagline: "Rings, pendants and wearable pieces in quiet batches"
  language: "en"
  notice: ""
  footer_note: "Built with Atelier-Kit"
`);

  writeFile(targetRoot, 'config/catalog.yaml', `
catalog:
  item_name_singular: "piece"
  item_name_plural: "pieces"

  fields:
    show_price: false
    show_availability: true
    show_material: true
    show_dimensions: false
    show_status: true
    show_meta: true
`);

  writeFile(targetRoot, 'config/signal-clouds.yaml', `
signal_clouds:
  - id: material
    enabled: true
    question: "This piece feels made of..."
    hint: "Choose the material that fits best."
    options:
      - id: silver
        label: "silver"
      - id: gold
        label: "gold"
      - id: brass
        label: "brass"
      - id: stone
        label: "stone"
      - id: mixed-metals
        label: "mixed metals"

  - id: size
    enabled: true
    question: "I am looking for..."
    hint: "Choose the size or format that fits best."
    options:
      - id: ring
        label: "a ring"
      - id: pendant
        label: "a pendant"
      - id: earrings
        label: "earrings"
      - id: bracelet
        label: "a bracelet"
      - id: made-to-size
        label: "made-to-size"

  - id: occasion
    enabled: true
    question: "It would be for..."
    hint: "Choose the occasion that fits best."
    options:
      - id: everyday
        label: "everyday wear"
      - id: gift
        label: "a gift"
      - id: wedding
        label: "a wedding"
      - id: statement
        label: "a statement piece"
      - id: special-event
        label: "a special event"

  - id: interest
    enabled: true
    question: "What interests you?"
    hint: "Choose one starting point."
    options:
      - id: available-piece
        label: "an available piece"
      - id: sizing
        label: "sizing"
      - id: availability
        label: "availability"
      - id: custom-work
        label: "custom work"
      - id: process
        label: "the process"
`);

  writeScaffoldContact(targetRoot);

  writeFile(targetRoot, 'content/items/jewelry-piece.yaml', `
id: "jewelry-piece"
title: "Jewelry Piece"
subtitle: "Sterling silver ring with soft lines"
status: "available"
price_mode: "hidden"
image_file: "/images/items/placeholder.svg"
image_alt: "Studio photograph awaiting final product shot"
description: "A wearable piece entry for the available pieces collection. Update the title, description and detail fields to match your ring, pendant, earring or other jewelry work."

meta:
  - label: "Material"
    value: "Sterling silver"

  - label: "Size"
    value: "Ring size 54 (EU)"

  - label: "Finish"
    value: "Brushed satin"

  - label: "Stone or detail"
    value: "No stone"

  - label: "Care"
    value: "Store dry; polish with a soft cloth"

  - label: "Availability"
    value: "Available or made to size"
`);

  writeFile(targetRoot, 'content/collections/available-pieces.yaml', `
id: "available-pieces"
title: "Available pieces"
description: "A first curated group of jewelry pieces, available works or custom options."
items:
  - jewelry-piece
`);
}

function applyFurnitureTemplate(targetRoot) {
  resetScaffoldContent(targetRoot);

  writeFile(targetRoot, 'config/site.yaml', `
site:
  name: "Small furniture showcase"
  tagline: "Furniture pieces and object design for quiet interiors"
  language: "en"
  notice: ""
  footer_note: "Built with Atelier-Kit"
`);

  writeFile(targetRoot, 'config/catalog.yaml', `
catalog:
  item_name_singular: "piece"
  item_name_plural: "pieces"

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
    question: "This piece feels made of..."
    hint: "Choose the material that fits best."
    options:
      - id: wood
        label: "wood"
      - id: metal
        label: "metal"
      - id: stone
        label: "stone"
      - id: glass
        label: "glass"
      - id: mixed-materials
        label: "mixed materials"

  - id: room
    enabled: true
    question: "I would place it in..."
    hint: "Choose the room that fits best."
    options:
      - id: living-room
        label: "a living room"
      - id: bedroom
        label: "a bedroom"
      - id: studio
        label: "a studio"
      - id: kitchen
        label: "a kitchen"
      - id: entry
        label: "an entry"

  - id: use-case
    enabled: true
    question: "I need it for..."
    hint: "Choose the use case that fits best."
    options:
      - id: seating
        label: "seating"
      - id: storage
        label: "storage"
      - id: lighting
        label: "lighting"
      - id: table
        label: "a table"
      - id: custom-piece
        label: "a custom piece"

  - id: interest
    enabled: true
    question: "What interests you?"
    hint: "Choose one starting point."
    options:
      - id: available-piece
        label: "an available piece"
      - id: dimensions
        label: "dimensions"
      - id: availability
        label: "availability"
      - id: commission
        label: "a commission"
      - id: process
        label: "the process"
`);

  writeScaffoldContact(targetRoot);

  writeFile(targetRoot, 'content/items/furniture-piece.yaml', `
id: "furniture-piece"
title: "Furniture Piece"
subtitle: "Oak side table for quiet rooms"
status: "available"
price_mode: "hidden"
image_file: "/images/items/placeholder.svg"
image_alt: "Studio photograph awaiting final product shot"
description: "A furniture or object design entry for the room selection. Update the title, description and detail fields to match your chair, table, shelf, lamp or interior object."

meta:
  - label: "Material"
    value: "Solid oak"

  - label: "Dimensions"
    value: "45 × 40 × 50 cm"

  - label: "Finish"
    value: "Natural oil"

  - label: "Use"
    value: "Bedside or entry table"

  - label: "Care"
    value: "Wipe with a dry cloth"

  - label: "Availability"
    value: "Made to order"
`);

  writeFile(targetRoot, 'content/collections/room-selection.yaml', `
id: "room-selection"
title: "Room selection"
description: "A first curated group of furniture pieces, available works or custom interior objects."
items:
  - furniture-piece
`);
}

function writeDeployGuide(targetRoot) {
  const folderName = path.basename(path.resolve(targetRoot));

  writeFile(
    targetRoot,
    'DEPLOY.md',
    `
# Deploy

## Local publish prep

\`\`\`bash
npm run publish
\`\`\`

## Vercel CLI

\`\`\`bash
npm run publish -- --deploy
\`\`\`

## Deploy button

After pushing this repo to GitHub, add this button to the README (replace YOUR_GITHUB_USER):

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2FYOUR_GITHUB_USER%2F${folderName}&project-name=${folderName}&framework=sveltekit&build-command=npm%20run%20build&install-command=npm%20install)
`
  );
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
  console.log('  npm run studio:launch');
  console.log('  npm run publish');
  console.log('');
  console.log('See DEPLOY.md for Vercel deploy button instructions.');
  console.log('Add real contact details and item photos before publishing.');
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

    writeSourcePointer(targetRoot, sourceRoot);

    TEMPLATE_APPLIERS[options.template](targetRoot);

    patchPackageJson(targetRoot);
    writeDeployGuide(targetRoot);
    printNextSteps(targetRoot, options.template);
  } catch (error) {
    console.error(`ERROR: ${error.message}`);
    process.exit(1);
  }
}

main();
