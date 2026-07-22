#!/usr/bin/env node

import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import readline from 'node:readline/promises';
import { pathToFileURL } from 'node:url';
import { detectKitVersion, normalizeKitVersion, readTrackedKitVersion } from './kit-version.js';

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
const VERSION_FILE = '.atelier-kit-version';
const PRESERVE_MANIFEST = '.atelier-kit-preserve';
const UI_COMPONENTS_PACKAGE = 'giadaware-ui-components';
const UI_COMPONENTS_DEPENDENCY =
  'file:vendor/giadaware-ui-components/93a7d0c/giadaware-ui-components-0.0.0.tgz';
const UI_COMPONENTS_ARTIFACT =
  'vendor/giadaware-ui-components/93a7d0c/giadaware-ui-components-0.0.0.tgz';
const UI_COMPONENTS_ARTIFACT_SHA256 =
  '92628cefe39c80b72416edbc9cd7d9d29a87dc8817d52488cd0a8f8a563f1714';
const UI_COMPONENTS_IDENTITY =
  'vendor/giadaware-ui-components/93a7d0c/integration.json';
const UI_COMPONENTS_INTEGRATION_FILES = [
  UI_COMPONENTS_ARTIFACT,
  UI_COMPONENTS_IDENTITY
];
const PORTABLE_TEST_COMMAND = 'node scripts/run-tests.js';
export const HISTORICAL_TEST_COMMANDS = new Set([
  'node --test src/lib/site-branding.test.js',
  'node --test src/lib/editorial-markup.test.js',
  'node --test src/lib/editorial-markup.test.js src/lib/site-branding.test.js',
  'node --test src/lib/editorial-markup.test.js src/lib/item-images.test.js src/lib/site-branding.test.js',
  'node --test src/lib/editorial-markup.test.js src/lib/item-images.test.js src/lib/studio-item-gallery.test.js src/lib/site-branding.test.js',
  'node --test src/lib/editorial-markup.test.js src/lib/item-images.test.js src/lib/studio-item-gallery.test.js src/lib/site-branding.test.js src/lib/studio-signal-clouds.test.js src/lib/signal-cloud-faq.test.js',
  'node --test src/lib/editorial-markup.test.js src/lib/item-images.test.js src/lib/studio-item-gallery.test.js src/lib/site-branding.test.js src/lib/studio-signal-clouds.test.js src/lib/signal-cloud-faq.test.js test/*.test.js',
  'node --test src/lib/about-config.test.js src/lib/editorial-markup.test.js src/lib/item-images.test.js src/lib/studio-item-gallery.test.js src/lib/site-branding.test.js src/lib/studio-signal-clouds.test.js src/lib/signal-cloud-faq.test.js test/*.test.js',
  'node --test src/lib/about-config.test.js src/lib/editorial-markup.test.js src/lib/item-images.test.js src/lib/studio-item-gallery.test.js src/lib/site-branding.test.js src/lib/studio-signal-clouds.test.js src/lib/signal-cloud-faq.test.js src/lib/layout-block-labels.test.js test/*.test.js',
  'node --test src/lib/about-config.test.js src/lib/editorial-markup.test.js src/lib/item-images.test.js src/lib/studio-item-gallery.test.js src/lib/site-branding.test.js src/lib/studio-signal-clouds.test.js src/lib/signal-cloud-faq.test.js src/lib/layout-block-labels.test.js src/lib/social-networks.test.js test/*.test.js',
  'node --test src/lib/about-config.test.js src/lib/editorial-markup.test.js src/lib/marked-text.test.js src/lib/item-images.test.js src/lib/studio-item-gallery.test.js src/lib/site-branding.test.js src/lib/studio-signal-clouds.test.js src/lib/signal-cloud-faq.test.js src/lib/layout-block-labels.test.js src/lib/social-networks.test.js test/*.test.js'
]);

