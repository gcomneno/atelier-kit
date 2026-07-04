#!/usr/bin/env node

import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import readline from 'node:readline/promises';
import { parse, stringify } from 'yaml';

const TEMPLATES = [
  { id: 'writing', label: 'Writing / author showcase' },
  { id: 'artwork', label: 'Artwork / visual art showcase' },
  { id: 'handmade', label: 'Handmade / craft showcase' },
  { id: 'jewelry', label: 'Jewelry showcase' },
  { id: 'furniture', label: 'Furniture / object design showcase' }
];

const TEMPLATE_STARTER = {
  writing: { itemId: 'first-draft', collectionId: 'writing-desk' },
  artwork: { itemId: 'studio-study', collectionId: 'recent-works' },
  handmade: { itemId: 'maker-piece', collectionId: 'curated-selection' },
  jewelry: { itemId: 'jewelry-piece', collectionId: 'available-pieces' },
  furniture: { itemId: 'furniture-piece', collectionId: 'room-selection' }
};

function usage() {
  console.log(`Usage:
  node scripts/site-wizard.js [options]

Interactive examples:
  npm run site:wizard
  npm run site:wizard -- --template artwork
  npm run site:wizard -- --in-place

Non-interactive example:
  npm run site:wizard -- --yes --template handmade --target ../quiet-clay \\
    --site-title "Quiet Clay Studio" --tagline "Small handmade objects" \\
    --email studio@example.com

Options:
  --template <name>         Scaffold template to use
  --in-place                Update the current folder only
  --yes                     Skip confirmation prompt
  --target <path>           Target folder for a new client site
  --site-title <text>       Site title
  --tagline <text>          Site tagline
  --language <code>         Site language (default: en)
  --email <address>         Contact email
  --whatsapp-phone <phone>  Enable WhatsApp contact with this phone number
  --notice <text>           Public site notice (empty hides it)
  --first-item-title <text> Starter item title
  --collection-title <text> Starter collection title

Notes:
  By default, the wizard creates a separate client site folder.
  Use --in-place to update site identity and contact settings in the current folder.
  The wizard generates starter content and runs structural validation.`);
}

function readOption(args, name) {
  const index = args.indexOf(name);

  if (index === -1) {
    return '';
  }

  return args[index + 1] || '';
}

function parseArgs(argv) {
  const args = [...argv];
  const flags = new Set([
    '--help',
    '-h',
    '--in-place',
    '--yes',
    '--template',
    '--target',
    '--site-title',
    '--tagline',
    '--language',
    '--email',
    '--whatsapp-phone',
    '--notice',
    '--first-item-title',
    '--collection-title'
  ]);

  const options = {
    help: false,
    inPlace: false,
    yes: false,
    template: '',
    target: '',
    siteTitle: '',
    tagline: '',
    language: 'en',
    email: '',
    whatsappPhone: '',
    notice: '',
    firstItemTitle: '',
    collectionTitle: ''
  };

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];

    if (arg === '--') {
      continue;
    }

    if (arg === '--help' || arg === '-h') {
      options.help = true;
      continue;
    }

    if (arg === '--in-place') {
      options.inPlace = true;
      continue;
    }

    if (arg === '--yes') {
      options.yes = true;
      continue;
    }

    if (arg.startsWith('--template=')) {
      options.template = arg.slice('--template='.length);
      continue;
    }

    if (arg === '--template') {
      options.template = args[index + 1] || '';
      index += 1;
      continue;
    }

    for (const optionName of [
      '--target',
      '--site-title',
      '--tagline',
      '--language',
      '--email',
      '--whatsapp-phone',
      '--notice',
      '--first-item-title',
      '--collection-title'
    ]) {
      if (arg === optionName) {
        const key = optionName.slice(2).replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
        options[key] = args[index + 1] || '';
        index += 1;
        break;
      }

      if (arg.startsWith(`${optionName}=`)) {
        const key = optionName.slice(2).replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
        options[key] = arg.slice(optionName.length + 1);
        break;
      }
    }

    if (arg.startsWith('--') && !flags.has(arg) && !arg.includes('=')) {
      throw new Error(`Unknown option: ${arg}`);
    }
  }

  if (options.template && !TEMPLATE_STARTER[options.template]) {
    throw new Error(`Unknown template: ${options.template}. Available templates: ${TEMPLATES.map((entry) => entry.id).join(', ')}`);
  }

  options.nonInteractive = Boolean(
    options.siteTitle
    || options.tagline
    || options.email
    || options.target
    || options.yes
  );

  return options;
}

function readYamlFile(root, relativePath) {
  const filePath = path.join(root, relativePath);
  return parse(readFileSync(filePath, 'utf8'));
}

function writeYamlFile(root, relativePath, data) {
  const filePath = path.join(root, relativePath);
  writeFileSync(filePath, `${stringify(data).trim()}\n`);
}

