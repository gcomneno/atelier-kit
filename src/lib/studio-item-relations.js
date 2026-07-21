import { analyzeCatalogItemRelations, normalizeItemRelations } from './item-relations.js';
import { translate } from './i18n/index.js';

/** @typedef {{ type: string, target: string, label: string }} StudioItemRelationRow */

/**
 * Return canonical relations as editable Studio rows. Invalid legacy rows are kept
 * visible where possible so an operator can repair them rather than losing them.
 * @param {unknown} value
 * @returns {StudioItemRelationRow[]}
 */
export function getStudioItemRelationRows(value) {
  if (!Array.isArray(value)) return [];

  return value.map((entry) => {
    const record = entry && typeof entry === 'object' && !Array.isArray(entry) ? entry : {};
    return {
      type: typeof record.type === 'string' ? record.type : '',
      target: typeof record.target === 'string' ? record.target : '',
      label: typeof record.label === 'string' ? record.label : ''
    };
  });
}

/** @param {{ id: string, title: string }} item */
export function formatStudioItemRelationTarget(item) {
  return `${item.title} — ${item.id}`;
}

/**
 * Apply canonical relations without adding an empty YAML field.
 * @param {Record<string, unknown>} item
 * @param {Array<{ type: string, target: string, label?: string }>} relations
 */
export function withStudioItemRelations(item, relations) {
  const next = { ...item };
  delete next.relations;
  if (relations.length > 0) next.relations = relations;
  return next;
}

/** @param {FormData} formData @param {string} [locale] */
export function parseStudioItemRelationRows(formData, locale = 'en') {
  const types = formData.getAll('relation_types').map(String);
  const targets = formData.getAll('relation_targets').map(String);
  const labels = formData.getAll('relation_labels').map(String);

  if (types.length !== targets.length || types.length !== labels.length) {
    throw new Error(translate('errors.relationRowMismatch', locale));
  }

  return types.map((type, index) => ({ type, target: targets[index], label: labels[index] }));
}

/**
 * Parse and authoritatively validate submitted relations against the catalog.
 * @param {FormData} formData
 * @param {string} itemId
 * @param {Array<{ id: string }>} catalogItems
 * @param {string} [locale]
 */
export function parseAndValidateStudioItemRelations(formData, itemId, catalogItems, locale = 'en') {
  const rows = parseStudioItemRelationRows(formData, locale);
  const source = `content/items/${itemId}.yaml`;
  let relations;

  try {
    relations = normalizeItemRelations(rows, source);
  } catch {
    throw new Error(translate('errors.relationFieldsRequired', locale));
  }

  const diagnostics = analyzeCatalogItemRelations([
    ...catalogItems.filter((item) => item.id !== itemId).map((item) => ({
      id: item.id,
      source: `content/items/${item.id}.yaml`,
      relations: undefined
    })),
    { id: itemId, source, relations }
  ]).filter((diagnostic) => diagnostic.itemId === itemId);

  if (diagnostics.length > 0) {
    const diagnostic = diagnostics[0];
    const key = diagnostic.code === 'self-reference'
      ? 'errors.relationSelfTarget'
      : diagnostic.code === 'duplicate'
        ? 'errors.relationDuplicate'
        : 'errors.relationMissingTarget';
    throw new Error(translate(key, locale, { target: diagnostic.target || '' }));
  }

  return relations;
}

/** @param {Array<{ relations?: unknown }>} items */
export function collectItemRelationTypeSuggestions(items) {
  const types = new Set();
  for (const item of items) {
    for (const row of getStudioItemRelationRows(item.relations)) {
      if (row.type.trim()) types.add(row.type.trim());
    }
  }
  return [...types].sort((left, right) => left.localeCompare(right));
}