/** @param {unknown} command */
export function isHistoricalTestCommand(command) {
  return typeof command === 'string' && HISTORICAL_TEST_COMMANDS.has(command.trim().replace(/\s+/g, ' '));
}
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
  Writes ${SOURCE_POINTER}, ${VERSION_FILE} and ${UPGRADE_MANIFEST} in the client folder.`);
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
 * Anchor a client-relative path and prove every existing component with lstat.
 * Missing trailing components are allowed only below an already-proven real
 * directory. No operation may use an absolute path, escape the lexical root,
 * or traverse a symbolic link.
 * @param {string} clientRoot
 * @param {string} relativePath
 * @param {{ finalType?: 'file' | 'directory' | 'any', allowMissing?: boolean }} [options]
 */
export function validateClientPath(clientRoot, relativePath, options = {}) {
  const { finalType = 'any', allowMissing = true } = options;
  if (typeof relativePath !== 'string' || relativePath === '' || relativePath.includes('\0') ||
      path.isAbsolute(relativePath)) throw new Error(`Unsafe client path: ${JSON.stringify(relativePath)}`);
  const root = path.resolve(clientRoot);
  const absolute = path.resolve(root, relativePath);
  const lexical = path.relative(root, absolute);
  if (lexical === '..' || lexical.startsWith(`..${path.sep}`) || path.isAbsolute(lexical)) {
    throw new Error(`Client path escapes its root: ${relativePath}`);
  }
  const rootStat = fs.lstatSync(root);
  if (!rootStat.isDirectory() || rootStat.isSymbolicLink()) {
    throw new Error(`Client root must be a real directory: ${root}`);
  }
  const parts = lexical === '' ? [] : lexical.split(path.sep);
  let current = root;
  let missing = false;
  for (let index = 0; index < parts.length; index += 1) {
    current = path.join(current, parts[index]);
    if (missing) continue;
    let stat;
    try { stat = fs.lstatSync(current); } catch (error) {
      if (/** @type {NodeJS.ErrnoException} */ (error).code === 'ENOENT' && allowMissing) { missing = true; continue; }
      throw error;
    }
    if (stat.isSymbolicLink()) throw new Error(`Unsafe symbolic link in client path: ${path.relative(root, current)}`);
    const final = index === parts.length - 1;
    if (!final && !stat.isDirectory()) throw new Error(`Non-directory client path component: ${path.relative(root, current)}`);
    if (final && finalType === 'file' && !stat.isFile()) throw new Error(`Client path must be a regular file: ${relativePath}`);
    if (final && finalType === 'directory' && !stat.isDirectory()) throw new Error(`Client path must be a directory: ${relativePath}`);
  }
  if (missing && !allowMissing) throw new Error(`Missing client path: ${relativePath}`);
  return absolute;
}

/** Reject every symlink reachable in a tree without ever following one. @param {string} root @param {string} label */
function validateTreeNoSymlinks(root, label) {
  const rootStat = fs.lstatSync(root);
  if (!rootStat.isDirectory() || rootStat.isSymbolicLink()) throw new Error(`${label} root must be a real directory: ${root}`);
  /** @param {string} directory */
  const walk = (directory) => {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      const candidate = path.join(directory, entry.name);
      const stat = fs.lstatSync(candidate);
      if (stat.isSymbolicLink()) throw new Error(`Unsafe symbolic link in ${label}: ${path.relative(root, candidate)}`);
      if (stat.isDirectory()) walk(candidate);
    }
  };
  walk(root);
}

/**
 * Hash the bytes read from one read-only descriptor. O_NOFOLLOW closes the
 * pathname replacement race on platforms that provide it. On platforms that
 * do not, matching pre/post lstat and fstat identities is the strongest Node
 * sequence available, but a hostile same-inode replacement remains a residual
 * platform race.
 * @param {string} filePath
 * @param {{ afterPathValidated?: (filePath: string) => void, open?: typeof fs.openSync, fstat?: typeof fs.fstatSync, read?: typeof fs.readSync, close?: typeof fs.closeSync }} [hooks]
 */
export function hashRegularFileNoFollow(filePath, hooks = {}) {
  const before = fs.lstatSync(filePath);
  if (!before.isFile() || before.isSymbolicLink()) throw new Error(`Provenance path is not a regular file: ${filePath}`);
  hooks.afterPathValidated?.(filePath);
  const noFollow = typeof fs.constants.O_NOFOLLOW === 'number' ? fs.constants.O_NOFOLLOW : 0;
  const open = hooks.open || fs.openSync;
  const close = hooks.close || fs.closeSync;
  const descriptor = open(filePath, fs.constants.O_RDONLY | noFollow);
  try {
    const stat = (hooks.fstat || fs.fstatSync)(descriptor);
    if (!stat.isFile()) throw new Error(`Provenance descriptor is not a regular file: ${filePath}`);
    if (stat.dev !== before.dev || stat.ino !== before.ino) throw new Error(`Provenance path changed before open: ${filePath}`);
    const hash = crypto.createHash('sha256');
    const buffer = Buffer.allocUnsafe(64 * 1024);
    let bytesRead;
    do {
      bytesRead = (hooks.read || fs.readSync)(descriptor, buffer, 0, buffer.length, null);
      if (bytesRead > 0) hash.update(buffer.subarray(0, bytesRead));
    } while (bytesRead > 0);
    if (!noFollow) {
      const after = fs.lstatSync(filePath);
      if (!after.isFile() || after.isSymbolicLink() || after.dev !== stat.dev || after.ino !== stat.ino) {
        throw new Error(`Provenance path changed while hashing: ${filePath}`);
      }
    }
    return hash.digest('hex');
  } finally {
    close(descriptor);
  }
}

/** @param {string} value @param {string} other */
function compareCodeUnits(value, other) {
  return value < other ? -1 : value > other ? 1 : 0;
}

/** @param {string} value */
function normalizePath(value) {
  return value.replaceAll('\\', '/');
}

const MANAGED_TEST_ROOTS = ['src/lib/', 'src/routes/'];
const SHA256_PATTERN = /^[0-9a-f]{64}$/;

/** Strict identity shared by manifest loading and writing. */
/** @param {unknown} value @returns {string | null} */
export function canonicalManagedTestPath(value) {
  if (typeof value !== 'string' || value === '' || value.includes('\0')) return null;
  const slashed = value.replaceAll('\\', '/');
  if (slashed.startsWith('/') || slashed.startsWith('//') || /^[A-Za-z]:/.test(slashed)) return null;
  const parts = slashed.split('/').filter((part) => part !== '' && part !== '.');
  if (parts.length === 0 || parts.includes('..')) return null;
  const canonical = parts.join('/');
  if (!canonical.endsWith('.test.js') || !MANAGED_TEST_ROOTS.some((root) => canonical.startsWith(root))) return null;
  return canonical;
}

/** @param {string} clientRoot */
export function loadManagedTestBaseline(clientRoot, report = console.warn) {
  try {
    const manifest = JSON.parse(fs.readFileSync(path.join(clientRoot, UPGRADE_MANIFEST), 'utf8'));
    if (!manifest.managedTests || typeof manifest.managedTests !== 'object') return new Map();
    const result = new Map();
    const rejected = new Set();
    for (const [raw, hash] of Object.entries(manifest.managedTests)) {
      const rel = canonicalManagedTestPath(raw);
      if (!rel || typeof hash !== 'string' || !SHA256_PATTERN.test(hash)) {
        report(`Ignoring malformed managed-test baseline: ${JSON.stringify(raw)}`);
        continue;
      }
      if (rejected.has(rel)) continue;
      if (result.has(rel) && result.get(rel) !== hash) {
        report(`Ignoring conflicting duplicate managed-test baseline: ${rel}`);
        result.delete(rel);
        rejected.add(rel);
        continue;
      }
      result.set(rel, hash);
    }
    return result;
  } catch {
    return new Map();
  }
}

/** @param {string} kitRoot */
function collectManagedTests(kitRoot) {
  const tests = new Map();
  for (const dir of UPGRADE_DIRS) {
    for (const [rel, hash] of collectFiles(path.join(kitRoot, dir), dir)) {
      if (rel.endsWith('.test.js')) tests.set(normalizePath(rel), hash);
    }
  }
  return tests;
}

/**
 * Derive provenance from the completed client tree. A Kit identity is granted
 * only when the final client path is a regular, non-symlink file whose exact
 * bytes still match the current Kit source.
 * @param {string} clientRoot
 * @param {string} kitRoot
 */
export function deriveManagedTestsFromClient(clientRoot, kitRoot, hashHooks = {}) {
  /** @type {Record<string, string>} */
  const managedTests = Object.create(null);
  for (const [raw, kitHash] of collectManagedTests(kitRoot)) {
    const rel = canonicalManagedTestPath(raw);
    if (!rel || !SHA256_PATTERN.test(kitHash)) continue;
    const target = validateClientPath(clientRoot, rel, { allowMissing: true });
    let stat;
    try {
      stat = fs.lstatSync(target);
    } catch (error) {
      if (/** @type {NodeJS.ErrnoException} */ (error).code === 'ENOENT') continue;
      throw error;
    }
    if (!stat.isFile() || stat.isSymbolicLink()) continue;
    if (hashRegularFileNoFollow(target, hashHooks) === kitHash) managedTests[rel] = kitHash;
  }
  return Object.fromEntries(
    Object.entries(managedTests).sort(([a], [b]) => compareCodeUnits(a, b))
  );
}

/**
 * @param {string} filePath
 * @param {(filePath: string) => Buffer} readFile
 */
function hashIntegrationFile(filePath, readFile) {
  const buffer = readFile(filePath);
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
      const candidate = path.join(absDir, entry.name);
      const stat = fs.lstatSync(candidate);
      if (stat.isSymbolicLink()) throw new Error(`Managed source path may not be a symbolic link: ${relPrefix}/${entry.name}`);
      if (entry.isDirectory()) {
        if (SKIP_DIR_NAMES.has(entry.name)) {
          continue;
        }

        walk(candidate, `${relPrefix}/${entry.name}`);
        continue;
      }

      if (entry.isFile()) {
        const rel = `${relPrefix}/${entry.name}`;
        files.set(rel, hashRegularFileNoFollow(candidate));
      }
    }
  }

  walk(rootDir, prefix);
  return files;
}

/** Preflight every client namespace the upgrader can inspect or mutate. @param {string} clientRoot @param {Set<string>} [preservePaths] */
function validateUpgradePaths(clientRoot, preservePaths = new Set()) {
  const fixed = [
    'config/site.yaml', 'package.json', VITE_CONFIG, SOURCE_POINTER, VERSION_FILE, UPGRADE_MANIFEST,
    PRESERVE_MANIFEST, ...UI_COMPONENTS_INTEGRATION_FILES
  ];
  for (const rel of fixed) validateClientPath(clientRoot, rel, { allowMissing: true });
  for (const rel of ['src', 'scripts', 'vendor', 'config', 'content', 'static']) {
    const absolute = validateClientPath(clientRoot, rel, { allowMissing: true });
    if (fs.existsSync(absolute)) validateTreeNoSymlinks(absolute, `client ${rel}`);
  }
  for (const rel of preservePaths) validateClientPath(clientRoot, rel, { allowMissing: true });
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
    .sort((a, b) => compareCodeUnits(normalizePath(a.path), normalizePath(b.path)));
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
  const managedTestBaseline = loadManagedTestBaseline(clientRoot);

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
        if (!rel.endsWith('.test.js') || managedTestBaseline.get(rel) === clientFiles.get(rel)) {
          plan.update.push(rel);
        } else {
          plan.manualReview.push(rel);
        }
      }
    }

    for (const rel of clientFiles.keys()) {
      if (preservePaths.has(rel)) {
        continue;
      }

      if (!kitFiles.has(rel)) {
        if (!rel.endsWith('.test.js')) {
          plan.remove.push(rel);
        } else if (managedTestBaseline.get(rel) === clientFiles.get(rel)) {
          plan.remove.push(rel);
        } else if (managedTestBaseline.has(rel)) {
          plan.manualReview.push(rel);
        }
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

  for (const values of Object.values(plan)) values.sort((a, b) => compareCodeUnits(normalizePath(a), normalizePath(b)));
  return plan;
}

/**
 * @param {string} clientRoot
 * @param {string} kitRoot
 * @param {string | null} kitVersion
 * @returns {{ changed: boolean, kitPath: string, previousVersion: string | null, previousTrackedVersion: string | null }}
 */
export function buildMetadataPlan(clientRoot, kitRoot, kitVersion, filePlan = buildFilePlan(kitRoot, clientRoot, new Set())) {
  const kitPath = path.relative(clientRoot, kitRoot) || '.';
  let previousVersion = null;
  let previousKitPath = null;
  let previousManagedTests = {};
  let previousTrackedVersion = null;

  try {
    const manifest = JSON.parse(fs.readFileSync(path.join(clientRoot, UPGRADE_MANIFEST), 'utf8'));
    previousVersion = typeof manifest.kitVersion === 'string' ? manifest.kitVersion : null;
    previousKitPath = typeof manifest.kitPath === 'string' ? manifest.kitPath : null;
    previousManagedTests = Object.fromEntries(loadManagedTestBaseline(clientRoot, () => {}));
  } catch {
    // A missing or malformed manifest must be replaced by the next upgrade.
  }

  const pointer = fs.existsSync(path.join(clientRoot, SOURCE_POINTER))
    ? fs.readFileSync(path.join(clientRoot, SOURCE_POINTER), 'utf8').trim()
    : null;
  try {
    previousTrackedVersion = readTrackedKitVersion(fs.readFileSync(path.join(clientRoot, VERSION_FILE), 'utf8')) || null;
  } catch {
    // A missing or malformed tracked version file must be replaced by the next upgrade.
  }

  const currentManagedTests = deriveManagedTestsFromClient(clientRoot, kitRoot);
  return {
    changed: previousVersion !== kitVersion || previousTrackedVersion !== kitVersion || previousKitPath !== kitPath || pointer !== kitPath ||
      JSON.stringify(previousManagedTests) !== JSON.stringify(currentManagedTests) ||
      [...filePlan.add, ...filePlan.update, ...filePlan.remove].some((rel) => rel.endsWith('.test.js')),
    kitPath,
    previousVersion,
    previousTrackedVersion
  };
}

/**
 * @param {string} kitRoot
 * @param {string} clientRoot
 * @returns {{ key: string, from?: string, to: string, preserve?: boolean }[]}
 */
function buildScriptPlan(kitRoot, clientRoot, packageJsonPreserved = false) {
  if (packageJsonPreserved) return [];
  const kitPkg = JSON.parse(fs.readFileSync(path.join(kitRoot, 'package.json'), 'utf8'));
  const clientPkg = JSON.parse(fs.readFileSync(path.join(clientRoot, 'package.json'), 'utf8'));
  /** @type {{ key: string, from?: string, to: string, preserve?: boolean }[]} */
  const changes = [];

  for (const [key, value] of Object.entries(kitPkg.scripts || {})) {
    const current = clientPkg.scripts?.[key];
    if (key === 'test:kit') continue;
    if (key === 'test') {
      const historical = isHistoricalTestCommand(current);
      if (current === undefined || historical) {
        if (current !== PORTABLE_TEST_COMMAND) changes.push({ key, from: current, to: PORTABLE_TEST_COMMAND });
      } else if (current !== PORTABLE_TEST_COMMAND) {
        changes.push({ key, from: current, to: current, preserve: true });
      }
    } else if (current !== value) {
      changes.push({ key, from: current, to: value });
    }
  }

  return changes;
}

/**
 * @param {string} kitRoot
 * @param {string} clientRoot
 * @returns {{ changed: boolean, from?: string, to: string }}
 */
export function buildUiComponentsDependencyPlan(kitRoot, clientRoot) {
  const kitPkg = JSON.parse(fs.readFileSync(path.join(kitRoot, 'package.json'), 'utf8'));
  const clientPkg = JSON.parse(fs.readFileSync(path.join(clientRoot, 'package.json'), 'utf8'));
  const required = kitPkg.dependencies?.[UI_COMPONENTS_PACKAGE];

  if (required !== UI_COMPONENTS_DEPENDENCY) {
    throw new Error(`Atelier-Kit must declare ${UI_COMPONENTS_PACKAGE} as ${UI_COMPONENTS_DEPENDENCY}`);
  }

  const current = clientPkg.dependencies?.[UI_COMPONENTS_PACKAGE];
  return { changed: current !== required, from: current, to: required };
}

/**
 * Complete the issue #169 integration preflight before any target mutation.
 * Preserved identity files are usable only when they are already exact.
 *
 * @param {string} kitRoot
 * @param {string} clientRoot
 * @param {Set<string>} preservePaths
 * @param {{ readPreservedFile?: (filePath: string) => Buffer }} [validation]
 * @returns {{ dependency: { changed: boolean, from?: string, to: string }, artifactChanged: boolean, identityChanged: boolean, packageJsonPreserved: boolean }}
 */
export function buildUiComponentsIntegrationPlan(
  kitRoot,
  clientRoot,
  preservePaths,
  validation = {}
) {
  const kitArtifact = path.join(kitRoot, UI_COMPONENTS_ARTIFACT);

  if (!fs.existsSync(kitArtifact) || hashFile(kitArtifact) !== UI_COMPONENTS_ARTIFACT_SHA256) {
    throw new Error(
      `Issue #169 source artifact is missing or has the wrong SHA-256: ${UI_COMPONENTS_ARTIFACT}`
    );
  }

  const kitIdentity = path.join(kitRoot, UI_COMPONENTS_IDENTITY);
  let identity;
  try {
    identity = JSON.parse(fs.readFileSync(kitIdentity, 'utf8'));
  } catch {
    throw new Error(`Issue #169 source identity is missing or invalid: ${UI_COMPONENTS_IDENTITY}`);
  }
  if (
    identity.package !== UI_COMPONENTS_PACKAGE ||
    identity.version !== '0.0.0' ||
    identity.sourceCommit !== '93a7d0c370b757f5a4a37436e0722bb4522e6837' ||
    identity.filename !== path.basename(UI_COMPONENTS_ARTIFACT) ||
    identity.sha256 !== UI_COMPONENTS_ARTIFACT_SHA256
  ) {
    throw new Error(`Issue #169 source identity does not describe the immutable artifact: ${UI_COMPONENTS_IDENTITY}`);
  }

  for (const rel of UI_COMPONENTS_INTEGRATION_FILES) {
    const clientFile = path.join(clientRoot, rel);

    if (preservePaths.has(rel)) {
      const expectedState = rel === UI_COMPONENTS_ARTIFACT
        ? `Required state: a readable regular file that exactly matches the Atelier-Kit copy; required SHA-256: ${UI_COMPONENTS_ARTIFACT_SHA256}.`
        : 'Required state: a readable regular file that exactly matches the Atelier-Kit copy, including the exact integration identity/content.';
      /** @param {string} problem @param {unknown} [cause] */
      const preserveError = (problem, cause) => new Error(
        `${PRESERVE_MANIFEST} preserves required issue #169 file ${rel}, but ${problem}. ` +
          `${expectedState} Remove or adjust the ${PRESERVE_MANIFEST} rule, or restore the exact required file before retrying.`,
        cause === undefined ? undefined : { cause }
      );
      let clientHash;

      try {
        if (!fs.statSync(clientFile).isFile()) {
          throw new Error('the preserved path is not a regular file');
        }
        clientHash = hashIntegrationFile(
          clientFile,
          validation.readPreservedFile || fs.readFileSync
        );
      } catch (error) {
        throw preserveError('the client file is missing, unreadable, or not a regular file', error);
      }

      if (clientHash !== hashFile(path.join(kitRoot, rel))) {
        throw preserveError('its contents do not exactly match the Atelier-Kit copy');
      }
    }
  }

  const clientArtifact = path.join(clientRoot, UI_COMPONENTS_ARTIFACT);
  const clientIdentity = path.join(clientRoot, UI_COMPONENTS_IDENTITY);
  const artifactChanged =
    !fs.existsSync(clientArtifact) || hashFile(clientArtifact) !== UI_COMPONENTS_ARTIFACT_SHA256;
  const identityChanged =
    !fs.existsSync(clientIdentity) || hashFile(clientIdentity) !== hashFile(kitIdentity);
  const packageJsonPreserved = preservePaths.has('package.json');
  let dependency;
  try {
    dependency = buildUiComponentsDependencyPlan(kitRoot, clientRoot);
  } catch (error) {
    if (packageJsonPreserved) {
      throw new Error(
        `${PRESERVE_MANIFEST} preserves package.json, but its ${UI_COMPONENTS_PACKAGE} dependency cannot be validated. ` +
          `Expected ${JSON.stringify(UI_COMPONENTS_DEPENDENCY)}. Remove the package.json preserve rule to allow migration, ` +
          `or repair package.json and set the dependency to the expected value before upgrading. ` +
          `(${error instanceof Error ? error.message : String(error)})`
      );
    }
    throw error;
  }

  if (packageJsonPreserved && dependency.changed) {
    const actual = dependency.from === undefined ? '(missing)' : JSON.stringify(dependency.from);
    throw new Error(
      `${PRESERVE_MANIFEST} preserves package.json, but dependencies.${UI_COMPONENTS_PACKAGE} is ${actual}. ` +
        `Expected ${JSON.stringify(UI_COMPONENTS_DEPENDENCY)}. Remove the package.json preserve rule to allow migration, ` +
        `or set the dependency to the expected value before upgrading.`
    );
  }

  return { dependency, artifactChanged, identityChanged, packageJsonPreserved };
}

