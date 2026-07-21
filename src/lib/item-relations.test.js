import assert from 'node:assert/strict';
import test from 'node:test';
import {
  analyzeCatalogItemRelations,
  getItemRelationIssues,
  normalizeCatalogItemId,
  normalizeItemRelations
} from './item-relations.js';
import { createTranslator } from './i18n/index.js';

const source = 'content/items/source-item.yaml';

test('normalizes absent, empty, minimal and labelled relations', () => {
  assert.deepEqual(normalizeItemRelations(undefined, source), []);
  assert.deepEqual(normalizeItemRelations([], source), []);
  assert.deepEqual(normalizeItemRelations([{ type: 'related-to', target: 'other' }], source), [
    { type: 'related-to', target: 'other' }
  ]);
  assert.deepEqual(
    normalizeItemRelations([{ type: 'inspired-by', target: 'work-a', label: 'Source work' }], source),
    [{ type: 'inspired-by', target: 'work-a', label: 'Source work' }]
  );
});

test('trims supported fields, omits blank labels and strips unknown properties', () => {
  const input = [{ type: '  part-of ', target: ' project-a  ', label: '   ', extension: true }];
  assert.deepEqual(normalizeItemRelations(input, source), [
    { type: 'part-of', target: 'project-a' }
  ]);
});

test('preserves order, duplicates and input without mutation', () => {
  const input = [
    { type: '  arbitrary-link ', target: 'missing-item', label: ' Missing is valid ' },
    { type: 'self-reference', target: 'source-item' },
    { type: 'arbitrary-link', target: 'missing-item', extra: 'ignored' },
    { type: 'arbitrary-link', target: 'missing-item', extra: 'ignored' }
  ];
  const snapshot = structuredClone(input);

  assert.deepEqual(normalizeItemRelations(input, source), [
    { type: 'arbitrary-link', target: 'missing-item', label: 'Missing is valid' },
    { type: 'self-reference', target: 'source-item' },
    { type: 'arbitrary-link', target: 'missing-item' },
    { type: 'arbitrary-link', target: 'missing-item' }
  ]);
  assert.deepEqual(input, snapshot);
});

test('rejects every non-array top-level value except undefined', () => {
  for (const value of [null, {}, 'relations', 1, true]) {
    assert.deepEqual(getItemRelationIssues(value, source), [
      `${source}: relations must be an array.`
    ]);
  }
});

test('rejects non-object relation entries with indexed diagnostics', () => {
  const values = [null, [], 'relation', 1];
  const issues = getItemRelationIssues(values, source);
  assert.equal(issues.length, values.length);
  issues.forEach((issue, index) => {
    assert.match(issue, new RegExp(`source-item\\.yaml:relations\\[${index}\\]`));
    assert.match(issue, /relation must be an object/);
  });
});

test('reports all invalid type and target forms', () => {
  const issues = getItemRelationIssues([
    { target: 'x' },
    { type: 1, target: 'x' },
    { type: '', target: 'x' },
    { type: '  ', target: 'x' },
    { type: 'x' },
    { type: 'x', target: 1 },
    { type: 'x', target: '' },
    { type: 'x', target: '  ' }
  ], source);
  assert.equal(issues.length, 8);
  assert.equal(issues.filter((issue) => issue.includes('type must')).length, 4);
  assert.equal(issues.filter((issue) => issue.includes('target must')).length, 4);
});

test('rejects non-string labels and normalize throws every diagnostic', () => {
  const value = [
    { type: 'a', target: 'b', label: null },
    { type: '', target: '', label: 1 }
  ];
  const issues = getItemRelationIssues(value, source);
  assert.equal(issues.length, 4);
  assert.throws(
    () => normalizeItemRelations(value, source),
    (error) => error instanceof Error && issues.every((issue) => error.message.includes(issue))
  );
});

/**
 * @param {unknown} relations
 * @param {{ id: string, source: string, relations: unknown }[]} [extra]
 * @param {{ allowsSelfReference?: (type: string) => boolean }} [contract]
 */
