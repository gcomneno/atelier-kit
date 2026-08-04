#!/usr/bin/env python3
from pathlib import Path
import re

meta_path = Path('src/lib/components/StudioItemMetaFields.svelte')
meta = meta_path.read_text(encoding='utf-8')
old_key = '{#each rows as row, index (index)}'
new_key = '{#each rows as row, index (row)}'
if meta.count(old_key) != 1:
    raise RuntimeError('Meta index key not found exactly once')
meta_path.write_text(meta.replace(old_key, new_key), encoding='utf-8')

test_path = Path('test/studio-item-editable-fields.test.js')
source = test_path.read_text(encoding='utf-8')

source = re.sub(
    r'\nasync function waitForPassive\(predicate, message\) \{.*?\n\}\n',
    '\n',
    source,
    count=1,
    flags=re.DOTALL,
)

pattern = re.compile(
    r"test\('Meta index keys preserve physical DOM positions while FormData follows reordered values', async \(\) => \{.*?\n\}\);\n\n(?=test\('Gallery, Meta and Relation retain their application-owned boundaries')",
    re.DOTALL,
)
replacement = """test('Meta object keys preserve row DOM identity and FormData order during reordering', async () => {
  const dirty = [];
  const harness = await mountHarness({
    kind: 'meta',
    initialRows: [
      { label: 'Material', value: 'Wood' },
      { label: 'Year', value: '2026' },
      { label: 'Origin', value: 'Lucca' }
    ],
    labels: [],
    values: [],
    onDirty: (event) => dirty.push(event)
  });

  try {
    const identityInput = inputs(harness.target, 'meta_labels')[0];
    button(harness.target, 'Move detail row 1 down').click();
    await waitFor(() => dirty.length === 1, 'Meta move down did not notify dirty');

    assert.deepEqual(formValues(harness.window, harness.target, 'meta_labels'), [
      'Year',
      'Material',
      'Origin'
    ]);
    assert.deepEqual(formValues(harness.window, harness.target, 'meta_values'), [
      '2026',
      'Wood',
      'Lucca'
    ]);
    assert.equal(inputs(harness.target, 'meta_labels')[1], identityInput);
    assert.equal(identityInput.value, 'Material');

    button(harness.target, 'Move detail row 2 up').click();
    await waitFor(() => dirty.length === 2, 'Meta move up did not notify dirty');
    assert.deepEqual(formValues(harness.window, harness.target, 'meta_labels'), [
      'Material',
      'Year',
      'Origin'
    ]);
    assert.equal(inputs(harness.target, 'meta_labels')[0], identityInput);
    assert.equal(identityInput.value, 'Material');
  } finally {
    await harness.close();
  }
});

"""
source, count = pattern.subn(replacement, source)
if count != 1:
    raise RuntimeError(f'Meta reorder test replacement count: {count}')

old_boundary = r"  assert.match(meta, /\{#each rows as row, index \(index\)\}/);"
new_boundary = r"  assert.match(meta, /\{#each rows as row, index \(row\)\}/);"
if source.count(old_boundary) != 1:
    raise RuntimeError('Meta boundary key assertion not found exactly once')
source = source.replace(old_boundary, new_boundary)

test_path.write_text(source, encoding='utf-8')
