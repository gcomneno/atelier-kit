#!/usr/bin/env node

import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import readline from 'node:readline/promises';

const UPGRADE_DIRS = ['src', 'scripts'];
const SKIP_DIR_NAMES = new Set(['.git', 'node_modules', '.svelte-kit', '.vercel']);
const SOURCE_POINTER = '.atelier-kit-source';
const UPGRADE_MANIFEST = '.atelier-kit-upgrade.json';

function usage() {
  console.log(`Usage:
  npm run site:upgrade -- [--from <kit-path>] [--yes] [--dry-run]
  node scripts/site-upgrade.js [--target <client-path>] [--from <kit-path>] [--yes] [--dry-run]

Examples:
  cd ../client-site && npm run site:upgrade -- --from ../atelier-kit
  npm run site:upgrade -- --target ../luna-argento --from .

Options:
  --from <path>     Atelier-Kit source directory (default: .atelier-kit-source or ../atelier-kit)
  --target <path>   Client site directory (default: current working directory)
  --yes, -y         Apply without confirmation
  --dry-run         Show the plan only; do not apply changes

Notes:
  Syncs src/ and scripts/ from the kit into the client site.
  Never touches config/, content/ or static/images/items/.
  Merges npm scripts from the kit package.json into the client package.json.
  Writes ${SOURCE_POINTER} and ${UPGRADE_MANIFEST} in the client folder.`);
}

/**
 * @param {string[]} argv
 */
function parseArgs(argv) {
  const args = [...argv];
  /** @type {{ help?: true, from?: string, target?: string, yes?: boolean, dryRun?: boolean }} */
  const options = {};

  while (args.length > 0) {
    const arg = args.shift();

    if (arg === '--') {
      continue;
    }

    if (arg === '--help' || arg === '-h') {
      return { help: true };
    }

    if (arg === '--yes' || arg === '-y') {
      options.yes = true;
      continue;
    }

    if (arg === '--dry-run') {
      options.dryRun = true;
      continue;
    }

    if (arg === '--from') {
      options.from = args.shift() || '';
      continue;
    }

    if (arg.startsWith('--from=')) {
      options.from = arg.slice('--from='.length);
      continue;
    }

    if (arg === '--target') {
      options.target = args.shift() || '';
      continue;
    }

    if (arg.startsWith('--target=')) {
      options.target = arg.slice('--target='.length);
      continue;
    }

    if (arg.startsWith('--')) {
      throw new Error(`Unknown option: ${arg}`);
    }

    throw new Error(`Unexpected argument: ${arg}`);
  }

  return options;
}

/**
 * @param {string} dir
 */
function isKitRoot(dir) {
  return (
    fs.existsSync(path.join(dir, 'scripts/scaffold-client.js')) &&
    fs.existsSync(path.join(dir, 'src/routes'))
  );
}

/**
 * @param {string} dir
 */
function assertClientSite(dir) {
  if (!fs.existsSync(path.join(dir, 'config/site.yaml'))) {
    throw new Error(`Not an Atelier-Kit client site: missing config/site.yaml in ${dir}`);
  }
}

/**
 * @param {string} clientRoot
 * @param {string | undefined} fromArg
 */
function resolveKitRoot(clientRoot, fromArg) {
  if (fromArg) {
    const kitRoot = path.resolve(clientRoot, fromArg);

    if (!isKitRoot(kitRoot)) {
      throw new Error(`Not an Atelier-Kit source directory: ${kitRoot}`);
    }

    return kitRoot;
  }

  const pointerPath = path.join(clientRoot, SOURCE_POINTER);

  if (fs.existsSync(pointerPath)) {
    const relativePath = fs.readFileSync(pointerPath, 'utf8').trim();

    if (relativePath) {
      const kitRoot = path.resolve(clientRoot, relativePath);

      if (isKitRoot(kitRoot)) {
        return kitRoot;
      }
    }
  }

  const sibling = path.resolve(clientRoot, '..', 'atelier-kit');

  if (isKitRoot(sibling)) {
    return sibling;
  }

  throw new Error(
    `Could not find Atelier-Kit source. Pass --from <path> (for example: --from ../atelier-kit).`
  );
}

/**
 * @param {string} filePath
 */