function runValidation(root, inPlace) {
  if (!inPlace && !existsSync(path.join(root, 'node_modules'))) {
    console.log('');
    console.log('Validation skipped until dependencies are installed in the new client site.');
    return true;
  }

  const result = spawnSync(process.execPath, ['scripts/validate-content.js'], {
    cwd: root,
    stdio: 'inherit'
  });

  return result.status === 0;
}

function runScaffold(sourceRoot, targetRoot, template) {
  const result = spawnSync(
    process.execPath,
    ['scripts/scaffold-client.js', targetRoot, '--template', template, '--force'],
    {
      cwd: sourceRoot,
      stdio: 'inherit'
    }
  );

  return result.status === 0;
}

function createPrompt(options) {
  return readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    terminal: Boolean(process.stdin.isTTY)
  });
}

async function askRequired(rl, label) {
  while (true) {
    const answer = (await rl.question(`${label}: `)).trim();

    if (answer) {
      return answer;
    }

    console.log('This field is required.');
  }
}

async function askOptional(rl, label, fallback = '') {
  const answer = (await rl.question(`${label}${fallback ? ` [${fallback}]` : ''}: `)).trim();
  return answer || fallback;
}

async function chooseTemplate(rl, preset) {
  if (preset) {
    return preset;
  }

  console.log('');
  console.log('Choose a use case:');

  TEMPLATES.forEach((entry, index) => {
    console.log(`  ${index + 1}. ${entry.label} (${entry.id})`);
  });

  while (true) {
    const answer = (await rl.question('Template number or id: ')).trim().toLowerCase();
    const numeric = Number.parseInt(answer, 10);

    if (!Number.isNaN(numeric) && numeric >= 1 && numeric <= TEMPLATES.length) {
      return TEMPLATES[numeric - 1].id;
    }

    if (TEMPLATE_STARTER[answer]) {
      return answer;
    }

    console.log('Choose a valid template number or id.');
  }
}

function patchSiteIdentity(root, answers) {
  const data = readYamlFile(root, 'config/site.yaml');

  if (!data.site || typeof data.site !== 'object') {
    throw new Error('config/site.yaml is missing a site object.');
  }

  data.site.name = answers.siteTitle;
  data.site.tagline = answers.tagline;
  data.site.language = answers.language;
  data.site.notice = answers.notice;
  writeYamlFile(root, 'config/site.yaml', data);
}

function patchContact(root, answers) {
  const data = readYamlFile(root, 'config/contact.yaml');

  if (!data.contact || typeof data.contact !== 'object') {
    throw new Error('config/contact.yaml is missing a contact object.');
  }

  data.contact.email = {
    enabled: true,
    label: 'Email this brief',
    address: answers.email,
    subject_prefix: 'Interest in'
  };

  data.contact.whatsapp = {
    enabled: answers.whatsappEnabled,
    label: 'WhatsApp this brief',
    phone: answers.whatsappEnabled ? answers.whatsappPhone : ''
  };

  writeYamlFile(root, 'config/contact.yaml', data);
}

function patchStarterItem(root, template, firstItemTitle) {
  if (!firstItemTitle) {
    return;
  }

  const starter = TEMPLATE_STARTER[template];
  const relativePath = `content/items/${starter.itemId}.yaml`;
  const data = readYamlFile(root, relativePath);

  data.title = firstItemTitle;
  data.notice = '';
  writeYamlFile(root, relativePath, data);
}

function patchStarterCollection(root, template, collectionTitle) {
  if (!collectionTitle) {
    return;
  }

  const starter = TEMPLATE_STARTER[template];
  const relativePath = `content/collections/${starter.collectionId}.yaml`;
  const data = readYamlFile(root, relativePath);

  data.title = collectionTitle;
  writeYamlFile(root, relativePath, data);
}

function printSummary(answers) {
  console.log('');
  console.log('Setup summary:');
  console.log(`  Mode: ${answers.mode}`);
  if (answers.targetRoot) {
    console.log(`  Target: ${answers.targetRoot}`);
  }
  if (answers.template) {
    console.log(`  Template: ${answers.template}`);
  }
  console.log(`  Site title: ${answers.siteTitle}`);
  console.log(`  Tagline: ${answers.tagline}`);
  console.log(`  Language: ${answers.language}`);
  console.log(`  Email: ${answers.email}`);
  console.log(`  WhatsApp: ${answers.whatsappEnabled ? answers.whatsappPhone : 'disabled'}`);
  if (answers.firstItemTitle) {
    console.log(`  First item title: ${answers.firstItemTitle}`);
  }
  if (answers.collectionTitle) {
    console.log(`  Collection title: ${answers.collectionTitle}`);
  }
}