let atomicWriteCounter = 0;

/** @param {string} target */
function temporarySibling(target) {
  atomicWriteCounter += 1;
  return path.join(path.dirname(target), `.${path.basename(target)}.issue-169-${process.pid}-${atomicWriteCounter}.tmp`);
}

/**
 * Atomically replace a client file without following the final pathname.
 * @param {string} clientRoot
 * @param {string} relativePath
 * @param {string} contents
 */
function atomicWriteClientFile(clientRoot, relativePath, contents) {
  const target = validateClientPath(clientRoot, relativePath, { allowMissing: true });
  const targetMode = fs.existsSync(target) ? fs.lstatSync(target).mode & 0o7777 : 0o644;
  const temporary = temporarySibling(target);
  const temporaryRelative = path.relative(clientRoot, temporary);
  validateClientPath(clientRoot, temporaryRelative, { allowMissing: true });
  const noFollow = fs.constants.O_NOFOLLOW || 0;
  let descriptor;
  let created = false;
  try {
    descriptor = fs.openSync(
      temporary,
      fs.constants.O_WRONLY | fs.constants.O_CREAT | fs.constants.O_EXCL | noFollow,
      targetMode
    );
    created = true;
    if (fs.existsSync(target)) fs.fchmodSync(descriptor, targetMode);
    fs.writeFileSync(descriptor, contents);
    fs.closeSync(descriptor);
    descriptor = undefined;
    validateClientPath(clientRoot, relativePath, { allowMissing: true });
    fs.renameSync(temporary, target);
    created = false;
  } finally {
    try {
      if (descriptor !== undefined) fs.closeSync(descriptor);
    } finally {
      if (created) fs.rmSync(temporary, { force: true });
    }
  }
}