function hashFile(filePath) {
  const buffer = fs.readFileSync(filePath);
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

/**
 * @param {string} rootDir
 * @param {string} prefix
 * @returns {Map<string, string>}
 */
function collectFiles(rootDir, prefix) {
  /** @type {Map<string, string>} */
  const files = new Map();

  if (!fs.existsSync(rootDir)) {
    return files;
  }

  /**
   * @param {string} absDir
   * @param {string} relPrefix
   */
  function walk(absDir, relPrefix) {
    for (const entry of fs.readdirSync(absDir, { withFileTypes: true })) {
      if (entry.isDirectory()) {
        if (SKIP_DIR_NAMES.has(entry.name)) {
          continue;
        }

        walk(path.join(absDir, entry.name), `${relPrefix}/${entry.name}`);
        continue;
      }

      if (entry.isFile()) {
        const rel = `${relPrefix}/${entry.name}`;
        files.set(rel, hashFile(path.join(absDir, entry.name)));
      }
    }
  }

  walk(rootDir, prefix);
  return files;
}

/**
 * @param {string} kitRoot
 * @param {string} clientRoot
 */
function buildFilePlan(kitRoot, clientRoot) {
  /** @type {{ add: string[], update: string[], remove: string[] }} */
  const plan = { add: [], update: [], remove: [] };

  for (const dir of UPGRADE_DIRS) {
    const kitFiles = collectFiles(path.join(kitRoot, dir), dir);
    const clientFiles = collectFiles(path.join(clientRoot, dir), dir);

    for (const [rel, kitHash] of kitFiles) {
      if (!clientFiles.has(rel)) {
        plan.add.push(rel);
      } else if (clientFiles.get(rel) !== kitHash) {
        plan.update.push(rel);
      }
    }

    for (const rel of clientFiles.keys()) {
      if (!kitFiles.has(rel)) {
        plan.remove.push(rel);
      }
    }
  }

  plan.add.sort();
  plan.update.sort();
  plan.remove.sort();
  return plan;
}

/**
 * @param {string} kitRoot
 * @param {string} clientRoot
 * @returns {{ key: string, from?: string, to: string }[]}
 */
function buildScriptPlan(kitRoot, clientRoot) {
  const kitPkg = JSON.parse(fs.readFileSync(path.join(kitRoot, 'package.json'), 'utf8'));
  const clientPkg = JSON.parse(fs.readFileSync(path.join(clientRoot, 'package.json'), 'utf8'));
  /** @type {{ key: string, from?: string, to: string }[]} */
  const changes = [];

  for (const [key, value] of Object.entries(kitPkg.scripts || {})) {
    if (clientPkg.scripts?.[key] !== value) {
      changes.push({ key, from: clientPkg.scripts?.[key], to: value });
    }
  }

  return changes;
}

/**
 * @param {{ add: string[], update: string[], remove: string[] }} filePlan
 * @param {{ key: string, from?: string, to: string }[]} scriptPlan
 * @param {string} kitRoot
 * @param {string} clientRoot
 * @param {string | null} kitVersion
 * @returns {boolean}
 */
function printPlan(filePlan, scriptPlan, kitRoot, clientRoot, kitVersion) {
  console.log('Atelier-Kit site upgrade');
  console.log(`Kit:    ${kitRoot}${kitVersion ? ` (${kitVersion})` : ''}`);
  console.log(`Client: ${clientRoot}`);
  console.log('');
  console.log('Protected (never touched): config/, content/, static/images/items/');
  console.log('');

  const total =
    filePlan.add.length + filePlan.update.length + filePlan.remove.length + scriptPlan.length;

  if (total === 0) {
    console.log('Already up to date.');
    return false;
  }

  if (filePlan.add.length > 0) {
    console.log(`Add (${filePlan.add.length}):`);

    for (const rel of filePlan.add) {
      console.log(`  + ${rel}`);
    }
  }

  if (filePlan.update.length > 0) {
    console.log(`Update (${filePlan.update.length}):`);

    for (const rel of filePlan.update) {
      console.log(`  ~ ${rel}`);
    }
  }

  if (filePlan.remove.length > 0) {
    console.log(`Remove (${filePlan.remove.length}):`);

    for (const rel of filePlan.remove) {
      console.log(`  - ${rel}`);
    }
  }

  if (scriptPlan.length > 0) {
    console.log(`package.json scripts (${scriptPlan.length}):`);

    for (const { key, from, to } of scriptPlan) {
      console.log(`  ~ scripts.${key}`);

      if (from) {
        console.log(`      was: ${from}`);
      }

      console.log(`      now: ${to}`);
    }
  }

  return true;
}

/**
 * @param {{ add: string[], update: string[], remove: string[] }} filePlan
 * @param {string} kitRoot
 * @param {string} clientRoot
 */
function applyFilePlan(filePlan, kitRoot, clientRoot) {
  for (const rel of [...filePlan.add, ...filePlan.update]) {
    const source = path.join(kitRoot, rel);
    const target = path.join(clientRoot, rel);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.copyFileSync(source, target);
  }

  for (const rel of filePlan.remove) {
    const target = path.join(clientRoot, rel);

    if (fs.existsSync(target)) {
      fs.rmSync(target, { force: true });
    }
  }
}

/**
 * @param {string} kitRoot
 * @param {string} clientRoot
 */
function applyScriptPlan(kitRoot, clientRoot) {
  const kitPkg = JSON.parse(fs.readFileSync(path.join(kitRoot, 'package.json'), 'utf8'));
  const clientPkgPath = path.join(clientRoot, 'package.json');
  const clientPkg = JSON.parse(fs.readFileSync(clientPkgPath, 'utf8'));

  clientPkg.scripts = clientPkg.scripts || {};

  for (const [key, value] of Object.entries(kitPkg.scripts || {})) {
    clientPkg.scripts[key] = value;
  }

  fs.writeFileSync(clientPkgPath, `${JSON.stringify(clientPkg, null, 2)}\n`);
}

/**
 * @param {string} clientRoot
 * @param {string} kitRoot
 * @param {string | null} kitVersion
 */
function writeManifest(clientRoot, kitRoot, kitVersion) {
  const relativeKit = path.relative(clientRoot, kitRoot) || '.';
  fs.writeFileSync(path.join(clientRoot, SOURCE_POINTER), `${relativeKit}\n`);

  const manifest = {
    kitPath: relativeKit,
    upgradedAt: new Date().toISOString(),
    kitVersion
  };

  fs.writeFileSync(path.join(clientRoot, UPGRADE_MANIFEST), `${JSON.stringify(manifest, null, 2)}\n`);
}

/**
 * @param {string} kitRoot
 * @returns {string | null}
 */
function readLatestChangelogVersion(kitRoot) {
  const changelogPath = path.join(kitRoot, 'CHANGELOG.md');

  if (!fs.existsSync(changelogPath)) {
    return null;
  }

  const content = fs.readFileSync(changelogPath, 'utf8');
  const match = content.match(/^## (v[0-9]+\.[0-9]+\.[0-9]+)/m);

  return match ? match[1] : null;
}

/**
 * @param {string} kitRoot
 * @returns {string | null}
 */
function readKitPackageVersion(kitRoot) {
  try {
    const pkg = JSON.parse(fs.readFileSync(path.join(kitRoot, 'package.json'), 'utf8'));
    return typeof pkg.version === 'string' && pkg.version.trim() !== '' ? pkg.version.trim() : null;
  } catch {
    return null;
  }
}

/**
 * @param {string} kitRoot
 * @returns {string | null}
 */
function detectKitVersion(kitRoot) {
  const exactTag = spawnSync('git', ['-C', kitRoot, 'describe', '--tags', '--exact-match'], {
    encoding: 'utf8'
  });

  if (exactTag.status === 0) {
    return exactTag.stdout.trim();
  }

  const changelogVersion = readLatestChangelogVersion(kitRoot);
  const nearestTag = spawnSync('git', ['-C', kitRoot, 'describe', '--tags', '--abbrev=0'], {
    encoding: 'utf8'
  });

  if (nearestTag.status === 0) {
    const tag = nearestTag.stdout.trim();

    if (changelogVersion && changelogVersion !== tag) {
      return changelogVersion;
    }

    const ahead = spawnSync('git', ['-C', kitRoot, 'rev-list', `${tag}..HEAD`, '--count'], {
      encoding: 'utf8'
    });
    const commitCount = Number.parseInt(String(ahead.stdout).trim(), 10);

    if (Number.isFinite(commitCount) && commitCount > 0) {
      return `${tag}+${commitCount}`;
    }

    return tag;
  }

  if (changelogVersion) {
    return changelogVersion;
  }

  const packageVersion = readKitPackageVersion(kitRoot);

  if (packageVersion) {
    return `dev-${packageVersion}`;
  }

  return null;
}

/**
 * @param {string} message
 */
async function confirm(message) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const answer = await rl.question(message);
  rl.close();
  return /^y(es)?$/i.test(answer.trim());
}

async function main() {
  let options;

  try {
    options = parseArgs(process.argv.slice(2));
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`ERROR: ${message}`);
    console.error('');
    usage();
    process.exit(1);
  }

  if (options.help) {
    usage();
    return;
  }

  const clientRoot = path.resolve(process.cwd(), options.target || '.');
  assertClientSite(clientRoot);

  let kitRoot;

  try {
    kitRoot = resolveKitRoot(clientRoot, options.from);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`ERROR: ${message}`);
    process.exit(1);
  }

  if (path.resolve(kitRoot) === path.resolve(clientRoot)) {
    console.error('ERROR: Kit source and client site cannot be the same directory.');
    process.exit(1);
  }

  const kitVersion = detectKitVersion(kitRoot);
  const filePlan = buildFilePlan(kitRoot, clientRoot);
  const scriptPlan = buildScriptPlan(kitRoot, clientRoot);
  const hasChanges = printPlan(filePlan, scriptPlan, kitRoot, clientRoot, kitVersion);

  if (!hasChanges) {
    return;
  }

  if (options.dryRun) {
    console.log('');
    console.log('Dry run only. No files were changed.');
    return;
  }

  if (!options.yes) {
    const approved = await confirm('\nApply these changes? [y/N] ');

    if (!approved) {
      console.log('Upgrade cancelled.');
      return;
    }
  }

  applyFilePlan(filePlan, kitRoot, clientRoot);

  if (scriptPlan.length > 0) {
    applyScriptPlan(kitRoot, clientRoot);
  }

  writeManifest(clientRoot, kitRoot, kitVersion);

  console.log('');
  console.log('Upgrade applied.');
  console.log('Next steps:');
  console.log('  npm run check');
  console.log('  npm run build');

  if (scriptPlan.length > 0) {
    console.log('  npm install   # if kit dependencies changed since last upgrade');
  }
}

main().catch((error) => {
  console.error(`ERROR: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
});
