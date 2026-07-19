import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { parse } from 'yaml';

const kitRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
/** @type {NodeJS.ProcessEnv} */
const childEnv = { ...process.env, ATELIER_STUDIO: '1' };
delete childEnv.NODE_TEST_CONTEXT;

test('hero signature saves, rejects invalid markup and renders safely through the real visitor path', () => {
  const parent = fs.mkdtempSync(path.join(os.tmpdir(), 'atelier-hero-signature-'));
  const target = path.join(parent, 'client');

  try {
    const scaffold = spawnSync(
      process.execPath,
      [path.join(kitRoot, 'scripts/scaffold-client.js'), target, '--template', 'writing'],
      { cwd: kitRoot, encoding: 'utf8', env: childEnv }
    );
    assert.equal(scaffold.status, 0, `${scaffold.stdout}\n${scaffold.stderr}`);
    fs.symlinkSync(path.join(kitRoot, 'node_modules'), path.join(target, 'node_modules'), 'dir');

    const probe = `
      import assert from 'node:assert/strict';
      import fs from 'node:fs';
      import { createServer } from 'vite';
      import { parse } from 'yaml';

      const server = await createServer({
        root: process.cwd(),
        cacheDir: '.vite-hero-signature-test-cache',
        optimizeDeps: { noDiscovery: true, include: [] },
        ssr: { optimizeDeps: { noDiscovery: true, include: [] } },
        server: { middlewareMode: true },
        appType: 'custom'
      });

      function identityForm(signature) {
        const form = new FormData();
        form.set('header_title', 'Atelier');
        form.set('intro_title', 'Scritture');
        form.set('tagline', 'Testo semplice');
        form.set('hero_intro', 'Introduzione');
        form.set('hero_signature', signature);
        form.set('footer_note', 'Note');
        return form;
      }

      async function save(studio, signature) {
        return studio.saveSiteAction({
          request: new Request('http://localhost/studio/site/identity', {
            method: 'POST',
            body: identityForm(signature)
          })
        });
      }

      try {
        const studio = await server.ssrLoadModule('/src/lib/server/studio-site-server.js');
        const editorial = await server.ssrLoadModule('/src/lib/components/EditorialText.svelte');
        const { render } = await server.ssrLoadModule('svelte/server');
        const sitePath = 'config/site.yaml';

        const marked = '{accent}Giancarlo Cicellyn Comneno{/accent}';
        assert.notEqual((await save(studio, marked))?.status, 400);
        assert.equal(parse(fs.readFileSync(sitePath, 'utf8')).site.hero_signature, marked);

        const showcase = await server.ssrLoadModule('/src/lib/server/showcase.js');
        assert.equal(showcase.getSiteConfig().hero_signature, marked);
        const markedHtml = render(editorial.default, {
          props: { tag: 'p', class: 'hero-signature', value: showcase.getSiteConfig().hero_signature }
        }).body;
        assert.match(markedHtml, /Giancarlo Cicellyn Comneno/);
        assert.match(markedHtml, /mark-accent/);
        assert.doesNotMatch(markedHtml, /\\{\\/?accent\\}|epigraph/);

        const plain = 'Giancarlo Cicellyn Comneno';
        assert.notEqual((await save(studio, plain))?.status, 400);
        const plainHtml = render(editorial.default, {
          props: { tag: 'p', class: 'hero-signature', value: showcase.getSiteConfig().hero_signature }
        }).body;
        assert.match(plainHtml, /<p class="hero-signature[^>]*>/);
        assert.match(plainHtml, /Giancarlo Cicellyn Comneno/);
        assert.doesNotMatch(plainHtml, /mark-|epigraph/);

        const multiline = '{accent}Prima riga{/accent}\\n\\n{heading}Seconda & <b>riga<\\/b>{/heading}';
        const persistedMultiline = multiline.replaceAll('\\n', '\\r\\n');
        assert.notEqual((await save(studio, multiline))?.status, 400);
        assert.equal(parse(fs.readFileSync(sitePath, 'utf8')).site.hero_signature, persistedMultiline);
        assert.equal(showcase.getSiteConfig().hero_signature, persistedMultiline);
        const multilineHtml = render(editorial.default, {
          props: { tag: 'p', class: 'hero-signature', value: showcase.getSiteConfig().hero_signature }
        }).body;
        assert.match(multilineHtml, /Prima riga/);
        assert.match(multilineHtml, /Seconda &amp; &lt;b&gt;riga&lt;\\/b&gt;/);
        assert.match(multilineHtml, /mark-accent/);
        assert.match(multilineHtml, /mark-heading/);
        assert.doesNotMatch(multilineHtml, /\\{\\/?(?:accent|heading)\\}|<b>|epigraph/);

        for (const invalid of ['{unknown}Firma{/unknown}', '{accent}Firma']) {
          const before = fs.readFileSync(sitePath, 'utf8');
          const response = await save(studio, invalid);
          assert.equal(response?.status, 400);
          assert.equal(fs.readFileSync(sitePath, 'utf8'), before);
          assert.equal(showcase.getSiteConfig().hero_signature, persistedMultiline);
          assert.notEqual(showcase.getSiteConfig().hero_signature, invalid);
        }
      } finally {
        await server.close();
      }
    `;

    const result = spawnSync(process.execPath, ['--input-type=module', '--eval', probe], {
      cwd: target,
      encoding: 'utf8',
      env: childEnv
    });
    assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);

    assert.equal(
      parse(fs.readFileSync(path.join(target, 'config/site.yaml'), 'utf8')).site.hero_signature,
      '{accent}Prima riga{/accent}\r\n\r\n{heading}Seconda & <b>riga</b>{/heading}'
    );
  } finally {
    fs.rmSync(parent, { recursive: true, force: true });
  }
});