/**
 * Apply only the giadaware-ui-components issue-169 transaction. The optional
 * hooks exist solely for deterministic failure-injection tests.
 *
 * @param {{ dependency: { changed: boolean }, artifactChanged: boolean, identityChanged: boolean }} plan
 * @param {string} kitRoot
 * @param {string} clientRoot
 * @param {{ key: string, to: string, preserve?: boolean }[]} scriptPlan
 * @param {{ writeArtifactTemp?: (source: string, temporary: string) => void, afterArtifactInstalled?: () => void, writePackageTemp?: (temporary: string, contents: string) => void, beforePackageRename?: () => void }} [hooks]
 * @returns {{ dependencyChanged: boolean, artifactChanged: boolean }}
 */
export function applyUiComponentsIntegrationPlan(
  plan,
  kitRoot,
  clientRoot,
  scriptPlan = [],
  hooks = {}
) {
  const artifactTarget = path.join(clientRoot, UI_COMPONENTS_ARTIFACT);
  const identityTarget = path.join(clientRoot, UI_COMPONENTS_IDENTITY);
  const packageTarget = path.join(clientRoot, 'package.json');
  /** @param {string} target */
  const capture = (target) => fs.existsSync(target)
    ? { bytes: fs.readFileSync(target), mode: fs.statSync(target).mode }
    : null;
  const previousArtifact = capture(artifactTarget);
  const previousIdentity = capture(identityTarget);
  const integrationParents = [...new Set([
    path.dirname(artifactTarget), path.dirname(identityTarget),
    path.dirname(path.dirname(artifactTarget)), path.dirname(path.dirname(path.dirname(artifactTarget)))
  ])].map((directory) => ({ directory, existed: fs.existsSync(directory) }));
  /** @type {string[]} */
  const temporaryFiles = [];

  /** @param {string} target @param {{ bytes: Buffer, mode: number } | null} previous */
  const restore = (target, previous) => {
    if (previous === null) {
      fs.rmSync(target, { force: true });
      return;
    }
    fs.mkdirSync(path.dirname(target), { recursive: true });
    const temporary = temporarySibling(target);
    fs.writeFileSync(temporary, previous.bytes);
    fs.renameSync(temporary, target);
    fs.chmodSync(target, previous.mode);
  };

  try {
    if (plan.artifactChanged) {
      fs.mkdirSync(path.dirname(artifactTarget), { recursive: true });
      const temporary = temporarySibling(artifactTarget);
      temporaryFiles.push(temporary);
      (hooks.writeArtifactTemp || fs.copyFileSync)(path.join(kitRoot, UI_COMPONENTS_ARTIFACT), temporary);
      if (hashFile(temporary) !== UI_COMPONENTS_ARTIFACT_SHA256) {
        throw new Error(`Issue #169 temporary artifact has the wrong SHA-256: ${UI_COMPONENTS_ARTIFACT}`);
      }
      fs.renameSync(temporary, artifactTarget);
      if (hashFile(artifactTarget) !== UI_COMPONENTS_ARTIFACT_SHA256) {
        throw new Error(`Issue #169 installed artifact failed SHA-256 verification: ${UI_COMPONENTS_ARTIFACT}`);
      }
      hooks.afterArtifactInstalled?.();
    }

    if (plan.identityChanged) {
      fs.mkdirSync(path.dirname(identityTarget), { recursive: true });
      const temporary = temporarySibling(identityTarget);
      temporaryFiles.push(temporary);
      fs.copyFileSync(path.join(kitRoot, UI_COMPONENTS_IDENTITY), temporary);
      if (hashFile(temporary) !== hashFile(path.join(kitRoot, UI_COMPONENTS_IDENTITY))) {
        throw new Error(`Issue #169 temporary identity verification failed: ${UI_COMPONENTS_IDENTITY}`);
      }
      fs.renameSync(temporary, identityTarget);
    }

    if (plan.dependency.changed || scriptPlan.length > 0) {
      if (!fs.existsSync(artifactTarget) || hashFile(artifactTarget) !== UI_COMPONENTS_ARTIFACT_SHA256) {
        throw new Error(`Issue #169 refuses to migrate package.json without the verified artifact.`);
      }
      const packageJson = JSON.parse(fs.readFileSync(packageTarget, 'utf8'));
      packageJson.dependencies = packageJson.dependencies || {};
      packageJson.dependencies[UI_COMPONENTS_PACKAGE] = UI_COMPONENTS_DEPENDENCY;
      packageJson.scripts = packageJson.scripts || {};
      for (const { key, to, preserve } of scriptPlan) if (!preserve) packageJson.scripts[key] = to;
      const contents = `${JSON.stringify(packageJson, null, 2)}\n`;
      const temporary = temporarySibling(packageTarget);
      temporaryFiles.push(temporary);
      (hooks.writePackageTemp || ((file, value) => fs.writeFileSync(file, value)))(temporary, contents);
      hooks.beforePackageRename?.();
      fs.renameSync(temporary, packageTarget);
    }

    return { dependencyChanged: plan.dependency.changed, artifactChanged: plan.artifactChanged };
  } catch (error) {
    for (const temporary of temporaryFiles) fs.rmSync(temporary, { force: true });
    if (plan.identityChanged) restore(identityTarget, previousIdentity);
    if (plan.artifactChanged) restore(artifactTarget, previousArtifact);
    for (const { directory, existed } of integrationParents) {
      if (!existed) fs.rmSync(directory, { recursive: true, force: true });
    }
    throw error;
  }
}

