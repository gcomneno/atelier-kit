/**
 * @typedef {{ type: string, target: string, label?: string }} ItemRelation
 * @typedef {{ code: string, source: string, itemId: string, message: string, index?: number, type?: string, target?: string, firstIndex?: number }} ItemRelationDiagnostic
 * @typedef {{ index: number, relation: ItemRelation }} AnalyzedRelation
 */

/**
 * Analyze and normalize item relations in one pass.
 *
 * @param {unknown} value
 * @param {string} source
 * @returns {{ diagnostics: ItemRelationDiagnostic[], issues: string[], relations: ItemRelation[], entries: AnalyzedRelation[] }}
 */
function analyzeItemRelations(value, source, itemId = '') {
  if (value === undefined) {
    return { diagnostics: [], issues: [], relations: [], entries: [] };
  }

  if (!Array.isArray(value)) {
    const message = `${source}: relations must be an array.`;
    return {
      diagnostics: [{ code: 'relations-not-array', source, itemId, message }],
      issues: [message], relations: [], entries: []
    };
  }

  /** @type {string[]} */
  const issues = [];
  /** @type {ItemRelation[]} */
  const relations = [];
  /** @type {AnalyzedRelation[]} */
  const entries = [];
  /** @type {ItemRelationDiagnostic[]} */
  const diagnostics = [];

  /** @param {string} code @param {string} message @param {number} index @param {string | undefined} [type] @param {string | undefined} [target] */
  const report = (code, message, index, type, target) => {
    issues.push(message);
    diagnostics.push({ code, source, index, itemId, message, ...(type ? { type } : {}), ...(target ? { target } : {}) });
  };

  value.forEach((entry, index) => {
    const relationSource = `${source}:relations[${index}]`;

    if (!entry || typeof entry !== 'object' || Array.isArray(entry)) {
      report('relation-not-object', `${relationSource}: relation must be an object.`, index);
      return;
    }

    const type = entry.type;
    const target = entry.target;
    const label = entry.label;
    let valid = true;

    if (typeof type !== 'string' || type.trim() === '') {
      report('type-invalid', `${relationSource}: type must be a non-empty string.`, index, undefined,
        typeof target === 'string' && target.trim() ? target.trim() : undefined);
      valid = false;
    }

    if (typeof target !== 'string' || target.trim() === '') {
      report('target-invalid', `${relationSource}: target must be a non-empty string.`, index,
        typeof type === 'string' && type.trim() ? type.trim() : undefined);
      valid = false;
    }

    if (label !== undefined && typeof label !== 'string') {
      report('label-invalid', `${relationSource}: label must be a string when present.`, index,
        typeof type === 'string' && type.trim() ? type.trim() : undefined,
        typeof target === 'string' && target.trim() ? target.trim() : undefined);
      valid = false;
    }

    if (!valid) return;

    /** @type {ItemRelation} */
    const relation = { type: type.trim(), target: target.trim() };
    const normalizedLabel = typeof label === 'string' ? label.trim() : '';

    if (normalizedLabel) relation.label = normalizedLabel;
    relations.push(relation);
    entries.push({ index, relation });
  });

  return { diagnostics, issues, relations, entries };
}

/**
 * Return the declared, normalized catalog identity, or no identity for an unusable value.
 *
 * @param {unknown} value
 * @returns {string}
 */
export function normalizeCatalogItemId(value) {
  return typeof value === 'string' ? value.trim() : '';
}

/** Default relationship contract. Projects may supply their own implementation programmatically. */
/** @param {string} _type */
export function allowsSelfReference(_type) {
  return false;
}

/**
 * Analyze relations after the complete catalog has been collected.
 * @param {{ id: string, source: string, relations: unknown }[]} records
 * @param {{ allowsSelfReference?: (type: string) => boolean }} [contract]
 * @returns {ItemRelationDiagnostic[]}
 */
export function analyzeCatalogItemRelations(records, contract = {}) {
  const permitsSelfReference = contract.allowsSelfReference || allowsSelfReference;
  const ids = new Set(records.map((record) => record.id).filter(Boolean));
  /** @type {ItemRelationDiagnostic[]} */
  const diagnostics = [];

  const orderedRecords = [...records].sort((left, right) =>
    left.source < right.source ? -1 : left.source > right.source ? 1 : 0
  );

  for (const record of orderedRecords) {
    const structural = analyzeItemRelations(record.relations, record.source, record.id);
    diagnostics.push(...structural.diagnostics);
    const firstEdges = new Map();

    for (const { index, relation } of structural.entries) {
      const base = { source: record.source, index, itemId: record.id, type: relation.type, target: relation.target };
      const relationSource = `${record.source}:relations[${index}]`;

      if (!ids.has(relation.target)) {
        diagnostics.push({ ...base, code: 'missing-target', message: `${relationSource}: item "${record.id}" relation type "${relation.type}" targets missing item "${relation.target}".` });
      }
      if (record.id && relation.target === record.id && !permitsSelfReference(relation.type)) {
        diagnostics.push({ ...base, code: 'self-reference', message: `${relationSource}: item "${record.id}" relation type "${relation.type}" cannot target itself.` });
      }

      const edge = `${relation.type}\u0000${relation.target}`;
      if (firstEdges.has(edge)) {
        const firstIndex = firstEdges.get(edge);
        diagnostics.push({ ...base, code: 'duplicate', firstIndex, message: `${relationSource}: item "${record.id}" relation type "${relation.type}" duplicates target "${relation.target}" from relations[${firstIndex}].` });
      } else {
        firstEdges.set(edge, index);
      }
    }
  }

  return diagnostics;
}

/**
 * Return every structural issue found in an item relations value.
 *
 * @param {unknown} value
 * @param {string} source
 * @returns {string[]}
 */
export function getItemRelationIssues(value, source) {
  return analyzeItemRelations(value, source).issues;
}

/**
 * Normalize an item relations value or throw with all structural diagnostics.
 *
 * @param {unknown} value
 * @param {string} source
 * @returns {ItemRelation[]}
 */
export function normalizeItemRelations(value, source) {
  const result = analyzeItemRelations(value, source);

  if (result.issues.length > 0) {
    throw new Error(result.issues.join('\n'));
  }

  return result.relations;
}
