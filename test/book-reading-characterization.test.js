// @ts-nocheck

import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test, { after, before } from 'node:test';
import { pathToFileURL } from 'node:url';
import { build, createServer } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import { Window } from 'happy-dom';

const projectRoot = process.cwd();
let harnessRoot;
let runtime;

const harnessSource = `<script>
  import BookReading from '$reader';

  let { post, backHref = '/news', backLabel } = $props();
</script>

<BookReading {post} {backHref} {backLabel} />
`;

function installDomGlobals(window) {
  const values = {
    window,
    document: window.document,
    navigator: window.navigator,
    Node: window.Node,
    Element: window.Element,
    HTMLElement: window.HTMLElement,
    HTMLAnchorElement: window.HTMLAnchorElement,
    HTMLHeadingElement: window.HTMLHeadingElement,
    Text: window.Text,
    Comment: window.Comment,
    Event: window.Event,
    CustomEvent: window.CustomEvent,
    MutationObserver: window.MutationObserver,
    getComputedStyle: window.getComputedStyle.bind(window),
    requestAnimationFrame: window.requestAnimationFrame.bind(window),
    cancelAnimationFrame: window.cancelAnimationFrame.bind(window)
  };
  const descriptors = new Map();

  for (const [name, value] of Object.entries(values)) {
    descriptors.set(name, Object.getOwnPropertyDescriptor(globalThis, name));
    Object.defineProperty(globalThis, name, { configurable: true, writable: true, value });
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
  runtime.flushSync();
  await new Promise((resolve) => setTimeout(resolve, 0));
  runtime.flushSync();
}

async function mountReader(props) {
  const window = new Window({ url: 'http://localhost/' });
  const restore = installDomGlobals(window);
  const target = window.document.createElement('div');
  window.document.body.append(target);
  const instance = runtime.mount(runtime.Harness, { target, props });
  await settle();

  return {
    target,
    async close() {
      await runtime.unmount(instance);
      restore();
      window.close();
    }
  };
}

async function renderReader(props) {
  const server = await createServer({
    configFile: false,
    root: harnessRoot,
    logLevel: 'error',
    appType: 'custom',
    plugins: [svelte({ compilerOptions: { css: 'injected' } })],
    resolve: {
      alias: {
        $reader: path.join(projectRoot, 'src/lib/components/BookReading.svelte'),
        $lib: path.join(projectRoot, 'src/lib')
      },
      dedupe: ['svelte']
    },
    server: {
      middlewareMode: true,
      hmr: false,
      fs: { allow: [projectRoot, harnessRoot] }
    }
  });

  try {
    const harness = await server.ssrLoadModule('/Harness.svelte');
    const svelteServer = await server.ssrLoadModule('svelte/server');

    return svelteServer.render(harness.default, { props });
  } finally {
    await server.close();
  }
}

after(() => {
  if (harnessRoot) fs.rmSync(harnessRoot, { recursive: true, force: true });
});

before(async () => {
  harnessRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'atelier-kit-book-reading-'));
  fs.symlinkSync(
    path.join(projectRoot, 'node_modules'),
    path.join(harnessRoot, 'node_modules'),
    process.platform === 'win32' ? 'junction' : 'dir'
  );
  fs.writeFileSync(path.join(harnessRoot, 'Harness.svelte'), harnessSource);
  fs.writeFileSync(
    path.join(harnessRoot, 'entry.js'),
    `export { default as Harness } from './Harness.svelte';
export { parseBookContent, isBookReadingFormat, linkifyPlainText } from ${JSON.stringify(path.join(projectRoot, 'src/lib/book-content.js'))};
export { flushSync, hydrate, mount, unmount } from 'svelte';
`
  );

  await build({
    configFile: false,
    root: harnessRoot,
    cacheDir: path.join(harnessRoot, '.vite'),
    logLevel: 'error',
    plugins: [svelte()],
    resolve: {
      alias: {
        $reader: path.join(projectRoot, 'src/lib/components/BookReading.svelte'),
        $lib: path.join(projectRoot, 'src/lib')
      },
      dedupe: ['svelte']
    },
    build: {
      outDir: path.join(harnessRoot, 'dist'),
      emptyOutDir: true,
      minify: false,
      lib: {
        entry: path.join(harnessRoot, 'entry.js'),
        formats: ['es'],
        fileName: () => 'bundle.js',
        cssFileName: 'bundle'
      }
    }
  });

  runtime = await import(`${pathToFileURL(path.join(harnessRoot, 'dist/bundle.js')).href}?${Date.now()}`);
});