/**
 * @param {{ add: string[], update: string[], remove: string[], preserve: string[], manualReview: string[] }} filePlan
 * @param {{ key: string, from?: string, to: string, preserve?: boolean }[]} scriptPlan
 * @param {{ changed: boolean, from?: string, to: string, artifactChanged: boolean, identityChanged: boolean }} dependencyPlan
 * @param {{ changed: boolean, kitPath: string, previousVersion: string | null, previousTrackedVersion: string | null }} metadataPlan
 * @param {string} kitRoot
 * @param {string} clientRoot
 * @param {string | null} kitVersion
 * @param {{ path: string, pattern: string }[]} coreManagedPreserveEntries
 * @returns {boolean}
 */
export function printPlan(
  filePlan,
  scriptPlan,
  dependencyPlan,
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
    filePlan.add.length + filePlan.update.length + filePlan.remove.length + scriptPlan.filter((entry) => !entry.preserve).length +
    (dependencyPlan.changed ? 1 : 0) +
    (dependencyPlan.artifactChanged ? 1 : 0) +
    (dependencyPlan.identityChanged ? 1 : 0) +
    (metadataPlan.changed ? 1 : 0);

  const preservedScripts = scriptPlan.filter((entry) => entry.preserve);
  if (total === 0 && filePlan.preserve.length === 0 && filePlan.manualReview.length === 0 && preservedScripts.length === 0) {
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
      const detail = rel.endsWith('.test.js')
        ? 'client test differs from the recorded managed baseline; preserved, not overwritten or deleted'
        : 'customized or unrecognized; not overwritten';
      console.warn(`  = ${rel} (${detail})`);
    }

    if (filePlan.manualReview.includes(VITE_CONFIG)) {
      console.warn(
        '  ! Review the current Kit vite.config.js and adopt the new Kit version resolver manually if needed.'
      );
    }
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

    for (const { key, from, to, preserve } of scriptPlan) {
      if (preserve) {
        console.warn(`  = scripts.${key} (custom command preserved): ${from}`);
        continue;
      }
      console.log(`  ~ scripts.${key}`);

      if (from) {
        console.log(`      was: ${from}`);
      }

      console.log(`      now: ${to}`);
    }
  }

  if (dependencyPlan.changed) {
    console.log('package.json dependency (1):');
    console.log(`  ~ dependencies.${UI_COMPONENTS_PACKAGE}`);
    if (dependencyPlan.from) console.log(`      was: ${dependencyPlan.from}`);
    console.log(`      now: ${dependencyPlan.to}`);
  }

  if (dependencyPlan.artifactChanged) {
    console.log('Issue #169 immutable artifact (1):');
    console.log(`  ~ ${UI_COMPONENTS_ARTIFACT}`);
  }

  if (dependencyPlan.identityChanged) {
    console.log('Issue #169 integration identity (1):');
    console.log(`  ~ ${UI_COMPONENTS_IDENTITY}`);
  }

  if (metadataPlan.changed) {
    console.log('Upgrade metadata (1):');
    console.log(`  ~ ${UPGRADE_MANIFEST}`);
    console.log(
      `      kitVersion: ${metadataPlan.previousVersion ?? '(missing)'} -> ${kitVersion ?? '(unknown)'}`
    );
    console.log(`      kitPath: ${metadataPlan.kitPath}`);
    console.log(`  ~ ${SOURCE_POINTER}`);
    console.log(`  ~ ${VERSION_FILE}`);
    console.log(
      `      version: ${metadataPlan.previousTrackedVersion ?? '(missing)'} -> ${kitVersion ?? '(unknown)'}`
    );
  }

  return total > 0;
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
 * Write upgrade metadata. Despite its historical name, writeMetadata is a
 * deterministic pre-final-boundary test hook; it never writes the manifest.
 * @param {string} clientRoot
 * @param {string} kitRoot
 * @param {string | null} kitVersion
 * @param {(() => Record<string, string>) | null} [deriveFinalProvenance]
 * @param {{ writePointer?: Function, beforeFinalProvenance?: Function, writeMetadata?: Function, afterVersionWritten?: Function }} [hooks]
 */
