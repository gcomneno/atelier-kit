import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { parse, stringify } from 'yaml';

const kitRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const projectEntries = [
  'config',
  'content',
  'scripts',
  'src',
  'static',
  'vendor',
  'jsconfig.json',
  'package.json',
  'package-lock.json',
  'vite.config.js'
];

function newsForm({
  title = 'Edited title',
  date = '2026-03-04',
  body = 'Edited body with enough text to remain structurally useful.',
  excerpt = '',
  imageFile = '',
  imageAlt = ''
} = {}) {
  const form = new FormData();

  form.set('title', title);
  form.set('date', date);
  form.set('body', body);
  form.set('excerpt', excerpt);
  form.set('image_file', imageFile);
  form.set('image_alt', imageAlt);
  form.set('client_note', 'browser supplied value');
  form.set('client_meta', '{"browser":true}');

  return form;
}

function createForm() {
  const form = new FormData();

  form.set('id', 'fresh-news');
  form.set('title', ' Fresh News ');
  form.set('date', '2026-04-05');
  form.set('body', ' Fresh body with enough detail for a useful news post. ');
  form.set('excerpt', ' Fresh excerpt ');
  form.set('image_alt', 'Unused without an upload');
  form.set('client_note', 'browser supplied value');
  form.set('sort_order', '999');

  return form;
}

test('Local Studio News save preserves client-owned YAML and create remains canonical-only', async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'atelier-news-save-preservation-'));
  const originalCwd = process.cwd();
  const originalStudio = process.env.ATELIER_STUDIO;
  const originalStudioMode = process.env.ATELIER_STUDIO_MODE;
  let server;

  try {
    for (const entry of projectEntries) {
      fs.cpSync(path.join(kitRoot, entry), path.join(root, entry), {
        recursive: true
      });
    }

    fs.symlinkSync(path.join(kitRoot, 'node_modules'), path.join(root, 'node_modules'), 'dir');

    fs.mkdirSync(path.join(root, 'content/news'), { recursive: true });
    fs.mkdirSync(path.join(root, 'static/images/news'), { recursive: true });
    fs.writeFileSync(path.join(root, 'static/images/news/existing.jpg'), '');

    const editedPath = path.join(root, 'content/news/client-update.yaml');

    fs.writeFileSync(
      editedPath,
      stringify({
        id: 'client-update',
        title: 'Before title',
        date: '2026-01-02',
        body: 'Before body with enough text to remain valid.',
        excerpt: 'Before excerpt',
        image_file: '/images/news/existing.jpg',
        image_alt: 'Before alt',
        sort_order: 30,
        client_note: 'trusted existing value',
        client_meta: {
          featured: true,
          tags: ['studio', 'client'],
          link: {
            href: 'https://example.test/news',
            label: 'External context'
          }
        },
        client_sections: [
          { kind: 'quote', text: 'Keep this quote' },
          { kind: 'cta', href: '/contact', label: 'Contact' }
        ]
      })
    );

    process.chdir(root);
    process.env.ATELIER_STUDIO = '1';
    delete process.env.ATELIER_STUDIO_MODE;

    const { createServer } = await import('vite');
    server = await createServer({
      root,
      cacheDir: path.join(root, '.vite-news-save-preservation-cache'),
      optimizeDeps: {
        noDiscovery: true,
        include: []
      },
      ssr: {
        optimizeDeps: {
          noDiscovery: true,
          include: []
        }
      },
      server: {
        middlewareMode: true,
        hmr: false
      },
      appType: 'custom',
      logLevel: 'error'
    });

    const editPage = await server.ssrLoadModule('/src/routes/studio/news/[id]/+page.server.js');
    const createPage = await server.ssrLoadModule('/src/routes/studio/news/new/+page.server.js');

    const saveResponse = await editPage.actions.saveNews({
      params: { id: 'client-update' },
      request: new Request('http://localhost/studio/news/client-update', {
        method: 'POST',
        body: newsForm({
          title: ' Edited title ',
          date: '2026-03-04',
          body: ' Edited body with enough detail for a useful news post. ',
          excerpt: '   ',
          imageFile: '',
          imageAlt: '   '
        })
      })
    });

    assert.notEqual(saveResponse?.status, 400, JSON.stringify(saveResponse));

    const edited = parse(fs.readFileSync(editedPath, 'utf8'));

    assert.equal(edited.id, 'client-update');
    assert.equal(edited.title, 'Edited title');
    assert.equal(edited.date, '2026-03-04');
    assert.equal(edited.body, 'Edited body with enough detail for a useful news post.');
    assert.equal(Object.hasOwn(edited, 'excerpt'), false);
    assert.equal(edited.image_file, '/images/news/existing.jpg');
    assert.equal(Object.hasOwn(edited, 'image_alt'), false);
    assert.equal(edited.sort_order, 30);
    assert.equal(edited.client_note, 'trusted existing value');
    assert.deepEqual(edited.client_meta, {
      featured: true,
      tags: ['studio', 'client'],
      link: {
        href: 'https://example.test/news',
        label: 'External context'
      }
    });
    assert.deepEqual(edited.client_sections, [
      { kind: 'quote', text: 'Keep this quote' },
      { kind: 'cta', href: '/contact', label: 'Contact' }
    ]);

    await assert.rejects(
      () =>
        createPage.actions.createNews({
          request: new Request('http://localhost/studio/news/new', {
            method: 'POST',
            body: createForm()
          })
        }),
      (error) => {
        const redirectError =
          /** @type {{ status?: unknown, location?: unknown }} */ (error);

        assert.equal(redirectError.status, 303);
        assert.equal(redirectError.location, '/studio/news/fresh-news');
        return true;
      }
    );

    const created = parse(
      fs.readFileSync(path.join(root, 'content/news/fresh-news.yaml'), 'utf8')
    );

    assert.deepEqual(Object.keys(created).sort(), ['body', 'date', 'excerpt', 'id', 'title']);
    assert.deepEqual(created, {
      id: 'fresh-news',
      title: 'Fresh News',
      date: '2026-04-05',
      body: 'Fresh body with enough detail for a useful news post.',
      excerpt: 'Fresh excerpt'
    });
  } finally {
    await server?.close();
    process.chdir(originalCwd);

    if (originalStudio === undefined) {
      delete process.env.ATELIER_STUDIO;
    } else {
      process.env.ATELIER_STUDIO = originalStudio;
    }

    if (originalStudioMode === undefined) {
      delete process.env.ATELIER_STUDIO_MODE;
    } else {
      process.env.ATELIER_STUDIO_MODE = originalStudioMode;
    }

    fs.rmSync(root, {
      recursive: true,
      force: true
    });
  }
});
