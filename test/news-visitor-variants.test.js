import assert from 'node:assert/strict';
import test from 'node:test';
import { createServer } from 'vite';

const posts = [
  {
    id: 'first',
    title: 'A deliberately long news title that remains readable in a narrow sidebar',
    date: '2026-07-19',
    excerpt: 'Sidebar teaser that must not be rendered',
    body: 'First article body',
    image_file: ''
  },
  {
    id: 'second',
    title: 'Second news item',
    date: '2026-07-18',
    excerpt: 'Second sidebar teaser that must not be rendered',
    body: 'Second article body',
    image_file: ''
  }
];

/** @type {import('vite').ViteDevServer} */
let server;
/** @type {typeof import('svelte/server')} */
let svelteServer;

test.before(async () => {
  server = await createServer({
    server: { middlewareMode: true, hmr: false },
    appType: 'custom'
  });
  svelteServer = /** @type {typeof import('svelte/server')} */ (
    await server.ssrLoadModule('svelte/server')
  );
});

test.after(async () => {
  await server.close();
});

test('sidebar News renders every date and title without teaser nodes', async () => {
  const component = await server.ssrLoadModule('/src/lib/components/CatalogSidebar.svelte');
  const { body } = svelteServer.render(component.default, {
    props: { newsPosts: posts, site: { language: 'en' } }
  });

  for (const post of posts) {
    assert.match(body, new RegExp(`datetime="${post.date}"`));
    assert.match(body, new RegExp(`href="/news/${post.id}"`));
    assert.match(body, new RegExp(post.title));
    assert.doesNotMatch(body, new RegExp(post.excerpt));
  }
});

test('main News list keeps the teaser available', async () => {
  const page = await server.ssrLoadModule('/src/routes/news/+page.svelte');
  const { body } = svelteServer.render(page.default, {
    props: {
      data: {
        posts,
        site: { language: 'en', name: 'Test site' },
        pageEyebrow: 'Journal',
        feedUrl: 'https://example.test/news/rss.xml'
      }
    }
  });

  for (const post of posts) {
    assert.match(body, new RegExp(post.title));
    assert.match(body, new RegExp(`href="/news/${post.id}"`));
    assert.match(body, new RegExp(post.excerpt));
  }
});
