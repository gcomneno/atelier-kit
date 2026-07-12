#!/usr/bin/env node

import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import readline from 'node:readline/promises';
import { pathToFileURL } from 'node:url';

const UPGRADE_DIRS = ['src', 'scripts'];
const VITE_CONFIG = 'vite.config.js';
// Exact hashes of historical Vite configs verified in the local repository.
// Only these known, unmodified files are safe to replace automatically.
const LEGACY_VITE_CONFIG_HASHES = new Set([
  // v0.1.28-v0.3.0; changelog-based resolver introduced by f6479f9.
  '4a8d45c2251080019282859b17b04993dfe06568c0214c0e3959b467d2572432',
  // v0.1.0-v0.1.27; original adapter-vercel config from fa88896.
  '770285f7986d9f41e809976bbaf616bd97ffd81ff106c59d47f18e8b676deb8a',
  // Initial SvelteKit adapter-auto starter variant from b5f23b9 (unreleased).
  '8f489600e36ef36af5b82d1e7733b5026f9d41a49a94302cbb76833033a9254a'
]);
const SKIP_DIR_NAMES = new Set(['.git', 'node_modules', '.svelte-kit', '.vercel']);
const SOURCE_POINTER = '.atelier-kit-source';
const UPGRADE_MANIFEST = '.atelier-kit-upgrade.json';
const PRESERVE_MANIFEST = '.atelier-kit-preserve';
const CORE_MANAGED_PRESERVE_PATTERNS = [
  { prefix: 'src/lib/server/', label: 'src/lib/server/*' },
  { prefix: 'src/lib/components/', label: 'src/lib/components/*' },
  { prefix: 'src/routes/items/', label: 'src/routes/items/*' },
  { prefix: 'src/routes/studio/', label: 'src/routes/studio/*' },
  { prefix: 'scripts/', label: 'scripts/*' }
];

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
  Installs a missing Vite config and updates only known, unmodified legacy Kit versions.
  Never touches config/, content/ or static/images/items/.
  Skips paths listed in .atelier-kit-preserve (one relative path per line).
  Merges npm scripts from the kit package.json into the client package.json.
  Writes ${SOURCE_POINTER} and ${UPGRADE_MANIFEST} in the client folder.`);
}

/**
 * @param {string[]} argv
 * @returns {{ help?: true, from?: string, target?: string, yes?: boolean, dryRun?: boolean }}
 */
function parseArgs(argv) {
  const args = [...argv];
  /** @type {{ help?: true, from?: string, target?: string, yes?: boolean, dryRun?: boolean }} */
  const options = {};

  while (args.length > 0) {
    const arg = args.shift();

    if (!arg) {
      continue;
    }

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
 * @param {string} preservePath
 */
function normalizePreservePath(preservePath) {
  return preservePath.replaceAll('\\', '/').replace(/^\/+/, '').replace(/\/+$/, '');
}

/**
 * @param {string} preservePath
 * @returns {string | null}
 */
function matchCoreManagedPreservePattern(preservePath) {
  const normalized = normalizePreservePath(preservePath);

  for (const { prefix, label } of CORE_MANAGED_PRESERVE_PATTERNS) {
    const directory = prefix.replace(/\/$/, '');

    if (normalized === directory || normalized.startsWith(prefix)) {
      return label;
    }
  }

  return null;
}

/**
 * @param {Set<string>} preservePaths
 * @returns {{ path: string, pattern: string }[]}
 */
function findCoreManagedPreserveEntries(preservePaths) {
  return [...preservePaths]
    .map((preservePath) => {
      const pattern = matchCoreManagedPreservePattern(preservePath);
      return pattern ? { path: preservePath, pattern } : null;
    })
    .filter((entry) => entry !== null)
    .sort((a, b) => a.path.localeCompare(b.path));
}

/**
 * @param {string} clientRoot
 * @returns {Set<string>}
 */
function loadPreservePaths(clientRoot) {
  const manifestPath = path.join(clientRoot, PRESERVE_MANIFEST);

  if (!fs.existsSync(manifestPath)) {
    return new Set();
  }

  return new Set(
    fs
      .readFileSync(manifestPath, 'utf8')
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith('#'))
      .map((line) => normalizePreservePath(line))
      .filter((line) => line)
  );
}

/**
 * @param {string} kitRoot
 * @param {string} clientRoot
 * @param {Set<string>} preservePaths
 */
export function buildFilePlan(kitRoot, clientRoot, preservePaths) {
  /** @type {{ add: string[], update: string[], remove: string[], preserve: string[], manualReview: string[] }} */
  const plan = { add: [], update: [], remove: [], preserve: [], manualReview: [] };

  for (const dir of UPGRADE_DIRS) {
    const kitFiles = collectFiles(path.join(kitRoot, dir), dir);
    const clientFiles = collectFiles(path.join(clientRoot, dir), dir);

    for (const [rel, kitHash] of kitFiles) {
      if (preservePaths.has(rel)) {
        if (clientFiles.has(rel) && clientFiles.get(rel) !== kitHash) {
          plan.preserve.push(rel);
        }

        continue;
      }

      if (!clientFiles.has(rel)) {
        plan.add.push(rel);
      } else if (clientFiles.get(rel) !== kitHash) {
        plan.update.push(rel);
      }
    }

    for (const rel of clientFiles.keys()) {
      if (preservePaths.has(rel)) {
        continue;
      }

      if (!kitFiles.has(rel)) {
        plan.remove.push(rel);
      }
    }
  }

  const kitViteConfig = path.join(kitRoot, VITE_CONFIG);
  const clientViteConfig = path.join(clientRoot, VITE_CONFIG);

  if (preservePaths.has(VITE_CONFIG)) {
    if (fs.existsSync(clientViteConfig) && hashFile(clientViteConfig) !== hashFile(kitViteConfig)) {
      plan.preserve.push(VITE_CONFIG);
    }
  } else if (!fs.existsSync(clientViteConfig)) {
    plan.add.push(VITE_CONFIG);
  } else {
    const clientHash = hashFile(clientViteConfig);

    if (clientHash !== hashFile(kitViteConfig)) {
      if (LEGACY_VITE_CONFIG_HASHES.has(clientHash)) {
        plan.update.push(VITE_CONFIG);
      } else {
        plan.manualReview.push(VITE_CONFIG);
      }
    }
  }

  plan.add.sort();
  plan.update.sort();
  plan.remove.sort();
  plan.preserve.sort();
  plan.manualReview.sort();
  return plan;
}

/**
 * @param {string} clientRoot
 * @param {string} kitRoot
 * @param {string | null} kitVersion
 * @returns {{ changed: boolean, kitPath: string, previousVersion: string | null }}
 */
export function buildMetadataPlan(clientRoot, kitRoot, kitVersion) {
  const kitPath = path.relative(clientRoot, kitRoot) || '.';
  let previousVersion = null;
  let previousKitPath = null;

  try {
    const manifest = JSON.parse(fs.readFileSync(path.join(clientRoot, UPGRADE_MANIFEST), 'utf8'));
    previousVersion = typeof manifest.kitVersion === 'string' ? manifest.kitVersion : null;
    previousKitPath = typeof manifest.kitPath === 'string' ? manifest.kitPath : null;
  } catch {
    // A missing or malformed manifest must be replaced by the next upgrade.
  }

  const pointer = fs.existsSync(path.join(clientRoot, SOURCE_POINTER))
    ? fs.readFileSync(path.join(clientRoot, SOURCE_POINTER), 'utf8').trim()
    : null;

  return {
    changed: previousVersion !== kitVersion || previousKitPath !== kitPath || pointer !== kitPath,
    kitPath,
    previousVersion
  };
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
 * @param {{ add: string[], update: string[], remove: string[], preserve: string[], manualReview: string[] }} filePlan
 * @param {{ key: string, from?: string, to: string }[]} scriptPlan
 * @param {{ changed: boolean, kitPath: string, previousVersion: string | null }} metadataPlan
 * @param {string} kitRoot
 * @param {string} clientRoot
 * @param {string | null} kitVersion
 * @param {{ path: string, pattern: string }[]} coreManagedPreserveEntries
 * @returns {boolean}
 */
export function printPlan(
  filePlan,
  scriptPlan,
  metadataPlan,
  kitRoot,
  clientRoot,
  kitVersion,
  coreManagedPreserveEntries
) {
  console.log('Atelier-Kit site upgrade');
  console.log(`Kit:    ${kitRoot}${kitVersion ? ` (${kitVersion})` : ''}`);
  console.log(`Client: ${clientRoot}`);
  console.log('');
  console.log('Protected (never touched): config/, content/, static/images/items/');
  console.log(`Preserved (skipped when listed in ${PRESERVE_MANIFEST}):`);
  console.log('');

  if (coreManagedPreserveEntries.length > 0) {
    console.warn(`WARNING: ${PRESERVE_MANIFEST} contains core-managed Atelier-Kit paths.`);
    console.warn('These entries can silently fork kit internals inside the client site.');
    console.warn('Move customization into config/, content/, static assets, or upstream Atelier-Kit features.');
    console.warn('Core-managed preserve entries:');

    for (const entry of coreManagedPreserveEntries) {
      console.warn(`  ! ${entry.path} (matches ${entry.pattern})`);
    }

    console.log('');
  }

  const total =
    filePlan.add.length + filePlan.update.length + filePlan.remove.length + scriptPlan.length +
    (metadataPlan.changed ? 1 : 0);

  if (total === 0 && filePlan.preserve.length === 0 && filePlan.manualReview.length === 0) {
    console.log('Already up to date.');
    return false;
  }

  if (total === 0 && (filePlan.preserve.length > 0 || filePlan.manualReview.length > 0)) {
    console.log('No automatic file updates. Client-owned files differ from kit:');
  }

  if (filePlan.preserve.length > 0) {
    console.log(`Preserve (${filePlan.preserve.length}):`);

    for (const rel of filePlan.preserve) {
      console.log(`  = ${rel}`);
    }
  }

  if (filePlan.manualReview.length > 0) {
    console.warn(`Keep customized (${filePlan.manualReview.length}):`);

    for (const rel of filePlan.manualReview) {
      console.warn(`  = ${rel} (customized or unrecognized; not overwritten)`);
    }

    console.warn(
      '  ! Review the current Kit vite.config.js and adopt the new Kit version resolver manually if needed.'
    );
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

  if (metadataPlan.changed) {
    console.log('Upgrade metadata (1):');
    console.log(`  ~ ${UPGRADE_MANIFEST}`);
    console.log(
      `      kitVersion: ${metadataPlan.previousVersion ?? '(missing)'} -> ${kitVersion ?? '(unknown)'}`
    );
    console.log(`      kitPath: ${metadataPlan.kitPath}`);
    console.log(`  ~ ${SOURCE_POINTER}`);
  }

  return true;
}

/**
 * @param {{ add: string[], update: string[], remove: string[] }} filePlan
 * @param {string} kitRoot
 * @param {string} clientRoot
 */
export function applyFilePlan(filePlan, kitRoot, clientRoot) {
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
export function writeManifest(clientRoot, kitRoot, kitVersion) {
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

export async function main() {
  /** @type {{ help?: true, from?: string, target?: string, yes?: boolean, dryRun?: boolean }} */
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
  const preservePaths = loadPreservePaths(clientRoot);
  const coreManagedPreserveEntries = findCoreManagedPreserveEntries(preservePaths);
  const filePlan = buildFilePlan(kitRoot, clientRoot, preservePaths);
  const scriptPlan = buildScriptPlan(kitRoot, clientRoot);
  const metadataPlan = buildMetadataPlan(clientRoot, kitRoot, kitVersion);
  const hasChanges = printPlan(
    filePlan,
    scriptPlan,
    metadataPlan,
    kitRoot,
    clientRoot,
    kitVersion,
    coreManagedPreserveEntries
  );

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

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(`ERROR: ${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
  });
}
