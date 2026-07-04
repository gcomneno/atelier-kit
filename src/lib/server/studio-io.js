// @ts-nocheck

import { spawnSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { parse, stringify } from 'yaml';

const ROOT = process.cwd();

/**
 * @param {string} relativePath
 * @returns {Record<string, unknown>}
 */
export function readProjectYaml(relativePath) {
  const absolutePath = path.join(ROOT, relativePath);
  const data = parse(readFileSync(absolutePath, 'utf8'));

  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    throw new Error(`${relativePath} must contain a YAML object.`);
  }

  return data;
}

/**
 * @param {string} relativePath
 * @param {Record<string, unknown>} data
 */
export function writeProjectYaml(relativePath, data) {
  const absolutePath = path.join(ROOT, relativePath);
  writeFileSync(absolutePath, `${stringify(data).trim()}\n`, 'utf8');
}

/**
 * @returns {{ ok: boolean, output: string }}
 */
export function runStructuralValidation() {
  const result = spawnSync(process.execPath, ['scripts/validate-content.js'], {
    cwd: ROOT,
    encoding: 'utf8'
  });

  return {
    ok: result.status === 0,
    output: `${result.stdout || ''}${result.stderr || ''}`.trim()
  };
}

/**
 * @param {FormDataEntryValue | null} value
 * @param {string} label
 */
export function requiredField(value, label) {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new Error(`${label} is required.`);
  }

  return value.trim();
}

/**
 * @param {FormDataEntryValue | null} value
 * @param {string} [fallback]
 */
export function optionalField(value, fallback = '') {
  if (typeof value !== 'string') {
    return fallback;
  }

  return value.trim();
}

/**
 * @param {FormDataEntryValue | null} value
 */
export function checkboxEnabled(value) {
  return value === 'on' || value === 'true' || value === '1';
}
