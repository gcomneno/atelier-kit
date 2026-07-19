import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { createServer } from 'vite';
import { parse, stringify } from 'yaml';

const checkoutRoot = process.cwd();
/** @typedef {{ action: string, statusField: string, upload: string, remove: string, key: string, file: string }} ImagePair */
const projectEntries = ['config', 'content', 'scripts', 'src', 'static', 'vendor', 'jsconfig.json', 'package.json', 'package-lock.json', 'vite.config.js'];
const pairs = [
  { action: 'saveSiteAction', statusField: 'siteStatus', upload: 'header_logo_upload', remove: 'remove_header_logo', key: 'header_logo', file: 'header-logo' },
  { action: 'saveSiteAction', statusField: 'siteStatus', upload: 'favicon_upload', remove: 'remove_favicon', key: 'favicon', file: 'favicon' },
  { action: 'saveAppearanceAction', statusField: 'appearanceStatus', upload: 'background_upload', remove: 'remove_background', key: 'background_image', file: 'background' },
  { action: 'saveHeroBannerAction', statusField: 'heroBannerStatus', upload: 'banner_upload', remove: 'remove_hero_image', key: 'image_file', file: 'hero-banner' }
];

function copyProject() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'atelier-image-actions-'));
  for (const entry of projectEntries) fs.cpSync(path.join(checkoutRoot, entry), path.join(root, entry), { recursive: true });
  fs.symlinkSync(path.join(checkoutRoot, 'node_modules'), path.join(root, 'node_modules'), 'dir');
  return root;
}

/** @param {Record<string, any>} site @param {ImagePair} pair */
function imageValue(site, pair) {
  if (pair.key === 'background_image') return site.appearance?.background_image;
  if (pair.key === 'image_file') return site.hero_banner?.image_file;
  return site[pair.key];
}

/** @param {Record<string, any>} site @param {ImagePair} pair @param {string} value */
function setImageValue(site, pair, value) {
  if (pair.key === 'background_image') site.appearance = { ...site.appearance, background_image: value };
  else if (pair.key === 'image_file') site.hero_banner = { show: true, image_file: value, caption: 'Fixture' };
  else site[pair.key] = value;
}

/** @param {Record<string, any>} site @param {ImagePair} pair */
function deleteImageValue(site, pair) {
  if (pair.key === 'background_image') delete site.appearance.background_image;
  else if (pair.key === 'image_file') delete site.hero_banner;
  else delete site[pair.key];
}

/** @param {Record<string, any>} studio @param {ImagePair} pair */
function formFor(studio, pair) {
  const form = new FormData();
  if (pair.action === 'saveSiteAction') {
    const values = studio.loadSiteForm();
    for (const name of ['header_title', 'intro_title', 'tagline', 'hero_intro', 'hero_signature', 'footer_note', 'header_logo', 'header_logo_alt', 'favicon']) form.set(name, values[name] ?? '');
  } else if (pair.action === 'saveAppearanceAction') {
    const values = studio.loadAppearanceForm();
    for (const name of ['preset', 'base_color', 'accent_color', 'text_color', 'heading_color', 'card_color', 'header_title_color', 'intro_title_color', 'font_preset', 'background_fit']) form.set(name, values[name] ?? '');
  } else {
    const values = studio.loadHeroBannerForm();
    if (values.show) form.set('show_banner', 'on');
    form.set('banner_image_file', values.image_file);
    form.set('banner_description', values.description);
    form.set('banner_caption', values.caption);
    form.set('banner_href', values.href);
  }
  return form;
}

/** @param {(event: { request: Request }) => Promise<any>} action @param {FormData} form */
function invoke(action, form) {
  return action({ request: new Request('http://localhost/studio', { method: 'POST', body: form }) });
}

/** @param {any} result @param {ImagePair} pair @param {string} operation */
function assertSuccessfulAction(result, pair, operation) {
  assert.notEqual(typeof result?.status, 'number', `${pair.upload}: ${operation} returned an ActionFailure`);
  assert.ok(
    result?.[pair.statusField] === 'success' || result?.[pair.statusField] === 'warning',
    `${pair.upload}: ${operation} has a successful ${pair.statusField}`
  );
}