test('parser normalizes multiline input and preserves opening reading classifications', () => {
  const body = `  Opening note${'  '}

  «A short citation»

  PART ONE — MORNING

  Quiet Arrival

  This introductory passage uses more than sixty characters to freeze the current opening treatment.

  Plain sentence, now the chapter body begins.

  "Are we ready?"

  Brief beat

  This multiline paragraph contains enough ordinary words, so its first line is retained.
  Its second line becomes a separate normalized block, which remains prose.`;

  assert.deepEqual(runtime.parseBookContent(body), [
    { type: 'lead', text: 'Opening note' },
    { type: 'epigraph', text: '«A short citation»' },
    { type: 'section-title', text: 'PART ONE — MORNING' },
    { type: 'chapter-title', text: 'Quiet Arrival' },
    { type: 'intro', text: 'This introductory passage uses more than sixty characters to freeze the current opening treatment.' },
    { type: 'paragraph', text: 'Plain sentence, now the chapter body begins.', dropCap: false },
    { type: 'dialogue', text: '"Are we ready?"' },
    { type: 'staccato', text: 'Brief beat' },
    { type: 'paragraph', text: 'This multiline paragraph contains enough ordinary words, so its first line is retained.', dropCap: false },
    { type: 'paragraph', text: 'Its second line becomes a separate normalized block, which remains prose.', dropCap: false }
  ]);
});

test('parser schedules and clears drop caps around datelines and separators', () => {
  const blocks = runtime.parseBookContent(`Opening note

maggio 2024

First chapter paragraph, with ordinary prose.

—

giugno 2024

—

Second chapter paragraph, after the reset.`);

  assert.deepEqual(blocks, [
    { type: 'lead', text: 'Opening note' },
    { type: 'dateline', text: 'maggio 2024' },
    { type: 'paragraph', text: 'First chapter paragraph, with ordinary prose.', dropCap: true },
    { type: 'ornament' },
    { type: 'dateline', text: 'giugno 2024' },
    { type: 'ornament' },
    { type: 'paragraph', text: 'Second chapter paragraph, after the reset.', dropCap: false }
  ]);
});

test('parser distinguishes notes and CTAs, and link splitting accepts only HTTP URLs', () => {
  const blocks = runtime.parseBookContent(`Opening note

Testo in bozza

Read https://example.test/edition.`);

  assert.deepEqual(blocks, [
    { type: 'lead', text: 'Opening note' },
    { type: 'note', text: 'Testo in bozza' },
    { type: 'cta', text: 'Read https://example.test/edition.' }
  ]);
  assert.deepEqual(runtime.linkifyPlainText('Read https://example.test/edition.'), {
    before: 'Read ',
    url: 'https://example.test/edition.',
    after: ''
  });
  assert.deepEqual(runtime.linkifyPlainText('Read javascript:alert(1)'), {
    before: 'Read javascript:alert(1)',
    url: null,
    after: ''
  });
});

test('book format selection preserves explicit and legacy fallbacks', () => {
  assert.equal(runtime.isBookReadingFormat('book', 'ordinary-news'), true);
  assert.equal(runtime.isBookReadingFormat(undefined, 'sample-estratto'), true);
  assert.equal(runtime.isBookReadingFormat(undefined, 'sample-anteprima'), true);
  assert.equal(runtime.isBookReadingFormat(undefined, 'sample-in-lavorazione'), true);
  assert.equal(runtime.isBookReadingFormat('article', 'ordinary-news'), false);
  assert.equal(runtime.isBookReadingFormat(undefined, 'sample-estratto-more'), false);
});

