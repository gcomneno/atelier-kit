// @ts-nocheck

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test, { after, before } from 'node:test';
import { pathToFileURL } from 'node:url';
import { build } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import { Window } from 'happy-dom';

const root = path.resolve('.');
const galleryPath = 'src/lib/components/StudioItemGalleryFields.svelte';
const metaPath = 'src/lib/components/StudioItemMetaFields.svelte';
const relationPath = 'src/lib/components/StudioItemRelationFields.svelte';

const harnessSource = `<script>
  import { setI18nContext } from '$lib/i18n/context.js';
  import StudioItemGalleryFields from '$gallery';
  import StudioItemMetaFields from '$meta';

  let {
    kind = 'gallery',
    initialRows = [],
    labels = [],
    values = [],
    onDirty = () => {}
  } = $props();

  setI18nContext(() => 'en');

  let rows = $state(initialRows.map((row) => ({ ...row })));
  const dirtyControl = {
    checkDirty() {
      const form = document.querySelector('[data-editable-fields-harness]');
      onDirty({
        rows: rows.map((row) => ({ ...row })),
        domRowCount: form?.querySelectorAll('.ordered-list > li').length ?? -1,
        activeName: document.activeElement?.getAttribute?.('name') ?? '',
        activeValue: document.activeElement?.value ?? ''
      });
    }
  };
</script>

<form data-editable-fields-harness>
  {#if kind === 'gallery'}
    <StudioItemGalleryFields bind:rows {dirtyControl} />
  {:else}
    <StudioItemMetaFields bind:rows {labels} {values} {dirtyControl} />
  {/if}
</form>
`;

let harnessRoot;
let bundle;

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), 'utf8');
}

function installDomGlobals(window) {
  const values = {
    window,
    document: window.document,
    navigator: window.navigator,
    Node: window.Node,
    Element: window.Element,
    HTMLElement: window.HTMLElement,
    HTMLInputElement: window.HTMLInputElement,
    HTMLButtonElement: window.HTMLButtonElement,
    SVGElement: window.SVGElement,
    Text: window.Text,
    Comment: window.Comment,
    Event: window.Event,
    CustomEvent: window.CustomEvent,
    MouseEvent: window.MouseEvent,
    KeyboardEvent: window.KeyboardEvent,
    FocusEvent: window.FocusEvent,
    FormData: window.FormData,
    MutationObserver: window.MutationObserver,
    getComputedStyle: window.getComputedStyle.bind(window),
    requestAnimationFrame: window.requestAnimationFrame.bind(window),
    cancelAnimationFrame: window.cancelAnimationFrame.bind(window)
  };
  const descriptors = new Map();

  for (const [name, value] of Object.entries(values)) {
    descriptors.set(name, Object.getOwnPropertyDescriptor(globalThis, name));
    Object.defineProperty(globalThis, name, {
      configurable: true,
      writable: true,
      value
    });
  }

  return () => {
    for (const [name, descriptor] of descriptors) {
      if (descriptor) Object.defineProperty(globalThis, name, descriptor);
      else Reflect.deleteProperty(globalThis, name);
    }
  };
}

async function settle() {
  await Promise.resolve();
  bundle.flushSync();
  await new Promise((resolve) => setTimeout(resolve, 0));
  bundle.flushSync();
  await Promise.resolve();
}

async function waitFor(predicate, message) {
  for (let attempt = 0; attempt < 20; attempt += 1) {
    await settle();
    if (predicate()) return;
  }
  assert.fail(message);
}

async function mountHarness(props) {
  const window = new Window({ url: 'http://localhost/' });
  const restore = installDomGlobals(window);
  const target = window.document.createElement('div');
  window.document.body.append(target);
  const instance = bundle.mount(bundle.Harness, { target, props });
  await settle();

  return {
    window,
    target,
    async close() {
      const completion = bundle.unmount(instance);
      await Promise.race([
        completion,
        new Promise((resolve) => setTimeout(resolve, 50))
      ]);
      restore();
      window.close();
    }
  };
}

function rows(target) {
  return [...target.querySelectorAll('.ordered-list > li')];
}

function inputs(target, name) {
  return [...target.querySelectorAll(`input[name="${name}"]`)];
}

function button(target, accessibleName) {
  const match = [...target.querySelectorAll('button')].find((candidate) => {
    const aria = candidate.getAttribute('aria-label');
    const text = candidate.textContent?.trim();
    return aria === accessibleName || text === accessibleName;
  });
  assert.ok(match, `button not found: ${accessibleName}`);
  return match;
}