export function writeManifest(clientRoot, kitRoot, kitVersion, deriveFinalProvenance = null, hooks = {}) {
  const relativeKit = path.relative(clientRoot, kitRoot) || '.';
  const pointer = validateClientPath(clientRoot, SOURCE_POINTER, { allowMissing: true });
  if (hooks.writePointer) hooks.writePointer(pointer, `${relativeKit}\n`);
  else fs.writeFileSync(pointer, `${relativeKit}\n`);

  const trackedVersion = normalizeKitVersion(kitVersion);
  if (trackedVersion) {
    atomicWriteClientFile(clientRoot, VERSION_FILE, `${trackedVersion}\n`);
    hooks.afterVersionWritten?.();
  }

  validateClientPath(clientRoot, UPGRADE_MANIFEST, { allowMissing: true });
  // Historical name: this is a deterministic failure/mutation hook before the
  // final provenance boundary, not the metadata writer.
  hooks.writeMetadata?.();
  validateClientPath(clientRoot, UPGRADE_MANIFEST, { allowMissing: true });
  hooks.beforeFinalProvenance?.();
  validateClientPath(clientRoot, UPGRADE_MANIFEST, { allowMissing: true });
  const managedTests = (deriveFinalProvenance || (() => deriveManagedTestsFromClient(clientRoot, kitRoot)))();

  const manifest = {
    kitPath: relativeKit,
    upgradedAt: new Date().toISOString(),
    kitVersion,
    managedTests
  };

  // No callback or production mutation may occur between final provenance and
  // this serialization plus atomic replacement.
  atomicWriteClientFile(clientRoot, UPGRADE_MANIFEST, `${JSON.stringify(manifest, null, 2)}\n`);
}