test('BookReading mounts the current semantic reader and safely renders marked metadata', async () => {
  const reader = await mountReader({
    backHref: '/news?from=reader',
    backLabel: 'Back to updates',
    post: {
      id: 'neutral-reading',
      title: '{accent}Marked{/accent} edition',
      excerpt: '{larger}Series{/larger}\n\n{muted}Volume{/muted}',
      body: `Opening note

—

PART ONE — MORNING

Quiet Arrival

maggio 2024

First chapter paragraph, with ordinary prose.

Read https://example.test/edition.

Testo in bozza

<img src=x onerror=alert(1)>`
    }
  });

  try {
    const { target } = reader;
    const main = target.querySelector('main.book-reading');
    const article = target.querySelector('article.book-page');
    const title = target.querySelector('h1#book-title');
    const backLink = target.querySelector('a.back-link');
    const cta = target.querySelector('.book-cta a');

    assert.ok(main);
    assert.ok(article);
    assert.equal(article.getAttribute('aria-labelledby'), 'book-title');
    assert.equal(title.textContent, 'Marked edition');
    assert.ok(title.querySelector('.mark-accent'));
    assert.equal(target.querySelectorAll('.book-series').length, 2);
    assert.ok(target.querySelector('.book-series .mark-larger'));
    assert.ok(target.querySelector('.book-series .mark-muted'));
    assert.equal(backLink.getAttribute('href'), '/news?from=reader');
    assert.equal(backLink.textContent, 'Back to updates');
    assert.ok(target.querySelector('.book-lead'));
    assert.equal(target.querySelector('h2.book-section-title').textContent, 'PART ONE — MORNING');
    assert.equal(target.querySelector('h2.book-chapter-title').textContent, 'Quiet Arrival');
    assert.ok(target.querySelector('.book-dateline'));
    assert.ok(target.querySelector('.book-paragraph.drop-cap'));
    assert.equal(cta.getAttribute('href'), 'https://example.test/edition.');
    assert.equal(cta.getAttribute('target'), '_blank');
    assert.equal(cta.getAttribute('rel'), 'noopener noreferrer');
    assert.equal(target.querySelector('.book-note').textContent, 'Testo in bozza');
    assert.equal(target.querySelector('img'), null);
    assert.match(target.textContent, /<img src=x onerror=alert\(1\)>/);
    assert.doesNotMatch(target.innerHTML, /\{(?:accent|larger|muted)\}/);
    assert.match(
      fs.readFileSync(path.join(harnessRoot, 'dist/bundle.css'), 'utf8'),
      /@media\s*\(min-width:\s*720px\)[\s\S]*\.book-page[\s\S]*min-height:\s*28rem/
    );
  } finally {
    await reader.close();
  }
});