function formValues(window, target, name) {
  const form = target.querySelector('form');
  assert.ok(form);
  return [...new window.FormData(form).getAll(name)];
}

before(async () => {
  console.error('[issue225] build:start');
  harnessRoot = fs.mkdtempSync(path.join(root, '.tmp-editable-fields-client-'));
  fs.writeFileSync(path.join(harnessRoot, 'Harness.svelte'), harnessSource);
  fs.writeFileSync(
    path.join(harnessRoot, 'entry.js'),
    "export { default as Harness } from './Harness.svelte';\nexport { flushSync, mount, unmount } from 'svelte';\n"
  );

  await build({
    configFile: false,
    root: harnessRoot,
    logLevel: 'error',
    plugins: [svelte()],
    resolve: {
      alias: [
        { find: '$gallery', replacement: path.join(root, galleryPath) },
        { find: '$meta', replacement: path.join(root, metaPath) },
        { find: '$lib', replacement: path.join(root, 'src/lib') }
      ],
      dedupe: ['svelte']
    },
    build: {
      outDir: path.join(harnessRoot, 'dist'),
      emptyOutDir: true,
      minify: false,
      lib: {
        entry: path.join(harnessRoot, 'entry.js'),
        formats: ['es'],
        fileName: () => 'bundle.js'
      }
    }
  });

  console.error('[issue225] build:done');
  bundle = await import(
    `${pathToFileURL(path.join(harnessRoot, 'dist/bundle.js')).href}?${Date.now()}`
  );
  console.error('[issue225] import:done');
});

after(() => {
  if (harnessRoot) fs.rmSync(harnessRoot, { recursive: true, force: true });
});

test('Gallery renders zero, one and multiple rows with its minimum-row controls', async () => {
  const empty = await mountHarness({ kind: 'gallery', initialRows: [] });
  try {
    assert.equal(rows(empty.target).length, 0);
    assert.match(empty.target.textContent, /No gallery images yet/);
    assert.equal(button(empty.target, '+ Add image').disabled, false);
  } finally {
    await empty.close();
  }

  const one = await mountHarness({
    kind: 'gallery',
    initialRows: [{ file: 'a.jpg', alt: 'A', role: 'cover' }]
  });
  try {
    assert.equal(rows(one.target).length, 1);
    assert.equal(inputs(one.target, 'gallery_files').length, 1);
    assert.equal(inputs(one.target, 'gallery_alts').length, 1);
    assert.equal(inputs(one.target, 'gallery_roles').length, 1);
    assert.equal(button(one.target, 'Move image 1 up').disabled, true);
    assert.equal(button(one.target, 'Move image 1 down').disabled, true);
    assert.equal(button(one.target, 'Remove').disabled, true);
  } finally {
    await one.close();
  }

  const multiple = await mountHarness({
    kind: 'gallery',
    initialRows: [
      { file: 'a.jpg', alt: 'A', role: 'cover' },
      { file: 'b.jpg', alt: 'B', role: '' },
      { file: 'c.jpg', alt: 'C', role: '' }
    ]
  });
  try {
    assert.equal(rows(multiple.target).length, 3);
    assert.equal(button(multiple.target, 'Move image 1 up').disabled, true);
    assert.equal(button(multiple.target, 'Move image 2 up').disabled, false);
    assert.equal(button(multiple.target, 'Move image 2 down').disabled, false);
    assert.equal(button(multiple.target, 'Move image 3 down').disabled, true);
    assert.equal([...multiple.target.querySelectorAll('button')].filter((entry) => entry.textContent?.trim() === 'Remove').length, 3);
  } finally {
    await multiple.close();
  }
});