/**
 * One rollback boundary for issue #169 plus all upgrade files, package data,
 * pointers and provenance. Hooks are deterministic test-only failure points.
 */
/**
 * @param {{ integrationPlan: any, filePlan: { add: string[], update: string[], remove: string[] }, scriptPlan: { key: string, to: string, preserve?: boolean }[], metadataPlan: object }} plans
 * @param {string} kitRoot @param {string} clientRoot @param {string | null} kitVersion
 * @param {{ integration?: any, afterPackage?: Function, beforeCopy?: (rel: string) => void, beforeRemove?: (rel: string) => void, afterFilesApplied?: Function, afterProvenanceComputed?: Function, afterVersionWritten?: Function, beforeRollbackRestore?: (rel: string) => void, writePointer?: Function, writeMetadata?: Function, provenanceHashHooks?: any }} [hooks] writeMetadata is a pre-final-boundary test hook despite its historical name.
 */
export function applyUpgradeTransaction(plans, kitRoot, clientRoot, kitVersion, hooks = {}) {
  const { integrationPlan, filePlan, scriptPlan, metadataPlan } = plans;
  const affected = new Set([
    ...filePlan.add, ...filePlan.update, ...filePlan.remove,
    SOURCE_POINTER, VERSION_FILE, UPGRADE_MANIFEST,
    ...(integrationPlan.artifactChanged ? [UI_COMPONENTS_ARTIFACT] : []),
    ...(integrationPlan.identityChanged ? [UI_COMPONENTS_IDENTITY] : []),
    ...(integrationPlan.dependency.changed || scriptPlan.some((entry) => !entry.preserve) ? ['package.json'] : [])
  ]);
  validateUpgradePaths(clientRoot);
  const parentDirectories = new Set();
  for (const rel of affected) {
    let parent = path.dirname(rel);
    while (parent !== '.' && parent !== path.dirname(parent)) {
      parentDirectories.add(parent);
      parent = path.dirname(parent);
    }
  }
  /** @type {Map<string, { mode: number } | null>} */
  const parentSnapshots = new Map();
  for (const rel of [...parentDirectories].sort((a, b) => a.split(path.sep).length - b.split(path.sep).length)) {
    const target = validateClientPath(clientRoot, rel, { allowMissing: true });
    if (!fs.existsSync(target)) parentSnapshots.set(rel, null);
    else parentSnapshots.set(rel, { mode: fs.statSync(target).mode });
  }
  /** @type {Map<string, { type: 'file', bytes: Buffer, mode: number } | { type: 'symlink', target: string } | null>} */
  const snapshots = new Map();
  for (const rel of affected) {
    const target = validateClientPath(clientRoot, rel, { allowMissing: true });
    let stat;
    try { stat = fs.lstatSync(target); } catch (error) {
      if (/** @type {NodeJS.ErrnoException} */ (error).code === 'ENOENT') { snapshots.set(rel, null); continue; }
      throw error;
    }
    if (stat.isSymbolicLink()) throw new Error(`Unsafe symbolic link at upgrade target: ${rel}`);
    else if (stat.isDirectory()) throw new Error(`Upgrade target expected a file but found a directory: ${rel}`);
    else snapshots.set(rel, { type: 'file', bytes: fs.readFileSync(target), mode: stat.mode });
  }
  const restore = () => {
    // A deterministic failure hook may have replaced a directory that did not
    // exist at preflight. Remove only that lexical symlink itself before any
    // restore path is validated; never traverse it.
    for (const [rel, state] of [...parentSnapshots].sort(([a], [b]) => a.split(path.sep).length - b.split(path.sep).length)) {
      if (state !== null) continue;
      const candidate = path.join(clientRoot, rel);
      try { if (fs.lstatSync(candidate).isSymbolicLink()) fs.rmSync(candidate, { force: true }); }
      catch (error) { if (/** @type {NodeJS.ErrnoException} */ (error).code !== 'ENOENT') throw error; }
    }
    for (const rel of snapshots.keys()) {
      validateClientPath(clientRoot, path.dirname(rel), { finalType: 'directory', allowMissing: true });
      const candidate = path.join(clientRoot, rel);
      try { if (fs.lstatSync(candidate).isSymbolicLink()) fs.rmSync(candidate, { force: true }); }
      catch (error) { if (/** @type {NodeJS.ErrnoException} */ (error).code !== 'ENOENT') throw error; }
    }
    for (const [rel, state] of [...snapshots].reverse()) {
      hooks.beforeRollbackRestore?.(rel);
      const target = validateClientPath(clientRoot, rel, { allowMissing: true });
      if (state === null) fs.rmSync(target, { recursive: true, force: true });
      else if (state.type === 'file') {
        fs.rmSync(target, { recursive: true, force: true });
        fs.mkdirSync(path.dirname(target), { recursive: true });
        fs.writeFileSync(target, state.bytes);
        fs.chmodSync(target, state.mode);
      } else if (state.type === 'symlink') {
        fs.rmSync(target, { recursive: true, force: true });
        fs.mkdirSync(path.dirname(target), { recursive: true });
        fs.symlinkSync(state.target, target);
      }
    }
    for (const [rel, state] of [...parentSnapshots].sort(([a], [b]) => b.split(path.sep).length - a.split(path.sep).length)) {
      const target = validateClientPath(clientRoot, rel, { allowMissing: true });
      if (state === null) fs.rmSync(target, { recursive: true, force: true });
      else if (fs.existsSync(target)) fs.chmodSync(target, state.mode);
    }
  };
  try {
    const integrationResult = applyUiComponentsIntegrationPlan(
      integrationPlan, kitRoot, clientRoot, scriptPlan.filter((entry) => !entry.preserve), hooks.integration
    );
    hooks.afterPackage?.();
    for (const rel of [...filePlan.add, ...filePlan.update]) {
      hooks.beforeCopy?.(rel);
      const target = validateClientPath(clientRoot, rel, { allowMissing: true });
      fs.mkdirSync(path.dirname(target), { recursive: true });
      try {
        const stat = fs.lstatSync(target);
        if (!stat.isFile() || stat.isSymbolicLink()) fs.rmSync(target, { recursive: true, force: true });
        else fs.rmSync(target, { force: true });
      } catch (error) {
        if (/** @type {NodeJS.ErrnoException} */ (error).code !== 'ENOENT') throw error;
      }
      hashRegularFileNoFollow(path.join(kitRoot, rel));
      fs.copyFileSync(path.join(kitRoot, rel), target, fs.constants.COPYFILE_EXCL);
    }
    for (const rel of filePlan.remove) {
      hooks.beforeRemove?.(rel);
      fs.rmSync(validateClientPath(clientRoot, rel, { allowMissing: true }), { force: true });
    }
    hooks.afterFilesApplied?.();
    writeManifest(clientRoot, kitRoot, kitVersion, () => deriveManagedTestsFromClient(clientRoot, kitRoot, hooks.provenanceHashHooks), {
      writePointer: hooks.writePointer,
      writeMetadata: hooks.writeMetadata,
      afterVersionWritten: hooks.afterVersionWritten,
      beforeFinalProvenance: hooks.afterProvenanceComputed
    });
    return integrationResult;
  } catch (error) {
    try { restore(); } catch (rollbackError) {
      throw new AggregateError([error, rollbackError], 'Upgrade failed and rollback was incomplete');
    }
    throw error;
  }
}