function analyze(relations, extra = [], contract) {
  return analyzeCatalogItemRelations([
    { id: 'item-a', source: 'content/items/a.yaml', relations },
    { id: 'item-b', source: 'content/items/b.yaml', relations: undefined },
    ...extra
  ], contract);
}

test('catalog identity uses only a declared non-empty string and trims accepted ids', () => {
  assert.equal(normalizeCatalogItemId(' item-a '), 'item-a');
  for (const value of [undefined, null, 4, '', '   ']) {
    assert.equal(normalizeCatalogItemId(value), '');
  }
});

test('catalog analyzer accepts valid targets, different edges, cycles and absent relations', () => {
  const diagnostics = analyze([
    { type: 'related-to', target: 'item-b' },
    { type: 'inspired-by', target: 'item-b' },
    { type: 'related-to', target: 'item-c' }
  ], [{ id: 'item-c', source: 'content/items/c.yaml', relations: [{ type: 'back-to', target: 'item-a' }] }]);
  assert.deepEqual(diagnostics, []);
});

test('catalog analyzer reports normalized missing targets with technical context', () => {
  const [diagnostic] = analyze([{ type: ' related-to ', target: ' missing ' }]);
  assert.deepEqual(
    { code: diagnostic.code, source: diagnostic.source, index: diagnostic.index, itemId: diagnostic.itemId, type: diagnostic.type, target: diagnostic.target },
    { code: 'missing-target', source: 'content/items/a.yaml', index: 0, itemId: 'item-a', type: 'related-to', target: 'missing' }
  );
});

test('catalog analyzer rejects self-reference by default and permits it through the contract', () => {
  const relations = [{ type: 'alias-of', target: 'item-a' }];
  assert.equal(analyze(relations)[0].code, 'self-reference');
  assert.deepEqual(analyze(relations, [], { allowsSelfReference: (type) => type === 'alias-of' }), []);
});

test('catalog analyzer detects normalized duplicate edges and ignores labels', () => {
  const diagnostics = analyze([
    { type: 'part-of', target: 'item-b', label: 'First' },
    { type: ' part-of ', target: ' item-b ', label: 'Different display label' },
    { type: 'part-of', target: 'item-b' }
  ]).filter(({ code }) => code === 'duplicate');
  assert.deepEqual(diagnostics.map(({ index, firstIndex }) => ({ index, firstIndex })), [
    { index: 1, firstIndex: 0 },
    { index: 2, firstIndex: 0 }
  ]);
});

test('structurally invalid entries do not cascade into catalog diagnostics', () => {
  const diagnostics = analyze([
    { type: '', target: 'missing' },
    { type: 'related-to', target: '', label: 1 },
    null
  ]);
  assert.deepEqual(diagnostics.map(({ code }) => code), [
    'type-invalid', 'target-invalid', 'label-invalid', 'relation-not-object'
  ]);
});

test('catalog diagnostics use deterministic source and relation-index ordering', () => {
  const diagnostics = analyzeCatalogItemRelations([
    { id: 'z', source: 'content/items/z.yaml', relations: [{ type: 'x', target: 'no-z' }] },
    { id: 'a', source: 'content/items/a.yaml', relations: [{ type: 'x', target: 'no-a' }, { type: 'y', target: 'no-b' }] }
  ]);
  assert.deepEqual(diagnostics.map(({ source, index }) => [source, index]), [
    ['content/items/a.yaml', 0], ['content/items/a.yaml', 1], ['content/items/z.yaml', 0]
  ]);
});

test('relationship warnings are localized in English and Italian', () => {
  assert.equal(createTranslator('en')('doctor.warnings.itemRelation.duplicate.title'), 'Duplicate item relationship');
  assert.equal(createTranslator('it')('doctor.warnings.itemRelation.duplicate.title'), 'Relazione oggetto duplicata');
});
