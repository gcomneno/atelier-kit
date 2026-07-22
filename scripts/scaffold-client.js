#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { applyScaffoldLocalePack } from './scaffold-locales/index.js';
import { detectKitVersion } from './kit-version.js';

const EXCLUDED_NAMES = new Set([
  '.git',
  'node_modules',
  '.svelte-kit',
  '.vercel'
]);
const EXCLUDED_RELATIVE_PATHS = new Set([
  'desktop/src-tauri/target'
]);
const KIT_ONLY_ROOT_NAMES = new Set(['test']);

const SUPPORTED_TEMPLATES = new Set([
  'writing',
  'artwork',
  'handmade',
  'jewelry',
  'collector',
  'furniture',
  'genealogy'
]);

const TEMPLATE_APPLIERS = {
  writing: applyWritingTemplate,
  artwork: applyArtworkTemplate,
  handmade: applyHandmadeTemplate,
  jewelry: applyJewelryTemplate,
  collector: applyCollectorTemplate,
  furniture: applyFurnitureTemplate,
  genealogy: applyGenealogyTemplate
};

function usage() {
  console.log(`Usage:
  node scripts/scaffold-client.js <target-dir> [--template <name>] [--force]

Examples:
  npm run site:scaffold -- ../atelier-noir --template writing
  npm run site:scaffold -- ../artist-site --template artwork
  npm run site:scaffold -- ../quiet-clay --template handmade
  npm run site:scaffold -- ../tiny-silver --template jewelry
  npm run site:scaffold -- ../my-shelf --template collector
  npm run site:scaffold -- ../quiet-room --template furniture
  npm run site:scaffold -- ../family-archive --template genealogy
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
  let language = 'en';

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

    if (arg === '--language') {
      language = args.shift() || 'en';
      continue;
    }

    if (arg.startsWith('--language=')) {
      language = arg.slice('--language='.length) || 'en';
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

  return { targetDir, template, force, language, help: false };
}

function isPathInside(parentRoot, candidateRoot) {
  const relative = path.relative(parentRoot, candidateRoot);

  return relative !== '' &&
    relative !== '..' &&
    !relative.startsWith(`..${path.sep}`) &&
    !path.isAbsolute(relative);
}

function ensureInsideReasonableTarget(sourceRoot, targetRoot) {
  if (targetRoot === sourceRoot) {
    throw new Error('Target directory cannot be the Atelier-Kit source directory.');
  }

  if (isPathInside(sourceRoot, targetRoot)) {
    throw new Error('Target directory cannot be inside the Atelier-Kit source directory.');
  }

  if (isPathInside(targetRoot, sourceRoot)) {
    throw new Error('Target directory cannot contain the Atelier-Kit source directory.');
  }
}

function copyTree(source, target, sourceRoot = source) {
  const stat = fs.statSync(source);

  if (stat.isDirectory()) {
    const name = path.basename(source);
    const relativePath = path.relative(sourceRoot, source)
      .split(path.sep)
      .join('/');

    if (
      EXCLUDED_NAMES.has(name) ||
      EXCLUDED_RELATIVE_PATHS.has(relativePath) ||
      (
        source !== sourceRoot &&
        path.dirname(source) === sourceRoot &&
        KIT_ONLY_ROOT_NAMES.has(name)
      )
    ) {
      return;
    }

    fs.mkdirSync(target, { recursive: true });

    for (const entry of fs.readdirSync(source)) {
      copyTree(path.join(source, entry), path.join(target, entry), sourceRoot);
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

function writeScaffoldSocial(targetRoot) {
  writeFile(targetRoot, 'config/social.yaml', `
social:
  # Supported ids: instagram, facebook, x, github (twitter is accepted as an alias for x).
  # Example: { id: github, url: "https://github.com/sponsors/your-name" }
  links: []
`);
}

function writeScaffoldFooter(targetRoot) {
  writeFile(targetRoot, 'config/footer.yaml', `
footer:
  columns:
    - title: Links
      links:
        - label: Privacy
          href: /legal/privacy
        - label: About
          href: /about
  copyright: "© 2026 Studio Name"
  legal_line: "P.IVA 12345678901"
  show_social: false
`);
}

function writeScaffoldLegal(targetRoot) {
  writeFile(targetRoot, 'config/legal.yaml', `
legal:
  pages:
    privacy:
      title: Privacy Policy
      body: |
        Multi-line plain text for your privacy policy.
    cookie:
      title: Cookie Policy
      body: |
        Multi-line plain text for your cookie policy.
`);
}

function applyWritingTemplate(targetRoot) {
  // Optional catalog sidebar: add config/layout.yaml with preset catalog-sidebar (ADR 0006).
  resetScaffoldContent(targetRoot);

  writeFile(targetRoot, 'config/site.yaml', `
site:
  name: "Noir writing showcase"
  tagline: "Stories, drafts and narrative projects in a darker key."
  language: "en"
  notice: ""
  footer_note: ""
`);

  writeFile(targetRoot, 'config/catalog.yaml', `
catalog:
  item_name_singular: "project"
  item_name_plural: "projects"
  sort: manual`);

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
  writeScaffoldSocial(targetRoot);

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

  writeFile(targetRoot, 'content/news/spring-announcement.yaml', `
id: "spring-announcement"
title: "Spring collection preview"
date: "2026-03-15"
excerpt: "Short teaser for the list page."
body: |
  Full post body as plain text with newlines preserved.
  Update this sample news post in Studio or replace it with your own announcements.
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
  footer_note: ""
`);

  writeFile(targetRoot, 'config/catalog.yaml', `
catalog:
  item_name_singular: "work"
  item_name_plural: "works"
  sort: manual`);

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
  writeScaffoldSocial(targetRoot);

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
  footer_note: ""
`);

  writeFile(targetRoot, 'config/catalog.yaml', `
catalog:
  item_name_singular: "piece"
  item_name_plural: "pieces"
  sort: manual`);

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
  writeScaffoldSocial(targetRoot);

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
  footer_note: ""
`);

  writeFile(targetRoot, 'config/catalog.yaml', `
catalog:
  item_name_singular: "piece"
  item_name_plural: "pieces"
  sort: manual`);

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
  writeScaffoldSocial(targetRoot);

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

function applyCollectorTemplate(targetRoot) {
  resetScaffoldContent(targetRoot);

  writeFile(targetRoot, 'config/site.yaml', `
site:
  name: "Personal collection showcase"
  tagline: "My collection — open to swaps and trades"
  language: "en"
  notice: "Offline trades with adult supervision only. No sales on this site."
  footer_note: ""
`);

  writeFile(targetRoot, 'config/catalog.yaml', `
catalog:
  item_name_singular: "collectible"
  item_name_plural: "collectibles"
  sort: manual`);

  writeFile(targetRoot, 'config/signal-clouds.yaml', `
signal_clouds:
  - id: trade_intent
    enabled: true
    question: "What interests you?"
    hint: "Choose an option — it goes in the message to the collector."
    options:
      - id: swap
        label: "I'd like to propose a swap"
      - id: offer
        label: "I have something to offer you (see message)"
      - id: ask
        label: "I'm asking about this item"
      - id: just_browse
        label: "just browsing"

  - id: meetup
    enabled: true
    question: "How would you prefer to meet?"
    hint: "Physical trades happen off-site, with agreement between adults."
    options:
      - id: local_adult
        label: "meet locally with an adult present"
      - id: school
        label: "at school (with parent permission)"
      - id: event
        label: "at an event / tournament"
      - id: mail_parent
        label: "shipping — parent organizes only"

  - id: looking_for
    enabled: true
    question: "On my shelf I'm mainly looking for…"
    hint: "Helps the other person know what to offer you."
    options:
      - id: same_set
        label: "items from the same set"
      - id: missing_slot
        label: "the number I'm missing in the album"
      - id: rare_upgrade
        label: "higher rarity"
      - id: any_fair
        label: "fair offers — message me"

  - id: condition
    enabled: true
    question: "Your card / figurine is…"
    hint: "Honesty before trading."
    options:
      - id: mint
        label: "like new (in sleeve or equivalent)"
      - id: near_mint
        label: "excellent — sleeve immediately"
      - id: played
        label: "played but decent"
      - id: tell_me
        label: "I'll describe everything in the message"
`);

  writeScaffoldContact(targetRoot);
  writeScaffoldSocial(targetRoot);

  writeFile(targetRoot, 'content/items/collector-piece.yaml', `
id: "collector-piece"
title: "Collector Piece"
subtitle: "Series 3 · limited edition figurine"
status: "for-trade"
price_mode: "hidden"
image_file: "/images/items/placeholder.svg"
image_alt: "Studio photograph awaiting final product shot"
description: "A collectible entry for your personal shelf. Update the title, description and detail fields to match a trading card, figurine, sticker, pin or other small collectible."

meta:
  - label: "Set / Series"
    value: "Series 3"

  - label: "Condition"
    value: "Near mint"

  - label: "Duplicate"
    value: "Yes — I have two"

  - label: "Availability"
    value: "For trade"
`);

  writeFile(targetRoot, 'content/collections/my-collection.yaml', `
id: "my-collection"
title: "My collection"
description: "A first group of collectibles from your personal shelf — duplicates, trade bait or showcase pieces."
items:
  - collector-piece
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
  footer_note: ""
`);

  writeFile(targetRoot, 'config/catalog.yaml', `
catalog:
  item_name_singular: "piece"
  item_name_plural: "pieces"
  sort: manual`);

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
  writeScaffoldSocial(targetRoot);

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

function applyGenealogyTemplate(targetRoot) {
  resetScaffoldContent(targetRoot);

  writeFile(targetRoot, 'config/site.yaml', `
site:
  name: "The Conti–Serra Family Archive"
  tagline: "People, places and stories across three generations"
  language: "en"
  notice: "Demo records are fictional. Before publishing a living person, obtain informed consent and remove private dates, addresses, contact details and sensitive documents."
  footer_note: "Family relationships are editorial links between ordinary catalog items."
  hero_intro: "Follow the people, places and documents that connect this fictional family archive."
  appearance:
    preset: "intimate"
    font_preset: "lora"
`);

  writeFile(targetRoot, 'config/catalog.yaml', `
catalog:
  item_name_singular: "person"
  item_name_plural: "people"
  sort: manual
  eyebrow: "Family archive"
  intro: "Browse each person as an ordinary Atelier-Kit catalog record, then use the relationship overview to follow the directed connections."
`);

  writeFile(targetRoot, 'config/layout.yaml', `
layout:
  preset: single-column
  blocks:
    about:
      enabled: true
      placements:
        - menu
    news:
      enabled: false
      placements:
        - sidebar
      count: 3
    collections:
      enabled: true
      placements:
        - main
        - menu
    catalog:
      enabled: true
      placements:
        - main
        - menu
      label: "People"
`);

  writeFile(targetRoot, 'config/about.yaml', `
about:
  enabled: true
  title: "About this family archive"
  intro: |
    This fictional archive demonstrates a genealogy-oriented presentation built entirely from Atelier-Kit's generic item, image, metadata, document-link and relationship capabilities.
  sections:
    - heading: "A public starting point"
      body: |
        Replace every demo record and source note before publishing. Atelier-Kit does not provide authentication or a private family portal, so treat every generated visitor page as public.
    - heading: "Relationships are editorial"
      body: |
        Parent, spouse and other meanings are template vocabulary, not genealogy rules. Directed links, lateral links, cycles and incomplete research remain valid.
`);

  writeFile(targetRoot, 'config/signal-clouds.yaml', `
signal_clouds: []
`);

  writeScaffoldContact(targetRoot);
  writeScaffoldSocial(targetRoot);

  writeFile(targetRoot, 'config/footer.yaml', `
footer:
  columns:
    - title: "Explore"
      links:
        - label: "People"
          href: "/catalog"
        - label: "Relationship overview"
          href: "/relationships"
    - title: "Information"
      links:
        - label: "About"
          href: "/about"
        - label: "Privacy guidance"
          href: "/legal/privacy"
  copyright: ""
  legal_line: ""
  show_social: false
`);

  writeFile(targetRoot, 'config/legal.yaml', `
legal:
  pages:
    privacy:
      title: "Privacy guidance for family archives"
      body: |
        This generated site is public and has no private-member access control.

        Obtain informed consent before publishing a living person. Minimize exact dates and places, and do not publish home addresses, contact details, identity numbers, medical information or sensitive source documents without explicit permission.

        The included people and archive note are fictional demonstration content. Replace or remove them before publication.
`);

  writeFile(targetRoot, 'static/documents/genealogy/sample-archive-note.txt', `
Fictional demo archive note

This text file demonstrates the ordinary item preview/document link used by the
genealogy scaffold. Replace it with a reviewed public document, or remove each
item's preview field before publishing.
`);

  const sharedPersonFields = `
status: "historical record"
price_mode: "hidden"
images:
  - file: "/images/items/placeholder.svg"
    alt: "Placeholder portrait to replace before publishing"
    role: "cover"
preview:
  href: "/documents/genealogy/sample-archive-note.txt"
  label: "Open the fictional archive note"
notice: "Fictional demonstration record. Replace the biography, portrait and source document before publishing."
`;

  writeFile(targetRoot, 'content/items/alma-conti.yaml', `
id: "alma-conti"
title: "Alma Conti"
subtitle: "1908–1987 · Parma and Bologna, Italy"
sort_order: 10
${sharedPersonFields}
description: |
  Alma Conti grew up near Parma and later kept a small stationery shop in Bologna. Her notebooks, letters and carefully captioned photographs became the starting point for this fictional family archive.

  This biography is demo copy. Replace it with a sourced, consent-aware account written for public readers.
meta:
  - label: "Dates"
    children:
      - label: "Born"
        value: "12 May 1908"
      - label: "Died"
        value: "3 November 1987"
  - label: "Places"
    children:
      - label: "Birthplace"
        value: "Parma, Italy"
      - label: "Later home"
        value: "Bologna, Italy"
  - label: "Occupation"
    value: "Stationer"
relations:
  - type: "spouse"
    target: "matteo-serra"
    label: "Husband"
`);

  writeFile(targetRoot, 'content/items/matteo-serra.yaml', `
id: "matteo-serra"
title: "Matteo Serra"
subtitle: "1905–1979 · Modena and Bologna, Italy"
sort_order: 20
${sharedPersonFields}
description: |
  Matteo Serra trained as a cabinetmaker in Modena and moved to Bologna in the late 1920s. The fictional workshop records linked from this demo are placeholders for reviewed family documents.

  Record uncertainty in the prose instead of inventing facts, and cite only sources that are safe to publish.
meta:
  - label: "Dates"
    children:
      - label: "Born"
        value: "21 January 1905"
      - label: "Died"
        value: "18 August 1979"
  - label: "Places"
    children:
      - label: "Birthplace"
        value: "Modena, Italy"
      - label: "Later home"
        value: "Bologna, Italy"
  - label: "Occupation"
    value: "Cabinetmaker"
relations:
  - type: "spouse"
    target: "alma-conti"
    label: "Wife"
`);

  writeFile(targetRoot, 'content/items/lucia-serra.yaml', `
id: "lucia-serra"
title: "Lucia Serra"
subtitle: "1934–2012 · Bologna and Florence, Italy"
sort_order: 30
${sharedPersonFields}
description: |
  Lucia Serra studied languages before settling in Florence, where she translated correspondence for local exporters. Her recollections connect the first and third generations represented in this fictional archive.

  The two parent links and lateral spouse link below are ordinary directed item relationships.
meta:
  - label: "Dates"
    children:
      - label: "Born"
        value: "7 September 1934"
      - label: "Died"
        value: "26 February 2012"
  - label: "Places"
    children:
      - label: "Birthplace"
        value: "Bologna, Italy"
      - label: "Later home"
        value: "Florence, Italy"
  - label: "Occupation"
    value: "Translator"
relations:
  - type: "parent"
    target: "alma-conti"
    label: "Mother"
  - type: "parent"
    target: "matteo-serra"
    label: "Father"
  - type: "spouse"
    target: "renato-galli"
    label: "Husband"
`);

  writeFile(targetRoot, 'content/items/renato-galli.yaml', `
id: "renato-galli"
title: "Renato Galli"
subtitle: "1931–2001 · Florence, Italy"
sort_order: 40
${sharedPersonFields}
description: |
  Renato Galli worked as a railway clerk and photographed neighborhood celebrations. This fictional record shows how a spouse can sit beside a generation rather than inside a strict tree.

  Use the image gallery and document link only for material cleared for public access.
meta:
  - label: "Dates"
    children:
      - label: "Born"
        value: "16 March 1931"
      - label: "Died"
        value: "9 December 2001"
  - label: "Places"
    children:
      - label: "Birthplace"
        value: "Florence, Italy"
      - label: "Later home"
        value: "Florence, Italy"
  - label: "Occupation"
    value: "Railway clerk"
relations:
  - type: "spouse"
    target: "lucia-serra"
    label: "Wife"
`);

  writeFile(targetRoot, 'content/items/nina-galli.yaml', `
id: "nina-galli"
title: "Nina Galli"
subtitle: "1962–2021 · Florence and Turin, Italy"
sort_order: 50
${sharedPersonFields}
description: |
  Nina Galli catalogued family photographs and added dates and place names from notes on their reverse. In this fictional example she forms the third generation and points to both parents.

  For a living person, publish a reduced biography only after informed consent and omit exact private details.
meta:
  - label: "Dates"
    children:
      - label: "Born"
        value: "4 July 1962"
      - label: "Died"
        value: "11 October 2021"
  - label: "Places"
    children:
      - label: "Birthplace"
        value: "Florence, Italy"
      - label: "Later home"
        value: "Turin, Italy"
  - label: "Occupation"
    value: "Photo archivist"
relations:
  - type: "parent"
    target: "lucia-serra"
    label: "Mother"
  - type: "parent"
    target: "renato-galli"
    label: "Father"
`);

  writeFile(targetRoot, 'content/collections/family-archive.yaml', `
id: "family-archive"
title: "Three generations"
description: "Five fictional people demonstrating two-parent, spouse, cyclic and multi-generation relationships without imposing a family-tree schema."
items:
  - alma-conti
  - matteo-serra
  - lucia-serra
  - renato-galli
  - nina-galli
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

    if (fs.existsSync(targetRoot) && !options.force) {
      throw new Error(`Target directory already exists: ${targetRoot}. Use --force to replace it.`);
    }

    const kitVersion = detectKitVersion(sourceRoot);
    if (!kitVersion) throw new Error(`Could not detect the Atelier-Kit version from ${sourceRoot}.`);

    if (fs.existsSync(targetRoot)) {
      removeIfExists(targetRoot);
    }

    copyTree(sourceRoot, targetRoot);

    fs.writeFileSync(path.join(targetRoot, '.atelier-kit-version'), `${kitVersion}\n`);

    writeSourcePointer(targetRoot, sourceRoot);

    TEMPLATE_APPLIERS[options.template](targetRoot);

    applyScaffoldLocalePack(targetRoot, options.language);

    patchPackageJson(targetRoot);
    writeDeployGuide(targetRoot);
    printNextSteps(targetRoot, options.template);
  } catch (error) {
    console.error(`ERROR: ${error.message}`);
    process.exit(1);
  }
}

main();
