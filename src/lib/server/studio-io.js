// @ts-nocheck

import { spawnSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { parse, stringify } from 'yaml';

const ROOT = process.cwd();
const ID_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

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

/** @param {{ ok: boolean, output: string }} validation */
export function validationMessage(validation) {
  if (validation.ok) {
    return 'Saved successfully. Structural validation passed. Refresh the preview tab to see changes.';
  }

  return `Saved, but validation reported a problem:\n${validation.output}`;
}

/**
 * @param {string} id
 * @param {string} [label]
 */
export function assertContentId(id, label = 'Id') {
  if (!ID_PATTERN.test(id)) {
    throw new Error(`${label} must use lowercase letters, numbers and hyphens only.`);
  }
}

/**
 * @param {string} id
 * @param {string} folder
 */
function recordPath(folder, id) {
  assertContentId(id);
  return `${folder}/${id}.yaml`;
}

export function listItemSummaries() {
  const dir = path.join(ROOT, 'content/items');

  if (!existsSync(dir)) {
    return [];
  }

  return readdirSync(dir)
    .filter((file) => file.endsWith('.yaml'))
    .map((file) => {
      const fallbackId = file.replace(/\.yaml$/, '');
      const item = readProjectYaml(`content/items/${file}`);

      return {
        id: typeof item.id === 'string' ? item.id : fallbackId,
        title: typeof item.title === 'string' ? item.title : fallbackId,
        status: typeof item.status === 'string' ? item.status : ''
      };
    })
    .sort((left, right) => left.title.localeCompare(right.title));
}

export function readItemRecord(id) {
  return readProjectYaml(recordPath('content/items', id));
}

/**
 * @param {string} id
 * @param {Record<string, unknown>} item
 */
export function writeItemRecord(id, item) {
  writeProjectYaml(recordPath('content/items', id), item);
}

export function listCollectionSummaries() {
  const dir = path.join(ROOT, 'content/collections');

  if (!existsSync(dir)) {
    return [];
  }

  return readdirSync(dir)
    .filter((file) => file.endsWith('.yaml'))
    .map((file) => {
      const fallbackId = file.replace(/\.yaml$/, '');
      const collection = readProjectYaml(`content/collections/${file}`);

      return {
        id: typeof collection.id === 'string' ? collection.id : fallbackId,
        title: typeof collection.title === 'string' ? collection.title : fallbackId,
        itemCount: Array.isArray(collection.items) ? collection.items.length : 0
      };
    })
    .sort((left, right) => left.title.localeCompare(right.title));
}

export function readCollectionRecord(id) {
  return readProjectYaml(recordPath('content/collections', id));
}

/**
 * @param {string} id
 * @param {Record<string, unknown>} collection
 */
export function writeCollectionRecord(id, collection) {
  writeProjectYaml(recordPath('content/collections', id), collection);
}

/**
 * @param {unknown[]} originalMeta
 * @param {FormData} formData
 */
export function applyMetaFromForm(originalMeta, formData) {
  if (!Array.isArray(originalMeta)) {
    return [];
  }

  return originalMeta.map((entry, index) => {
    const updated = { label: entry.label };

    if (typeof entry.value === 'string') {
      updated.value = optionalField(formData.get(`meta_${index}_value`), entry.value);
    }

    if (Array.isArray(entry.children)) {
      updated.children = entry.children.map((child, childIndex) => ({
        label: child.label,
        ...(typeof child.value === 'string'
          ? {
              value: optionalField(
                formData.get(`meta_${index}_child_${childIndex}_value`),
                child.value
              )
            }
          : {})
      }));
    }

    return updated;
  });
}
