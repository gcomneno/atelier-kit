import assert from 'node:assert/strict';
import test from 'node:test';
import { getItemRelationIssues, normalizeItemRelations } from './item-relations.js';

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