test('site image mutation production actions', async (t) => {
  const root = copyProject();
  const originalCwd = process.cwd();
  const originalStudio = process.env.ATELIER_STUDIO;
  const sitePath = path.join(root, 'config/site.yaml');
  const assetsPath = path.join(root, 'static/images/site');
  let server;
  try {
    process.chdir(root);
    process.env.ATELIER_STUDIO = '1';
    const fixture = parse(fs.readFileSync(sitePath, 'utf8'));
    fixture.site.language = 'it';
    fixture.site.audit_unrelated = { preserved: 'byte-for-byte meaning' };
    for (const pair of pairs) setImageValue(fixture.site, pair, `/images/site/${pair.file}.png`);
    const fixtureYaml = `${stringify(fixture).trim()}\n`;

    /** @param {ImagePair} pair @param {boolean} [existing] */
    const reset = (pair, existing = true) => {
      const document = parse(fixtureYaml);
      if (!existing) deleteImageValue(document.site, pair);
      fs.writeFileSync(sitePath, `${stringify(document).trim()}\n`);
      fs.rmSync(assetsPath, { recursive: true, force: true });
      fs.mkdirSync(assetsPath, { recursive: true });
      for (const item of pairs) fs.writeFileSync(path.join(assetsPath, `${item.file}.png`), `original-${item.file}`);
    };

    server = await createServer({
      root, cacheDir: path.join(root, '.vite-test-cache'),
      optimizeDeps: { noDiscovery: true, include: [] },
      ssr: { optimizeDeps: { noDiscovery: true, include: [] } },
      server: { middlewareMode: true, hmr: false }, appType: 'custom', logLevel: 'error'
    });
    const studio = await server.ssrLoadModule('/src/lib/server/studio-site-server.js');

    for (const pair of pairs) {
      reset(pair);
      assertSuccessfulAction(await invoke(studio[pair.action], formFor(studio, pair)), pair, 'no-op');

      reset(pair, false);
      const add = formFor(studio, pair);
      add.set(pair.upload, new File([`added-${pair.file}`], 'image.webp', { type: 'image/webp' }));
      assertSuccessfulAction(await invoke(studio[pair.action], add), pair, 'add');
      assert.equal(imageValue(parse(fs.readFileSync(sitePath, 'utf8')).site, pair), `/images/site/${pair.file}.webp`);

      reset(pair);
      const replace = formFor(studio, pair);
      replace.set(pair.upload, new File([`replaced-${pair.file}`], 'image.png', { type: 'image/png' }));
      assertSuccessfulAction(await invoke(studio[pair.action], replace), pair, 'replace');
      assert.equal(fs.readFileSync(path.join(assetsPath, `${pair.file}.png`), 'utf8'), `replaced-${pair.file}`);

      reset(pair);
      const remove = formFor(studio, pair);
      remove.set(pair.remove, 'on');
      assertSuccessfulAction(await invoke(studio[pair.action], remove), pair, 'remove');
      const removedSite = parse(fs.readFileSync(sitePath, 'utf8')).site;
      assert.equal(imageValue(removedSite, pair), undefined);
      if (pair.key === 'image_file') assert.notEqual(removedSite.hero_banner?.show, true);
      assert.equal(fs.readFileSync(path.join(assetsPath, `${pair.file}.png`), 'utf8'), `original-${pair.file}`, `${pair.remove}: physical asset is preserved`);

      reset(pair);
      const yamlBefore = fs.readFileSync(sitePath);
      const assetsBefore = new Map(fs.readdirSync(assetsPath).map((name) => [name, fs.readFileSync(path.join(assetsPath, name))]));
      const conflict = formFor(studio, pair);
      conflict.set(pair.upload, new File(['conflict'], 'image.png', { type: 'image/png' }));
      conflict.set(pair.remove, 'on');
      const response = await invoke(studio[pair.action], conflict);
      assert.equal(response.status, 400, `${pair.upload}: conflict`);
      assert.deepEqual(fs.readFileSync(sitePath), yamlBefore);
      assert.deepEqual(new Map(fs.readdirSync(assetsPath).map((name) => [name, fs.readFileSync(path.join(assetsPath, name))])), assetsBefore);
    }

    reset(pairs[0]);
    const yamlBefore = fs.readFileSync(sitePath);
    const logoBefore = fs.readFileSync(path.join(assetsPath, 'header-logo.png'));
    const identity = formFor(studio, pairs[0]);
    identity.set('header_logo_upload', new File(['new-logo'], 'logo.png', { type: 'image/png' }));
    identity.set('favicon_upload', new File(['new-favicon'], 'favicon.png', { type: 'image/png' }));
    identity.set('remove_favicon', 'on');
    assert.equal((await invoke(studio.saveSiteAction, identity)).status, 400);
    assert.deepEqual(fs.readFileSync(path.join(assetsPath, 'header-logo.png')), logoBefore);
    assert.deepEqual(fs.readFileSync(sitePath), yamlBefore);

    reset(pairs[0]);
    const invalidYamlBefore = fs.readFileSync(sitePath);
    const invalidAssetsBefore = new Map(
      fs.readdirSync(assetsPath).map((name) => [name, fs.readFileSync(path.join(assetsPath, name))])
    );
    const invalidFavicon = formFor(studio, pairs[0]);
    invalidFavicon.set('header_logo_upload', new File(['valid-new-logo'], 'logo.png', { type: 'image/png' }));
    invalidFavicon.set('favicon_upload', new File(['invalid-favicon'], 'favicon.gif', { type: 'image/gif' }));
    const invalidResponse = await invoke(studio.saveSiteAction, invalidFavicon);
    assert.equal(invalidResponse.status, 400);
    assert.equal(invalidResponse.data.siteMessage, 'Usa un’immagine JPG, PNG o WebP.');
    assert.deepEqual(fs.readFileSync(sitePath), invalidYamlBefore, 'invalid later favicon preserves YAML bytes');
    assert.deepEqual(
      new Map(fs.readdirSync(assetsPath).map((name) => [name, fs.readFileSync(path.join(assetsPath, name))])),
      invalidAssetsBefore,
      'invalid later favicon preserves every site image byte'
    );

    await t.test('Hero show/image state stays consistent and unrelated site configuration is preserved', async () => {
      reset(pairs[3], false);
      const form = formFor(studio, pairs[3]);
      form.set('show_banner', 'on');
      const result = await invoke(studio.saveHeroBannerAction, form);
      assert.equal(result.status, 400);
      assert.equal(result.data.heroBannerMessage, 'Carica un’immagine banner oppure disattiva la visualizzazione.');
      const site = parse(fs.readFileSync(sitePath, 'utf8')).site;
      assert.deepEqual(site.audit_unrelated, { preserved: 'byte-for-byte meaning' });
      assert.equal(site.hero_banner, undefined);
    });

  } finally {
    await server?.close();
    process.chdir(originalCwd);
    if (originalStudio === undefined) delete process.env.ATELIER_STUDIO;
    else process.env.ATELIER_STUDIO = originalStudio;
    fs.rmSync(root, { recursive: true, force: true });
  }
});
