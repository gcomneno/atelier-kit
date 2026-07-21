import { getItemCoverImage, ITEM_IMAGE_PLACEHOLDER } from './item-images.js';
import {
  analyzeCatalogItemRelations,
  normalizeCatalogItemId,
  normalizeItemRelations
} from './item-relations.js';

/**
 * @typedef {{ id: string, label: string, image?: string, href?: string }} RelationshipGraphNode
 * @typedef {{ source: string, target: string, type?: string, label?: string }} RelationshipGraphEdge
 * @typedef {{ nodes: RelationshipGraphNode[], edges: RelationshipGraphEdge[] }} RelationshipGraph
 */

/** @param {string} left @param {string} right */
function compareStrings(left, right) {
  return left < right ? -1 : left > right ? 1 : 0;
}

/** @param {RelationshipGraphEdge} left @param {RelationshipGraphEdge} right */
function compareEdges(left, right) {
  return compareStrings(left.source, right.source)
    || compareStrings(left.target, right.target)
    || compareStrings(left.type ?? '', right.type ?? '')
    || compareStrings(left.label ?? '', right.label ?? '');
}

/**
 * Project the complete catalog, or an induced subset, into a UI-neutral graph.
 *
 * Nodes are ordered by id. Edges are ordered by source, target, type, then label,
 * using code-unit string comparison for a stable total order.
 *
 * @param {unknown} items
 * @param {{ itemIds?: unknown }} [options]
 * @returns {RelationshipGraph}
 */
export function projectItemRelationshipGraph(items, options = {}) {
  if (!Array.isArray(items)) {
    throw new Error('Relationship graph items must be an array.');
  }
  if (!options || typeof options !== 'object' || Array.isArray(options)) {
    throw new Error('Relationship graph options must be an object when provided.');
  }

  const records = items.map((item, index) => {
    const source = `items[${index}]`;

    if (!item || typeof item !== 'object' || Array.isArray(item)) {
      throw new Error(`${source}: item must be an object.`);
    }

    const id = normalizeCatalogItemId(item.id);
    const label = typeof item.title === 'string' ? item.title.trim() : '';

    if (!id) throw new Error(`${source}: missing or invalid "id".`);
    if (!label) throw new Error(`${source}: missing or invalid "title".`);

    return {
      id,
      label,
      item,
      relations: normalizeItemRelations(item.relations, source)
    };
  });

  const recordsById = new Map();

  for (const record of records) {
    if (recordsById.has(record.id)) {
      throw new Error(`Relationship graph items contain duplicate id "${record.id}".`);
    }
    recordsById.set(record.id, record);
  }

  const relationDiagnostics = analyzeCatalogItemRelations(records.map((record) => ({
    id: record.id,
    source: `item "${record.id}"`,
    relations: record.relations
  })));
  if (relationDiagnostics.length > 0) {
    throw new Error(relationDiagnostics.map((diagnostic) => diagnostic.message).join('\n'));
  }

  let selectedIds = new Set(recordsById.keys());

  if (options.itemIds !== undefined) {
    if (!Array.isArray(options.itemIds)) {
      throw new Error('Relationship graph itemIds must be an array when provided.');
    }

    selectedIds = new Set(options.itemIds.map((value, index) => {
      const id = normalizeCatalogItemId(value);
      if (!id) throw new Error(`Relationship graph itemIds[${index}] must be a non-empty string.`);
      return id;
    }));

    const unknownIds = [...selectedIds].filter((id) => !recordsById.has(id)).sort(compareStrings);
    if (unknownIds.length > 0) {
      throw new Error(`Relationship graph itemIds contain unknown ids: ${unknownIds.join(', ')}.`);
    }
  }

  const selectedRecords = records
    .filter((record) => selectedIds.has(record.id))
    .sort((left, right) => compareStrings(left.id, right.id));

  const nodes = selectedRecords.map((record) => {
    const image = getItemCoverImage(record.item).file;
    return {
      id: record.id,
      label: record.label,
      ...(image && image !== ITEM_IMAGE_PLACEHOLDER ? { image } : {}),
      href: `/items/${record.id}`
    };
  });

  const edges = selectedRecords.flatMap((record) => record.relations
    .filter((relation) => selectedIds.has(relation.target))
    .map((relation) => ({
      source: record.id,
      target: relation.target,
      type: relation.type,
      ...(relation.label ? { label: relation.label } : {})
    })))
    .sort(compareEdges);

  return { nodes, edges };
}
