import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { parse, stringify } from 'yaml';

const kitRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
/** @type {NodeJS.ProcessEnv} */
const childEnv = { ...process.env, ATELIER_STUDIO: '1' };
delete childEnv.NODE_TEST_CONTEXT;

test('legacy tagline display loads, validates, renders inertly and survives Site Identity save', () => {
  const parent = fs.mkdtempSync(path.join(os.tmpdir(), 'atelier-legacy-tagline-'));
  const target = path.join(parent, 'client');

  try {
    const scaffold = spawnSync(
      process.execPath,
      [path.join(kitRoot, 'scripts/scaffold-client.js'), target, '--template', 'writing'],
      { cwd: kitRoot, encoding: 'utf8', env: childEnv }
    );
    assert.equal(scaffold.status, 0, `${scaffold.stdout}\n${scaffold.stderr}`);

    const sitePath = path.join(target, 'config/site.yaml');
    const config = parse(fs.readFileSync(sitePath, 'utf8'));
    config.site.tagline = '{accent}Testo legacy{/accent}';
    config.site.tagline_display = { wrap: 'epigraph', quote_color: 'accent' };
    config.site.operator_extension = { keep: 'unchanged' };
    fs.writeFileSync(sitePath, stringify(config));

    fs.symlinkSync(path.join(kitRoot, 'node_modules'), path.join(target, 'node_modules'), 'dir');
    const probe = `
      import assert from 'node:assert/strict';
      import fs from 'node:fs';
      import { createServer } from 'vite';
      import { parse } from 'yaml';

      const server = await createServer({
        root: process.cwd(),
        cacheDir: '.vite-legacy-test-cache',
        optimizeDeps: { noDiscovery: true, include: [] },
        ssr: { optimizeDeps: { noDiscovery: true, include: [] } },
        server: { middlewareMode: true },
        appType: 'custom'
      });
      try {
        const studio = await server.ssrLoadModule('/src/lib/server/studio-site-server.js');
        const showcase = await server.ssrLoadModule('/src/lib/server/showcase.js');
        const editorial = await server.ssrLoadModule('/src/lib/components/EditorialText.svelte');
        const { render } = await server.ssrLoadModule('svelte/server');

        const loaded = studio.loadSiteForm();
        assert.equal(loaded.tagline, '{accent}Testo legacy{/accent}');
        assert.equal(Object.hasOwn(loaded, 'tagline_display'), false);

        const validation = await import('./scripts/validate-content.js');
        assert.equal(process.exitCode ?? 0, 0);

        const visitorSite = showcase.getSiteConfig();
        assert.equal(visitorSite.tagline, '{accent}Testo legacy{/accent}');
        assert.equal(Object.hasOwn(visitorSite, 'tagline_display'), false);
        const html = render(editorial.default, { props: { tag: 'p', class: 'tagline', value: visitorSite.tagline } }).body;
        assert.match(html, /Testo legacy/);
        assert.match(html, /mark-accent/);
        assert.doesNotMatch(html, /«|»|epigraph|quote[_-]?color|component-quotes/);

        const form = new FormData();
        form.set('header_title', 'Identità aggiornata');
        form.set('intro_title', 'Titolo aggiornato');
        form.set('tagline', '{accent}Testo legacy{/accent}');
        form.set('hero_intro', 'Introduzione aggiornata');
        form.set('hero_signature', 'Firma conservata');
        form.set('footer_note', 'Nota aggiornata');
        const response = await studio.saveSiteAction({ request: new Request('http://localhost/studio/site/identity', { method: 'POST', body: form }) });
        assert.notEqual(response?.status, 400);

        const saved = parse(fs.readFileSync('config/site.yaml', 'utf8')).site;
        assert.deepEqual(saved.tagline_display, { wrap: 'epigraph', quote_color: 'accent' });
        assert.deepEqual(saved.operator_extension, { keep: 'unchanged' });
        assert.equal(saved.header_title, 'Identità aggiornata');
        assert.equal(saved.intro_title, 'Titolo aggiornato');
        assert.equal(saved.hero_intro, 'Introduzione aggiornata');
        assert.equal(saved.tagline, '{accent}Testo legacy{/accent}');
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

    const saved = parse(fs.readFileSync(sitePath, 'utf8')).site;
    assert.deepEqual(saved.tagline_display, { wrap: 'epigraph', quote_color: 'accent' });
  } finally {
    fs.rmSync(parent, { recursive: true, force: true });
  }
});