function printNextSteps(targetRoot, inPlace) {
  const relativeTarget = inPlace ? '.' : path.relative(process.cwd(), targetRoot) || targetRoot;

  console.log('');
  console.log('Guided setup complete.');
  console.log('');
  console.log('Next steps:');

  if (!inPlace) {
    console.log(`  cd ${relativeTarget}`);
    console.log('  npm install');
  }

  console.log('  npm run dev');
  console.log('  npm run content:doctor');
  console.log('  npm run check');
  console.log('  npm run build');
  console.log('');
  console.log('Replace starter images and any remaining placeholder text before publishing.');
  console.log('For a public launch pass, run: npm run content:doctor -- --strict');
}

function buildAnswersFromOptions(options) {
  if (!options.siteTitle || !options.tagline || !options.email) {
    throw new Error('Non-interactive mode requires --site-title, --tagline and --email.');
  }

  if (!options.inPlace && !options.target) {
    throw new Error('Non-interactive mode for a new client site requires --target.');
  }

  if (!options.inPlace && !options.template) {
    throw new Error('Non-interactive mode for a new client site requires --template.');
  }

  return {
    mode: options.inPlace ? 'in-place' : 'new client site',
    targetRoot: options.inPlace ? process.cwd() : path.resolve(process.cwd(), options.target),
    template: options.inPlace ? '' : options.template,
    siteTitle: options.siteTitle,
    tagline: options.tagline,
    language: options.language || 'en',
    email: options.email,
    whatsappEnabled: options.whatsappPhone.trim() !== '',
    whatsappPhone: options.whatsappPhone.trim(),
    notice: options.notice,
    firstItemTitle: options.inPlace ? '' : options.firstItemTitle,
    collectionTitle: options.inPlace ? '' : options.collectionTitle
  };
}

async function collectAnswersInteractively(rl, options) {
  console.log('');
  console.log('Atelier-Kit guided setup');
  console.log('Answer a few questions to generate starter site content.');
  console.log('You can still edit files later if needed.');

  const answers = {
    mode: options.inPlace ? 'in-place' : 'new client site',
    targetRoot: process.cwd(),
    template: options.inPlace ? '' : await chooseTemplate(rl, options.template)
  };

  if (!options.inPlace) {
    answers.targetRoot = path.resolve(process.cwd(), await askRequired(rl, 'Target folder (relative path)'));
  }

  answers.siteTitle = await askRequired(rl, 'Site title');
  answers.tagline = await askRequired(rl, 'Tagline');
  answers.language = await askOptional(rl, 'Language', 'en');
  answers.email = await askRequired(rl, 'Contact email');
  answers.whatsappEnabled = /^y(es)?$/i.test(await askOptional(rl, 'Enable WhatsApp contact? (y/N)', 'n'));
  answers.whatsappPhone = answers.whatsappEnabled
    ? await askRequired(rl, 'WhatsApp phone number')
    : '';
  answers.notice = (await askOptional(rl, 'Public site notice (leave empty to hide)', '')).trim();
  answers.firstItemTitle = options.inPlace ? '' : await askOptional(rl, 'First item title (optional)');
  answers.collectionTitle = options.inPlace ? '' : await askOptional(rl, 'Collection title (optional)');

  return answers;
}

async function applySetup(options, answers) {
  if (options.inPlace) {
    patchSiteIdentity(process.cwd(), answers);
    patchContact(process.cwd(), answers);
    return;
  }

  const sourceRoot = process.cwd();

  if (!runScaffold(sourceRoot, answers.targetRoot, answers.template)) {
    throw new Error('Scaffold step failed.');
  }

  patchSiteIdentity(answers.targetRoot, answers);
  patchContact(answers.targetRoot, answers);
  patchStarterItem(answers.targetRoot, answers.template, answers.firstItemTitle);
  patchStarterCollection(answers.targetRoot, answers.template, answers.collectionTitle);
}

async function main() {
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

  let answers;
  let rl;

  try {
    if (options.nonInteractive) {
      answers = buildAnswersFromOptions(options);
    } else {
      rl = createPrompt();
      answers = await collectAnswersInteractively(rl, options);
    }

    printSummary(answers);

    if (!options.yes) {
      if (!rl) {
        rl = createPrompt();
      }

      const confirm = (await rl.question('\nCreate site with these settings? (Y/n): ')).trim();

      if (/^n(o)?$/i.test(confirm)) {
        console.log('Setup cancelled.');
        return;
      }
    }

    await applySetup(options, answers);

    const validationRoot = options.inPlace ? process.cwd() : answers.targetRoot;
    const validationOk = runValidation(validationRoot, options.inPlace);

    if (!validationOk) {
      console.error('');
      console.error('Validation reported problems. Review the messages above before continuing.');
      process.exitCode = 1;
    }

    printNextSteps(answers.targetRoot, options.inPlace);
  } finally {
    rl?.close();
  }
}

main().catch((error) => {
  console.error(`ERROR: ${error.message}`);
  process.exit(1);
});