test('Gallery add and remove notify dirty after DOM updates and move focus predictably', async () => {
  const dirty = [];
  const harness = await mountHarness({
    kind: 'gallery',
    initialRows: [{ file: 'a.jpg', alt: 'A', role: 'cover' }],
    onDirty: (event) => dirty.push(event)
  });

  try {
    button(harness.target, '+ Add image').click();
    assert.equal(dirty.length, 0);
    await waitFor(() => dirty.length === 1, 'Gallery add did not notify dirty');

    assert.equal(dirty[0].domRowCount, 2);
    assert.deepEqual(dirty[0].rows, [
      { file: 'a.jpg', alt: 'A', role: 'cover' },
      { file: '', alt: '', role: '' }
    ]);
    assert.equal(harness.window.document.activeElement, inputs(harness.target, 'gallery_files')[1]);

    const removeButtons = [...harness.target.querySelectorAll('button')].filter(
      (entry) => entry.textContent?.trim() === 'Remove'
    );
    removeButtons[1].click();
    assert.equal(dirty.length, 1);
    await waitFor(() => dirty.length === 2, 'Gallery remove did not notify dirty');

    assert.equal(dirty[1].domRowCount, 1);
    assert.deepEqual(dirty[1].rows, [{ file: 'a.jpg', alt: 'A', role: 'cover' }]);
    assert.equal(harness.window.document.activeElement, inputs(harness.target, 'gallery_files')[0]);
    assert.equal(button(harness.target, 'Remove').disabled, true);
  } finally {
    await harness.close();
  }
});

test('Gallery object keys preserve row DOM identity and FormData order during reordering', async () => {
  const dirty = [];
  const harness = await mountHarness({
    kind: 'gallery',
    initialRows: [
      { file: 'a.jpg', alt: 'A alt', role: 'cover' },
      { file: 'b.jpg', alt: 'B alt', role: 'detail' },
      { file: 'c.jpg', alt: 'C alt', role: '' }
    ],
    onDirty: (event) => dirty.push(event)
  });

  try {
    const identityInput = inputs(harness.target, 'gallery_alts')[1];
    button(harness.target, 'Move image 2 up').click();
    await waitFor(() => dirty.length === 1, 'Gallery move up did not notify dirty');

    assert.deepEqual(formValues(harness.window, harness.target, 'gallery_files'), [
      'b.jpg',
      'a.jpg',
      'c.jpg'
    ]);
    assert.deepEqual(formValues(harness.window, harness.target, 'gallery_alts'), [
      'B alt',
      'A alt',
      'C alt'
    ]);
    assert.deepEqual(formValues(harness.window, harness.target, 'gallery_roles'), [
      'detail',
      'cover',
      ''
    ]);
    assert.equal(inputs(harness.target, 'gallery_alts')[0], identityInput);
    assert.equal(identityInput.closest('li'), rows(harness.target)[0]);

    button(harness.target, 'Move image 1 down').click();
    await waitFor(() => dirty.length === 2, 'Gallery move down did not notify dirty');
    assert.deepEqual(formValues(harness.window, harness.target, 'gallery_files'), [
      'a.jpg',
      'b.jpg',
      'c.jpg'
    ]);
    assert.equal(inputs(harness.target, 'gallery_alts')[1], identityInput);
    assert.equal(identityInput.closest('li'), rows(harness.target)[1]);
  } finally {
    await harness.close();
  }
});

test('Meta renders zero, one and multiple rows with datalists and accessible actions', async () => {
  const empty = await mountHarness({
    kind: 'meta',
    initialRows: [],
    labels: ['Material', 'Year'],
    values: ['Wood', '2026']
  });
  try {
    assert.equal(rows(empty.target).length, 0);
    assert.match(empty.target.textContent, /No detail rows yet/);
    assert.deepEqual(
      [...empty.target.querySelectorAll('#item-meta-label-suggestions option')].map((entry) => entry.value),
      ['Material', 'Year']
    );
    assert.deepEqual(
      [...empty.target.querySelectorAll('#item-meta-value-suggestions option')].map((entry) => entry.value),
      ['Wood', '2026']
    );
  } finally {
    await empty.close();
  }

  const multiple = await mountHarness({
    kind: 'meta',
    initialRows: [
      { label: 'Material', value: 'Wood' },
      { label: 'Year', value: '2026' }
    ],
    labels: ['Material', 'Year'],
    values: ['Wood', '2026']
  });
  try {
    assert.equal(rows(multiple.target).length, 2);
    assert.equal(inputs(multiple.target, 'meta_labels')[0].getAttribute('list'), 'item-meta-label-suggestions');
    assert.equal(inputs(multiple.target, 'meta_values')[0].getAttribute('list'), 'item-meta-value-suggestions');
    assert.equal(button(multiple.target, 'Move detail row 1 up').disabled, true);
    assert.equal(button(multiple.target, 'Move detail row 1 down').disabled, false);
    assert.equal(button(multiple.target, 'Move detail row 2 up').disabled, false);
    assert.equal(button(multiple.target, 'Move detail row 2 down').disabled, true);
    assert.equal([...multiple.target.querySelectorAll('button')].filter((entry) => entry.textContent?.trim() === 'Remove').length, 2);
  } finally {
    await multiple.close();
  }
});