/**
 * @param {string} kitRoot
 * @returns {string | null}
 */
/**
 * @param {string} message
 */
async function confirm(message) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const answer = await rl.question(message);
  rl.close();
  return /^y(es)?$/i.test(answer.trim());
}

/** @param {{ readPreservedFile?: (filePath: string) => Buffer, transactionHooks?: any }} [integrationValidation] */
export async function main(integrationValidation = {}) {
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
  validateUpgradePaths(clientRoot);
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

  for (const rel of [...UPGRADE_DIRS, 'vendor']) {
    const source = path.join(kitRoot, rel);
    if (fs.existsSync(source)) validateTreeNoSymlinks(source, `Kit ${rel}`);
  }

  const kitVersion = detectKitVersion(kitRoot) || null;
  const preservePaths = loadPreservePaths(clientRoot);
  validateUpgradePaths(clientRoot, preservePaths);
  const coreManagedPreserveEntries = findCoreManagedPreserveEntries(preservePaths);
  const integrationPlan = buildUiComponentsIntegrationPlan(
    kitRoot,
    clientRoot,
    preservePaths,
    integrationValidation
  );
  const filePlan = buildFilePlan(kitRoot, clientRoot, preservePaths);
  const scriptPlan = buildScriptPlan(kitRoot, clientRoot, integrationPlan.packageJsonPreserved);
  const dependencyPlan = {
    ...integrationPlan.dependency,
    artifactChanged: integrationPlan.artifactChanged,
    identityChanged: integrationPlan.identityChanged
  };
  const metadataPlan = buildMetadataPlan(clientRoot, kitRoot, kitVersion, filePlan);
  const hasChanges = printPlan(
    filePlan,
    scriptPlan,
    dependencyPlan,
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

  const integrationResult = applyUpgradeTransaction(
    { integrationPlan, filePlan, scriptPlan, metadataPlan }, kitRoot, clientRoot, kitVersion,
    integrationValidation.transactionHooks || {}
  );

  console.log('');
  console.log('Upgrade applied.');
  console.log('Next steps:');
  const dependencyInstallationRequired =
    integrationResult.dependencyChanged || integrationResult.artifactChanged;

  if (dependencyInstallationRequired) {
    console.log('  npm install');
  }

  console.log('  npm run check');
  console.log('  npm run build');

}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(`ERROR: ${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
  });
}
