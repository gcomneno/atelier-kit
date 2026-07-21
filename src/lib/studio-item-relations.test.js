import assert from 'node:assert/strict';
import test from 'node:test';
import {
  collectItemRelationTypeSuggestions,
  formatStudioItemRelationTarget,
  getStudioItemRelationRows,
  parseStudioItemRelationRows,
  parseAndValidateStudioItemRelations,
  withStudioItemRelations
} from './studio-item-relations.js';

const catalog = [{ id: 'item-a' }, { id: 'item-b' }, { id: 'item-c' }];

/** @param {Array<{ type: string, target: string, label?: string }>} rows */
function relationForm(rows) {
  const form = new FormData();
  for (const row of rows) {
    form.append('relation_types', row.type);
    form.append('relation_targets', row.target);
    form.append('relation_labels', row.label ?? '');
  }
  return form;
}

test('parses canonical relations, trims values and omits optional blank labels', () => {
  assert.deepEqual(parseAndValidateStudioItemRelations(relationForm([
    { type: ' related-to ', target: ' item-b ', label: ' Companion ' },
    { type: 'inspired-by', target: 'item-c' }
  ]), 'item-a', catalog), [
    { type: 'related-to', target: 'item-b', label: 'Companion' },
    { type: 'inspired-by', target: 'item-c' }
  ]);
});

test('empty relation authoring preserves relation-free behavior', () => {
  assert.deepEqual(parseAndValidateStudioItemRelations(new FormData(), 'item-a', catalog), []);
});

test('rejects self targets, missing or renamed targets, and duplicate canonical edges', () => {
  assert.throws(() => parseAndValidateStudioItemRelations(relationForm([
    { type: 'related-to', target: 'item-a' }
  ]), 'item-a', catalog), /cannot target itself/i);
  assert.throws(() => parseAndValidateStudioItemRelations(relationForm([
    { type: 'related-to', target: 'deleted-or-renamed' }
  ]), 'item-a', catalog), /deleted or renamed/i);
  assert.throws(() => parseAndValidateStudioItemRelations(relationForm([
    { type: 'related-to', target: 'item-b' },
    { type: ' related-to ', target: ' item-b ', label: 'Another label' }
  ]), 'item-a', catalog), /duplicate/i);
});

test('requires complete rows and keeps free-form type suggestions domain-neutral', () => {
  assert.throws(() => parseAndValidateStudioItemRelations(relationForm([
    { type: '', target: 'item-b' }
  ]), 'item-a', catalog), /type and target/i);
  assert.deepEqual(collectItemRelationTypeSuggestions([
    { relations: [{ type: ' inspired-by ', target: 'item-a' }] },
    { relations: [{ type: 'related-to', target: 'item-b' }, { type: 'inspired-by', target: 'item-c' }] }
  ]), ['inspired-by', 'related-to']);
});

test('localizes mismatched parallel relationship fields separately from incomplete rows', () => {
  const mismatched = new FormData();
  mismatched.append('relation_types', 'related-to');
  mismatched.append('relation_targets', 'item-b');

  assert.throws(() => parseStudioItemRelationRows(mismatched), /row count mismatch/i);
  assert.throws(
    () => parseStudioItemRelationRows(mismatched, 'it'),
    /numero di campi delle relazioni non corrisponde/i
  );
  assert.throws(
    () => parseAndValidateStudioItemRelations(mismatched, 'item-a', catalog, 'it'),
    /numero di campi delle relazioni non corrisponde/i
  );
});

test('existing relations are presented for editing without changing target ids', () => {
  assert.deepEqual(getStudioItemRelationRows([
    { type: 'related-to', target: 'item-b', label: 'Shown title' }
  ]), [{ type: 'related-to', target: 'item-b', label: 'Shown title' }]);
  assert.equal(formatStudioItemRelationTarget({ id: 'item-b', title: 'Target title' }), 'Target title — item-b');
});

test('creation, editing, addition and removal serialize the canonical YAML shape', () => {
  const created = withStudioItemRelations({ id: 'item-a', title: 'Item A' }, [
    { type: 'related-to', target: 'item-b', label: 'Companion' }
  ]);
  assert.deepEqual(created.relations, [
    { type: 'related-to', target: 'item-b', label: 'Companion' }
  ]);

  const edited = withStudioItemRelations(created, [
    { type: 'inspired-by', target: 'item-c' },
    { type: 'related-to', target: 'item-b' }
  ]);
  assert.deepEqual(edited.relations, [
    { type: 'inspired-by', target: 'item-c' },
    { type: 'related-to', target: 'item-b' }
  ]);
  assert.equal(Object.hasOwn(withStudioItemRelations(edited, []), 'relations'), false);
});