test('Meta add and remove support zero rows, notify dirty after updates and define focus', async () => {
  const dirty = [];
  const harness = await mountHarness({
    kind: 'meta',
    initialRows: [],
    labels: [],
    values: [],
    onDirty: (event) => dirty.push(event)
  });

  try {
    button(harness.target, '+ Add row').click();
    assert.equal(dirty.length, 0);
    await waitFor(() => dirty.length === 1, 'Meta first add did not notify dirty');
    assert.equal(dirty[0].domRowCount, 1);
    assert.deepEqual(dirty[0].rows, [{ label: '', value: '' }]);
    assert.equal(harness.window.document.activeElement, inputs(harness.target, 'meta_labels')[0]);

    button(harness.target, '+ Add row').click();
    await waitFor(() => dirty.length === 2, 'Meta second add did not notify dirty');
    assert.equal(harness.window.document.activeElement, inputs(harness.target, 'meta_labels')[1]);

    const labelInputs = inputs(harness.target, 'meta_labels');
    const valueInputs = inputs(harness.target, 'meta_values');
    labelInputs[0].value = 'Material';
    labelInputs[0].dispatchEvent(new harness.window.Event('input', { bubbles: true }));
    valueInputs[0].value = 'Wood';
    valueInputs[0].dispatchEvent(new harness.window.Event('input', { bubbles: true }));
    await waitFor(() => dirty.length >= 4, 'Meta input edits did not notify dirty');

    let removeButtons = [...harness.target.querySelectorAll('button')].filter(
      (entry) => entry.textContent?.trim() === 'Remove'
    );
    removeButtons[0].click();
    await waitFor(() => rows(harness.target).length === 1, 'Meta first remove did not update DOM');
    assert.equal(harness.window.document.activeElement, inputs(harness.target, 'meta_labels')[0]);

    removeButtons = [...harness.target.querySelectorAll('button')].filter(
      (entry) => entry.textContent?.trim() === 'Remove'
    );
    removeButtons[0].click();
    await waitFor(() => rows(harness.target).length === 0, 'Meta final remove did not update DOM');
    assert.equal(harness.window.document.activeElement, button(harness.target, '+ Add row'));
  } finally {
    await harness.close();
  }
});

test('Meta index keys preserve physical DOM positions while FormData follows reordered values', async () => {
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
    const physicalFirst = inputs(harness.target, 'meta_labels')[0];
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
    assert.equal(physicalFirst, inputs(harness.target, 'meta_labels')[0]);
    assert.equal(physicalFirst.value, 'Year');

    button(harness.target, 'Move detail row 2 up').click();
    await waitFor(() => dirty.length === 2, 'Meta move up did not notify dirty');
    assert.deepEqual(formValues(harness.window, harness.target, 'meta_labels'), [
      'Material',
      'Year',
      'Origin'
    ]);
    assert.equal(harness.window.document.activeElement, physicalFirst);
    assert.equal(physicalFirst.value, 'Material');
  } finally {
    await harness.close();
  }
});

test('Gallery, Meta and Relation retain their application-owned boundaries', () => {
  const gallery = read(galleryPath);
  const meta = read(metaPath);
  const relation = read(relationPath);

  assert.match(gallery, /name="gallery_files"/);
  assert.match(gallery, /name="gallery_alts"/);
  assert.match(gallery, /name="gallery_roles"/);
  assert.match(gallery, /\{#each rows as row, index \(row\)\}/);
  assert.match(gallery, /rows\.length <= 1/);

  assert.match(meta, /name="meta_labels"/);
  assert.match(meta, /name="meta_values"/);
  assert.match(meta, /\{#each rows as row, index \(index\)\}/);
  assert.match(meta, /item-meta-label-suggestions/);
  assert.match(meta, /item-meta-value-suggestions/);

  for (const source of [gallery, meta]) {
    assert.match(source, /await tick\(\);\s*dirtyControl\.checkDirty\?\.\(\)/);
    assert.doesNotMatch(source, /StudioItemRelationFields|DynamicFieldList|EditableList/);
  }

  assert.match(relation, /combobox|listbox|search/i);
  assert.doesNotMatch(relation, /DynamicFieldList|EditableList/);
});
