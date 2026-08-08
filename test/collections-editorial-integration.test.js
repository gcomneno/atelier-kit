import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { parse, stringify } from 'yaml';

const repoRoot = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');

function writeCollectionsFixture(root) {
  fs.mkdirSync(path.join(root, 'config'), { recursive: true });
  fs.writeFileSync(
    path.join(root, 'config/collections.yaml'),
    stringify({
      collections: {
        home_eyebrow: 'Home series',
        page_eyebrow: 'Page archive',
        title: 'Series archive',
        intro: 'Grouped by theme or series.',
        future_field: 'Keep me'
      }
    })
  );
}

test('collections editorial load/save preserves future fields and resolves fallbacks', async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'atelier-collections-editorial-'));
  const originalCwd = process.cwd();

  try {
    writeCollectionsFixture(root);
    process.chdir(root);

    const {
      loadCollectionsEditorialForm,
      writeCollectionsEditorialForm
    } = await import(new URL('../src/lib/server/studio-io.js', import.meta.url));
    const {
      normalizeCollectionsEditorialConfig,
      resolveCollectionsPageEyebrow,
      resolveCollectionsPageIntro,
      resolveCollectionsPageTitle
    } = await import(new URL('../src/lib/collections-editorial.js', import.meta.url));

    assert.deepEqual(loadCollectionsEditorialForm('en'), {
      home_eyebrow: 'Home series',
      page_eyebrow: 'Page archive',
      title: 'Series archive',
      intro: 'Grouped by theme or series.'
    });

    writeCollectionsEditorialForm(
      {
        home_eyebrow: '  New home  ',
        page_eyebrow: '',
        title: '  New title  ',
        intro: '  New intro  '
      },
      'en'
    );

    const saved = parse(fs.readFileSync(path.join(root, 'config/collections.yaml'), 'utf8'));

    assert.deepEqual(saved.collections, {
      home_eyebrow: 'New home',
      title: 'New title',
      intro: 'New intro',
      future_field: 'Keep me'
    });

    const empty = normalizeCollectionsEditorialConfig(null);
    assert.equal(resolveCollectionsPageTitle(empty, 'en'), 'Collections');
    assert.equal(resolveCollectionsPageTitle(empty, 'it'), 'Collezioni');
    assert.equal(
      resolveCollectionsPageIntro(empty, 'items', 'en'),
      'Groups of items selected by theme or series.'
    );
    assert.equal(
      resolveCollectionsPageIntro(empty, 'oggetti', 'it'),
      'Gruppi di oggetti selezionati per tema o serie.'
    );
    assert.equal(
      resolveCollectionsPageEyebrow(empty, 'Structural label', 'en'),
      'Structural label'
    );
  } finally {
    process.chdir(originalCwd);
    fs.rmSync(root, { recursive: true, force: true });
  }
});
