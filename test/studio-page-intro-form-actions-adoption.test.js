import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const root = path.resolve('.');

const introConsumers = [
  'src/routes/studio/+page.svelte',
  'src/routes/studio/about/+page.svelte',
  'src/routes/studio/catalog/+page.svelte',
  'src/routes/studio/collections/+page.svelte',
  'src/routes/studio/collections/[id]/+page.svelte',
  'src/routes/studio/collections/new/+page.svelte',
  'src/routes/studio/help/+page.svelte',
  'src/routes/studio/items/+page.svelte',
  'src/routes/studio/items/[id]/+page.svelte',
  'src/routes/studio/items/new/+page.svelte',
  'src/routes/studio/news/+page.svelte',
  'src/routes/studio/news/[id]/+page.svelte',
  'src/routes/studio/news/new/+page.svelte',
  'src/routes/studio/readiness/+page.svelte',
  'src/routes/studio/signal-clouds/+page.svelte',
  'src/routes/studio/site/appearance/+page.svelte',
  'src/routes/studio/site/contact/+page.svelte',
  'src/routes/studio/site/footer/+page.svelte',
  'src/routes/studio/site/hero/+page.svelte',
  'src/routes/studio/site/identity/+page.svelte',
  'src/routes/studio/site/layout/+page.svelte',
  'src/routes/studio/site/social/+page.svelte',
  'src/routes/studio/system/+page.svelte'
];

const actionConsumers = new Map([
  ['src/routes/studio/about/+page.svelte', 1],
  ['src/routes/studio/catalog/+page.svelte', 1],
  ['src/routes/studio/collections/+page.svelte', 2],
  ['src/routes/studio/collections/[id]/+page.svelte', 1],
  ['src/routes/studio/collections/new/+page.svelte', 1],
  ['src/routes/studio/items/+page.svelte', 2],
  ['src/routes/studio/items/[id]/+page.svelte', 1],
  ['src/routes/studio/items/new/+page.svelte', 1],
  ['src/routes/studio/news/+page.svelte', 1],
  ['src/routes/studio/news/[id]/+page.svelte', 1],
  ['src/routes/studio/news/new/+page.svelte', 1],
  ['src/routes/studio/signal-clouds/+page.svelte', 1],
  ['src/routes/studio/site/appearance/+page.svelte', 1],
  ['src/routes/studio/site/contact/+page.svelte', 1],
  ['src/routes/studio/site/footer/+page.svelte', 1],
  ['src/routes/studio/site/hero/+page.svelte', 1],
  ['src/routes/studio/site/identity/+page.svelte', 1],
  ['src/routes/studio/site/layout/+page.svelte', 1],
  ['src/routes/studio/site/social/+page.svelte', 1],
  ['src/routes/studio/system/+page.svelte', 2]
]);

const twoActionConsumers = [
  {
    file: 'src/routes/studio/collections/[id]/+page.svelte',
    href: '/studio/collections'
  },
  {
    file: 'src/routes/studio/collections/new/+page.svelte',
    href: '/studio/collections'
  },
  {
    file: 'src/routes/studio/items/[id]/+page.svelte',
    href: '/studio/items'
  },
  {
    file: 'src/routes/studio/items/new/+page.svelte',
    href: '/studio/items'
  },
  {
    file: 'src/routes/studio/news/[id]/+page.svelte',
    href: '/studio/news'
  },
  {
    file: 'src/routes/studio/news/new/+page.svelte',
    href: '/studio/news'
  }
];

const marginConsumers = [
  'src/routes/studio/collections/+page.svelte',
  'src/routes/studio/items/+page.svelte',
  'src/routes/studio/news/+page.svelte'
];

/** @param {string} relativePath */
function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), 'utf8');
}

/**
 * @param {string} source
 * @param {string} component
 */
function componentBlocks(source, component) {
  const pattern = new RegExp(
    `<${component}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${component}>`,
    'g'
  );
  return [...source.matchAll(pattern)].map((match) => match[0]);
}

/**
 * @param {string} source
 * @param {string} component
 */
function componentCount(source, component) {
  return (source.match(new RegExp(`<${component}(?:\\s|>)`, 'g')) ?? []).length;
}

/**
 * @param {string} source
 * @param {string} component
 */
function importsStudioComponent(source, component) {
  const pattern = new RegExp(
    `import\\s*\\{[^}]*\\b${component}\\b[^}]*\\}\\s*from\\s*['"]giadaware-ui-components\\/studio['"]`
  );
  return pattern.test(source);
}

test('all 23 characterized Studio introductions adopt PageIntro', () => {
  assert.equal(introConsumers.length, 23);

  let total = 0;

  for (const file of introConsumers) {
    const source = read(file);

    assert.equal(
      importsStudioComponent(source, 'PageIntro'),
      true,
      `${file} must import PageIntro from the installed Studio entry point`
    );

    const count = componentCount(source, 'PageIntro');
    assert.equal(count, 1, `${file} must render exactly one PageIntro`);
    total += count;
  }

  assert.equal(total, 23);
});