test('BookReading prefers explicit structured blocks and preserves colophon order', async () => {
  const reader = await mountReader({
    backLabel: 'Back to updates',
    post: {
      id: 'explicit-structured-reading',
      title: 'Neutral edition',
      excerpt: 'Neutral series',
      body: 'LEGACY BODY MUST NOT RENDER',
      reading_blocks: [
        { type: 'colophon', role: 'title', text: 'Colophon title' },
        { type: 'colophon', role: 'series', text: 'Series name' },
        { type: 'colophon', role: 'author', text: 'Author name' },
        { type: 'colophon', role: 'imprint', text: 'Imprint name' },
        { type: 'colophon', role: 'body', text: 'Publishing note' },
        { type: 'colophon', role: 'epigraph', text: 'Colophon epigraph' },
        { type: 'colophon', role: 'tagline', text: 'Closing tagline' },
        { type: 'ornament' },
        { type: 'chapter-title', text: 'Chapter One' },
        { type: 'paragraph', text: 'Chapter content', drop_cap: true }
      ]
    }
  });

  try {
    const { target } = reader;
    const colophonEntries = [...target.querySelectorAll('[data-colophon-role]')];

    assert.deepEqual(
      colophonEntries.map((entry) => entry.getAttribute('data-colophon-role')),
      ['title', 'series', 'author', 'imprint', 'body', 'epigraph', 'tagline']
    );

    assert.deepEqual(
      colophonEntries.map((entry) => entry.textContent),
      [
        'Colophon title',
        'Series name',
        'Author name',
        'Imprint name',
        'Publishing note',
        'Colophon epigraph',
        'Closing tagline'
      ]
    );

    assert.equal(target.querySelector('.book-ornament')?.textContent, '§');
    assert.equal(target.querySelector('h2.book-chapter-title')?.textContent, 'Chapter One');
    assert.equal(target.querySelector('.book-paragraph.drop-cap')?.textContent, 'Chapter content');
    assert.doesNotMatch(target.textContent, /LEGACY BODY MUST NOT RENDER/);

    const css = fs.readFileSync(path.join(harnessRoot, 'dist/bundle.css'), 'utf8');
    assert.match(css, /--book-reading-colophon-color/);
    assert.match(css, /--book-reading-colophon-title-color/);
    assert.match(css, /--book-reading-colophon-muted-color/);
    assert.match(css, /--book-reading-colophon-accent-color/);
    assert.match(css, /padding:\s*clamp\(/);
    assert.match(css, /@media\s*\(min-width:\s*720px\)/);
  } finally {
    await reader.close();
  }
});

test('BookReading falls back to legacy body when explicit blocks contain no readable content', async () => {
  for (const readingBlocks of [
    [],
    [null, 42, { type: 'paragraph', text: '   ' }]
  ]) {
    const reader = await mountReader({
      backLabel: 'Back to updates',
      post: {
        id: 'structured-reading-safe-fallback',
        title: 'Fallback edition',
        body: `LEGACY FALLBACK LEAD

Legacy fallback paragraph with enough ordinary prose to remain readable.`,
        reading_blocks: readingBlocks
      }
    });

    try {
      const { target } = reader;

      assert.equal(
        target.querySelector('.book-lead')?.textContent,
        'LEGACY FALLBACK LEAD'
      );
      assert.match(target.textContent, /Legacy fallback paragraph/);
    } finally {
      await reader.close();
    }
  }
});

test('BookReading preserves structured semantics across SSR and hydration', async () => {
  const props = {
    backHref: '/updates',
    backLabel: 'Back to updates',
    post: {
      id: 'structured-reading-ssr',
      title: 'Server-rendered edition',
      excerpt: 'A neutral hydration fixture.',
      body: 'Legacy fallback must remain unused.',
      reading_blocks: [
        { type: 'colophon', role: 'title', text: 'Publication title' },
        { type: 'colophon', role: 'author', text: 'Publication author' },
        { type: 'ornament' },
        { type: 'chapter-title', text: 'Hydrated Chapter' },
        {
          type: 'paragraph',
          text: 'The server-rendered paragraph remains readable.',
          drop_cap: true
        }
      ]
    }
  };

  const ssr = await renderReader(props);

  assert.match(
    ssr.body,
    /<main[^>]*class="[^"]*\bbook-reading\b[^"]*"/
  );
  assert.match(
    ssr.body,
    /<article[^>]*\bclass="[^"]*\bbook-page\b[^"]*"[^>]*aria-labelledby="book-title"/
  );
  assert.match(ssr.body, /data-colophon-role="title"/);
  assert.match(ssr.body, /data-colophon-role="author"/);
  assert.match(ssr.body, /Hydrated Chapter/);
  assert.doesNotMatch(ssr.body, /Legacy fallback must remain unused/);

  const window = new Window({ url: 'http://localhost/' });
  const restore = installDomGlobals(window);
  const target = window.document.createElement('div');
  target.innerHTML = ssr.body;
  window.document.body.append(target);

  const originalMain = target.querySelector('main.book-reading');
  const originalArticle = target.querySelector('article.book-page');
  const originalTitle = target.querySelector('h1#book-title');
  const originalChapter = target.querySelector('h2.book-chapter-title');
  const originalParagraph = target.querySelector('.book-paragraph.drop-cap');
  const originalColophon = [
    ...target.querySelectorAll('[data-colophon-role]')
  ];

  let instance;

  try {
    assert.ok(originalMain);
    assert.ok(originalArticle);
    assert.ok(originalTitle);
    assert.ok(originalChapter);
    assert.ok(originalParagraph);
    assert.equal(originalColophon.length, 2);

    instance = runtime.hydrate(runtime.Harness, { target, props });
    await settle();

    assert.equal(target.querySelector('main.book-reading'), originalMain);
    assert.equal(target.querySelector('article.book-page'), originalArticle);
    assert.equal(target.querySelector('h1#book-title'), originalTitle);
    assert.equal(
      target.querySelector('h2.book-chapter-title'),
      originalChapter
    );
    assert.equal(
      target.querySelector('.book-paragraph.drop-cap'),
      originalParagraph
    );

    const hydratedColophon = [
      ...target.querySelectorAll('[data-colophon-role]')
    ];

    assert.deepEqual(hydratedColophon, originalColophon);
    assert.deepEqual(
      hydratedColophon.map((entry) => entry.getAttribute('data-colophon-role')),
      ['title', 'author']
    );
    assert.equal(target.querySelectorAll('main.book-reading').length, 1);
    assert.equal(target.querySelectorAll('article.book-page').length, 1);
    assert.equal(target.querySelectorAll('h1#book-title').length, 1);
    assert.equal(
      target.querySelector('.book-paragraph.drop-cap')?.textContent,
      'The server-rendered paragraph remains readable.'
    );
  } finally {
    if (instance) {
      await runtime.unmount(instance);
    }

    restore();
    window.close();
  }
});
