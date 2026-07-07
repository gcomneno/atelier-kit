import { META_PRESETS } from '$lib/item-presets.js';

/** @typedef {{ label: string, value: string }} MetaEditRow */

const HIERARCHY_LABEL = /^(.+?)\s*(?:›|>)\s*(.+)$/;

/**
 * @param {string} label
 * @returns {{ parent: string, child: string } | null}
 */
function splitHierarchyLabel(label) {
  const match = label.match(HIERARCHY_LABEL);

  if (!match) {
    return null;
  }

  const parent = match[1].trim();
  const child = match[2].trim();

  if (parent === '' || child === '') {
    return null;
  }

  return { parent, child };
}

/**
 * @param {unknown} meta
 * @returns {MetaEditRow[]}
 */
export function flattenMetaForEdit(meta) {
  if (!Array.isArray(meta)) {
    return [];
  }

  /** @type {MetaEditRow[]} */
  const rows = [];

  for (const entry of meta) {
    if (!entry || typeof entry !== 'object' || Array.isArray(entry)) {
      continue;
    }

    const record = /** @type {Record<string, unknown>} */ (entry);
    const label = typeof record.label === 'string' ? record.label.trim() : '';
    const value = typeof record.value === 'string' ? record.value : '';
    const children = Array.isArray(record.children) ? record.children : [];

    if (children.length === 0) {
      if (label !== '') {
        rows.push({ label, value });
      }

      continue;
    }

    for (const child of children) {
      if (!child || typeof child !== 'object' || Array.isArray(child)) {
        continue;
      }

      const childRecord = /** @type {Record<string, unknown>} */ (child);
      const childLabel = typeof childRecord.label === 'string' ? childRecord.label.trim() : '';
      const childValue = typeof childRecord.value === 'string' ? childRecord.value : '';

      if (childLabel === '') {
        continue;
      }

      rows.push({
        label: label ? `${label} › ${childLabel}` : childLabel,
        value: childValue
      });
    }
  }

  return rows;
}

/**
 * @param {FormData} formData
 * @returns {MetaEditRow[]}
 */
export function parseMetaRowsFromForm(formData) {
  const labels = formData.getAll('meta_labels').map((value) => String(value).trim());
  const values = formData.getAll('meta_values').map((value) => String(value).trim());

  if (labels.length !== values.length) {
    throw new Error('Meta row count mismatch.');
  }

  /** @type {MetaEditRow[]} */
  const rows = [];

  for (let index = 0; index < labels.length; index += 1) {
    const label = labels[index];
    const value = values[index];

    if (label === '' && value === '') {
      continue;
    }

    rows.push({ label, value });
  }

  return rows;
}

/**
 * @param {MetaEditRow[]} rows
 * @returns {Array<{ label: string, value?: string, children?: { label: string, value: string }[] }>}
 */
export function metaRowsToYaml(rows) {
  /** @type {Array<{ label: string, value?: string, children?: { label: string, value: string }[] }>} */
  const meta = [];
  /** @type {Map<string, { label: string, children: { label: string, value: string }[] }>} */
  let openGroups = new Map();

  for (const row of rows) {
    const label = row.label.trim();
    const value = row.value.trim();

    if (label === '' && value === '') {
      continue;
    }

    const hierarchy = splitHierarchyLabel(label);

    if (hierarchy) {
      let group = openGroups.get(hierarchy.parent);

      if (!group) {
        group = { label: hierarchy.parent, children: [] };
        meta.push(group);
        openGroups.set(hierarchy.parent, group);
      }

      group.children.push({
        label: hierarchy.child,
        value
      });
      continue;
    }

    openGroups = new Map();
    meta.push({ label, value });
  }

  return meta;
}

/**
 * Rebuild nested meta groups from flat "Gruppo › Voce" labels (and preserve existing nesting).
 * @param {unknown} meta
 * @returns {ReturnType<typeof metaRowsToYaml>}
 */
export function normalizeMetaHierarchy(meta) {
  if (!Array.isArray(meta) || meta.length === 0) {
    return [];
  }

  return metaRowsToYaml(flattenMetaForEdit(meta));
}

/**
 * Walk preset/meta trees and collect labels and values.
 * @param {unknown[]} entries
 * @param {Set<string>} labels
 * @param {Set<string>} values
 * @param {string} [parentLabel]
 */
function collectFromMetaEntries(entries, labels, values, parentLabel = '') {
  for (const entry of entries) {
    if (!entry || typeof entry !== 'object' || Array.isArray(entry)) {
      continue;
    }

    const record = /** @type {Record<string, unknown>} */ (entry);
    const label = typeof record.label === 'string' ? record.label.trim() : '';

    if (label !== '') {
      labels.add(parentLabel ? `${parentLabel} › ${label}` : label);

      if (parentLabel) {
        labels.add(parentLabel);
      }
    }

    if (typeof record.value === 'string') {
      const value = record.value.trim();

      if (value !== '') {
        values.add(value);
      }
    }

    if (Array.isArray(record.children)) {
      collectFromMetaEntries(record.children, labels, values, label);
    }
  }
}

/**
 * @param {Array<{ meta?: unknown }>} items
 */
export function collectMetaSuggestions(items = []) {
  /** @type {Set<string>} */
  const labels = new Set();
  /** @type {Set<string>} */
  const values = new Set();

  for (const presetMeta of Object.values(META_PRESETS)) {
    if (Array.isArray(presetMeta)) {
      collectFromMetaEntries(presetMeta, labels, values);
    }
  }

  for (const item of items) {
    const rows = flattenMetaForEdit(item.meta);

    for (const row of rows) {
      if (row.label.trim() !== '') {
        labels.add(row.label.trim());
      }

      if (row.value.trim() !== '') {
        values.add(row.value.trim());
      }
    }
  }

  return {
    labels: [...labels].sort((left, right) => left.localeCompare(right)),
    values: [...values].sort((left, right) => left.localeCompare(right))
  };
}
