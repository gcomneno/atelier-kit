/**
 * @typedef {{ type: string, target: string, label?: string }} ItemRelation
 */

/**
 * Analyze and normalize item relations in one pass.
 *
 * @param {unknown} value
 * @param {string} source
 * @returns {{ issues: string[], relations: ItemRelation[] }}
 */
function analyzeItemRelations(value, source) {
  if (value === undefined) {
    return { issues: [], relations: [] };
  }

  if (!Array.isArray(value)) {
    return { issues: [`${source}: relations must be an array.`], relations: [] };
  }

  /** @type {string[]} */
  const issues = [];
  /** @type {ItemRelation[]} */
  const relations = [];

  value.forEach((entry, index) => {
    const relationSource = `${source}:relations[${index}]`;

    if (!entry || typeof entry !== 'object' || Array.isArray(entry)) {
      issues.push(`${relationSource}: relation must be an object.`);
      return;
    }

    const type = entry.type;
    const target = entry.target;
    const label = entry.label;
    let valid = true;

    if (typeof type !== 'string' || type.trim() === '') {
      issues.push(`${relationSource}: type must be a non-empty string.`);
      valid = false;
    }

    if (typeof target !== 'string' || target.trim() === '') {
      issues.push(`${relationSource}: target must be a non-empty string.`);
      valid = false;
    }

    if (label !== undefined && typeof label !== 'string') {
      issues.push(`${relationSource}: label must be a string when present.`);
      valid = false;
    }

    if (!valid) return;

    /** @type {ItemRelation} */
    const relation = { type: type.trim(), target: target.trim() };
    const normalizedLabel = typeof label === 'string' ? label.trim() : '';

    if (normalizedLabel) relation.label = normalizedLabel;
    relations.push(relation);
  });

  return { issues, relations };
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
