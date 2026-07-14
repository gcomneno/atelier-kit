#!/usr/bin/env node

import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

export const TEST_ROOTS = ['test', 'src/*.test.js', 'src/lib', 'src/routes'];
export const MAX_ARGUMENT_BYTES = 24 * 1024;
const SKIP_DIRECTORIES = new Set([
  '.cache', '.git', '.svelte-kit', '.vercel',
  'backup', 'backups', 'build', 'cache', 'caches', 'coverage', 'dist',
  'artifact', 'artifacts', 'content', 'data', 'fixture', 'fixtures', 'generated',
  'node_modules', 'preserved-data', 'static', 'temp', 'tmp', 'vendor', 'vendors'
]);

/** @param {string} value */
export function normalizeTestPath(value) {
  return value.split(path.sep).join('/');
}

/** @param {string} left @param {string} right */
export function compareCodeUnits(left, right) {
  return left < right ? -1 : left > right ? 1 : 0;
}

/** @param {string} root */
export function discoverTests(root) {
  /** @type {string[]} */
  const tests = [];

  /** @param {string} directory */
  function walk(directory) {
    const entries = fs.readdirSync(directory, { withFileTypes: true })
      .sort((a, b) => compareCodeUnits(a.name, b.name));

    for (const entry of entries) {
      if (entry.isSymbolicLink()) continue;
      if (entry.isDirectory()) {
        if (!SKIP_DIRECTORIES.has(entry.name) && !entry.name.startsWith('.')) {
          walk(path.join(directory, entry.name));
        }
      } else if (entry.isFile() && entry.name.endsWith('.test.js')) {
        tests.push(normalizeTestPath(path.relative(root, path.join(directory, entry.name))));
      }
    }
  }

  const recursiveRoots = ['test', 'src/lib', 'src/routes'];
  for (const approvedRoot of recursiveRoots) {
    const directory = path.join(root, approvedRoot);
    let stat;
    try { stat = fs.lstatSync(directory); } catch (error) {
      if (/** @type {NodeJS.ErrnoException} */ (error).code === 'ENOENT') continue;
      throw error;
    }
    if (stat.isDirectory() && !stat.isSymbolicLink()) walk(directory);
  }
  const src = path.join(root, 'src');
  try {
    for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
      if (entry.isFile() && entry.name.endsWith('.test.js')) tests.push(`src/${entry.name}`);
    }
  } catch (error) {
    if (/** @type {NodeJS.ErrnoException} */ (error).code !== 'ENOENT') throw error;
  }

  return tests.sort(compareCodeUnits);
}

/** @param {string[]} tests @param {number} [maxBytes] */
export function batchTests(tests, maxBytes = MAX_ARGUMENT_BYTES) {
  const batches = [];
  let current = [];
  let bytes = Buffer.byteLength(process.execPath) + Buffer.byteLength('--test') + 2;
  for (const testPath of tests) {
    const size = Buffer.byteLength(testPath) + 1;
    if (current.length > 0 && bytes + size > maxBytes) {
      batches.push(current); current = []; bytes = Buffer.byteLength(process.execPath) + 8;
    }
    current.push(testPath); bytes += size;
  }
  if (current.length > 0) batches.push(current);
  return batches;
}

/**
 * @param {string} root
 * @param {(command: string, args: string[], options: { cwd: string, stdio: 'inherit', shell: false }) => { error?: Error, signal?: NodeJS.Signals | null, status: number | null }} [spawn]
 * @param {number} [maxArgumentBytes]
 */
export function runTests(root, spawn = spawnSync, maxArgumentBytes = MAX_ARGUMENT_BYTES) {
  const tests = discoverTests(root);
  if (tests.length === 0) {
    console.log(`No JavaScript tests found in approved roots: ${TEST_ROOTS.join(', ')}.`);
    return 0;
  }

  const nativeTests = tests.map((testPath) => path.join(...testPath.split('/')));
  for (const batch of batchTests(nativeTests, maxArgumentBytes)) {
    const result = spawn(process.execPath, ['--test', ...batch], {
      cwd: root, stdio: 'inherit', shell: false
    });
    if (result.error) {
      console.error(`Could not start test process: ${result.error.message}`);
      return 1;
    }
    if (result.signal) {
      console.error(`Test process terminated by signal ${result.signal}.`);
      return 1;
    }
    if (result.status !== 0) {
      console.error(`Test process failed with exit code ${result.status ?? 'unknown'}.`);
      return result.status ?? 1;
    }
  }
  return 0;
}

export function main() {
  process.exitCode = runTests(process.cwd());
}

if (path.resolve(process.argv[1] || '') === fileURLToPath(import.meta.url)) main();