test('mixed-content PageIntro consumers preserve their preview links', () => {
  const cases = [
    {
      file: 'src/routes/studio/items/[id]/+page.svelte',
      href: 'href={`/items/${itemForm.id}`}',
      label: "t('studio.itemsEdit.preview')"
    },
    {
      file: 'src/routes/studio/news/[id]/+page.svelte',
      href: 'href={`/news/${newsForm.id}`}',
      label: "t('studio.newsEdit.preview')"
    }
  ];

  for (const entry of cases) {
    const blocks = componentBlocks(read(entry.file), 'PageIntro');
    assert.equal(blocks.length, 1);

    const block = blocks[0];
    assert.match(block, new RegExp(entry.href.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
    assert.match(block, /target="_blank"/);
    assert.match(block, /rel="noreferrer"/);
    assert.equal(block.includes(entry.label), true);
  }
});

test('all 23 standard Studio action groups adopt FormActions', () => {
  let total = 0;

  for (const [file, expectedCount] of actionConsumers) {
    const source = read(file);

    assert.equal(
      importsStudioComponent(source, 'FormActions'),
      true,
      `${file} must import FormActions from the installed Studio entry point`
    );

    const count = componentCount(source, 'FormActions');
    assert.equal(
      count,
      expectedCount,
      `${file} must render ${expectedCount} characterized FormActions group(s)`
    );

    total += count;
  }

  assert.equal(total, 23);
});

test('two-action groups preserve primary Button before secondary navigation', () => {
  for (const entry of twoActionConsumers) {
    const blocks = componentBlocks(read(entry.file), 'FormActions');
    const matching = blocks.find((block) => block.includes(`href="${entry.href}"`));

    assert.ok(matching, `${entry.file} must retain the ${entry.href} secondary link`);

    const buttonPosition = matching.indexOf('<Button');
    const linkPosition = matching.indexOf(`<a class="secondary-link" href="${entry.href}"`);

    assert.notEqual(buttonPosition, -1);
    assert.notEqual(linkPosition, -1);
    assert.equal(buttonPosition < linkPosition, true);
  }
});

test('disabled conditions and shutdown danger behavior remain consumer-owned', () => {
  const expectations = [
    ['src/routes/studio/about/+page.svelte', 'disabled={!isDirty}'],
    ['src/routes/studio/collections/new/+page.svelte', 'disabled={items.length === 0}'],
    ['src/routes/studio/items/+page.svelte', 'disabled={!itemNamesDirty}'],
    ['src/routes/studio/items/+page.svelte', 'disabled={!orderDirty}'],
    ['src/routes/studio/system/+page.svelte', 'disabled={shutdownPending}'],
    ['src/routes/studio/system/+page.svelte', 'variant="danger"']
  ];

  for (const [file, token] of expectations) {
    assert.equal(read(file).includes(token), true, `${file} must retain ${token}`);
  }

  const systemActions = componentBlocks(
    read('src/routes/studio/system/+page.svelte'),
    'FormActions'
  );

  assert.equal(systemActions.length, 2);
  assert.equal(
    systemActions.some(
      (block) =>
        block.includes('variant="danger"') &&
        block.includes('disabled={shutdownPending}')
    ),
    true
  );
});

test('order forms preserve their route-specific top margin through an adapter class', () => {
  for (const file of marginConsumers) {
    const source = read(file);
    const blocks = componentBlocks(source, 'FormActions');

    assert.equal(blocks.length >= 1, true);
    assert.equal(
      blocks.some((block) => /<FormActions[^>]*class="[^"]+"/.test(block)),
      true,
      `${file} must attach a narrow adapter class to its order FormActions`
    );
    assert.match(source, /margin-top:\s*1rem/);
  }
});

test('Atelier-Kit themes the shared components through documented custom properties', () => {
  const layout = read('src/routes/studio/+layout.svelte');

  for (const token of [
    '--giu-page-intro-margin',
    '--giu-page-intro-color',
    '--giu-page-intro-line-height',
    '--giu-page-intro-link-color',
    '--giu-form-actions-gap'
  ]) {
    assert.equal(layout.includes(token), true, `Studio layout must define ${token}`);
  }
});

test('obsolete studio-intro and actions ownership is removed', () => {
  const studioRoot = path.join(root, 'src/routes/studio');
  const stack = [studioRoot];
  const files = [];

  while (stack.length > 0) {
    const current = stack.pop();

    if (current === undefined) {
      continue;
    }

    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const absolute = path.join(current, entry.name);
      if (entry.isDirectory()) stack.push(absolute);
      else if (entry.isFile() && entry.name.endsWith('.svelte')) files.push(absolute);
    }
  }

  for (const absolute of files) {
    const relative = path.relative(root, absolute);
    const source = fs.readFileSync(absolute, 'utf8');

    assert.doesNotMatch(
      source,
      /class=["'][^"']*\bstudio-intro\b[^"']*["']/,
      `${relative} still owns the studio-intro class`
    );

    assert.doesNotMatch(
      source,
      /class=["'][^"']*(?:^|\s)actions(?:\s|$)[^"']*["']/,
      `${relative} still owns the actions class`
    );

    assert.doesNotMatch(
      source,
      /(?:^|\n)\s*(?::global\()?\.studio-intro\b/m,
      `${relative} still styles .studio-intro`
    );

    assert.doesNotMatch(
      source,
      /(?:^|\n)\s*(?::global\([^)]*)?\.actions\b/m,
      `${relative} still styles .actions`
    );
  }
});
