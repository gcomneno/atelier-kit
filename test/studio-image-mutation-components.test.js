import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { pathToFileURL } from 'node:url';
import { Window } from 'happy-dom';
import { build } from 'vite';
import { parse } from 'svelte/compiler';
import { svelte } from '@sveltejs/vite-plugin-svelte';

const projectRoot = process.cwd();

const pageContracts = [
  {
    route: 'src/routes/studio/site/identity/+page.svelte',
    pairs: [
      ['header_logo_upload', 'remove_header_logo'],
      ['favicon_upload', 'remove_favicon']
    ]
  },
  {
    route: 'src/routes/studio/site/appearance/+page.svelte',
    pairs: [['background_upload', 'remove_background']]
  },
  {
    route: 'src/routes/studio/site/hero/+page.svelte',
    pairs: [['banner_upload', 'remove_hero_image']],
    hero: true
  }
];

/** @typedef {Record<string, any>} AstNode */

/** @param {unknown} node @param {AstNode[]} components */
function collectImageMutationComponents(node, components) {
  if (!node || typeof node !== 'object') return;
  const astNode = /** @type {AstNode} */ (node);
  if (astNode.type === 'Component' && astNode.name === 'StudioImageMutationFields') components.push(astNode);
  for (const value of Object.values(astNode)) {
    if (Array.isArray(value)) {
      for (const child of value) collectImageMutationComponents(child, components);
    } else {
      collectImageMutationComponents(value, components);
    }
  }
}

/** @param {AstNode} component @param {string} name */
function attribute(component, name) {
  /** @param {AstNode} item */
  const matches = (item) => item.type === 'Attribute' && item.name === name;
  return component.attributes.find(matches);
}

/** @param {AstNode} component @param {string} name */
function literalAttribute(component, name) {
  const value = attribute(component, name)?.value;
  return Array.isArray(value) && value.length === 1 && value[0].type === 'Text' ? value[0].data : undefined;
}

test('real Studio pages wire every image mutation field contract', () => {
  for (const contract of pageContracts) {
    const source = fs.readFileSync(path.join(projectRoot, contract.route), 'utf8');
    /** @type {AstNode[]} */
    const components = [];
    collectImageMutationComponents(parse(source, { modern: true }).fragment, components);
    assert.equal(components.length, contract.pairs.length, `${contract.route}: image mutation field count`);

    for (const [uploadName, removeName] of contract.pairs) {
      const component = components.find((item) => literalAttribute(item, 'uploadName') === uploadName);
      assert.ok(component, `${contract.route}: ${uploadName} component`);
      assert.equal(literalAttribute(component, 'removeName'), removeName, `${uploadName}: removeName`);
      for (const prop of ['hasExisting', 'resetKey', 'stateMessages', 'onmutation']) {
        assert.ok(attribute(component, prop), `${uploadName}: ${prop} is supplied`);
      }

      if (contract.hero) {
        const disabled = attribute(component, 'disabled')?.value?.expression;
        assert.equal(disabled?.type, 'LogicalExpression');
        assert.equal(disabled?.operator, '&&');
        assert.equal(disabled?.left?.type, 'UnaryExpression');
        assert.equal(disabled?.left?.operator, '!');
        assert.equal(disabled?.left?.argument?.type, 'Identifier');
        assert.equal(disabled?.left?.argument?.name, 'bannerFieldsEnabled');
        assert.equal(disabled?.right?.type, 'UnaryExpression');
        assert.equal(disabled?.right?.operator, '!');
        assert.equal(disabled?.right?.argument?.type, 'Identifier');
        assert.equal(disabled?.right?.argument?.name, 'removeHeroImage');
        const required = attribute(component, 'required')?.value?.expression;
        assert.equal(required?.type, 'Identifier');
        assert.equal(required?.name, 'uploadRequired');
      }
    }
  }
});

async function buildPages() {
  const temporaryRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'atelier-image-component-'));
  const identityPath = path.join(projectRoot, 'src/routes/studio/site/identity/+page.svelte');
  const appearancePath = path.join(projectRoot, 'src/routes/studio/site/appearance/+page.svelte');
  const heroPath = path.join(projectRoot, 'src/routes/studio/site/hero/+page.svelte');
  const harnessPath = path.join(temporaryRoot, 'ProductionPages.svelte');
  const entryPath = path.join(temporaryRoot, 'entry.js');
  fs.writeFileSync(path.join(temporaryRoot, 'app-forms.js'), `export function enhance() { return {}; }`);
  fs.writeFileSync(harnessPath, `<script>
    import Identity from ${JSON.stringify(identityPath)};
    import Appearance from ${JSON.stringify(appearancePath)};
    import Hero from ${JSON.stringify(heroPath)};
    import { setI18nContext } from '$lib/i18n/context.js';
    let { page, data, form } = $props();
    let currentForm = $state(form);
    export function updateForm(next) { currentForm = next; }
    setI18nContext(() => 'en');
    const Page = page === 'identity' ? Identity : page === 'appearance' ? Appearance : Hero;
  </script>
  <Page {data} form={currentForm} />`);
  fs.writeFileSync(entryPath, `import ProductionPages from './ProductionPages.svelte';
    import { flushSync, mount, unmount } from 'svelte';
    export const mountPage = (target, props) => mount(ProductionPages, { target, props });
    export { flushSync, unmount };`);
  await build({
    configFile: false,
    logLevel: 'error',
    plugins: [svelte()],
    resolve: {
      alias: {
        $lib: path.join(projectRoot, 'src/lib'),
        '$app/forms': path.join(temporaryRoot, 'app-forms.js')
      },
      conditions: ['browser']
    },
    build: {
      outDir: path.join(temporaryRoot, 'dist'),
      emptyOutDir: true,
      lib: { entry: entryPath, formats: ['es'], fileName: 'pages' }
    }
  });
  return { temporaryRoot, module: await import(`${pathToFileURL(path.join(temporaryRoot, 'dist/pages.js'))}?${Date.now()}`) };
}

function installDom() {
  const window = new Window({ url: 'http://localhost/' });
  const saved = new Map();
  for (const name of [
    'window', 'document', 'navigator', 'Node', 'Text', 'Comment', 'Document', 'DocumentFragment',
    'Element', 'HTMLElement', 'HTMLInputElement', 'HTMLMediaElement', 'Event', 'File', 'FormData',
    'MutationObserver', 'ResizeObserver', 'getComputedStyle'
  ]) {
    saved.set(name, Object.getOwnPropertyDescriptor(globalThis, name));
    Object.defineProperty(globalThis, name, {
      configurable: true,
      writable: true,
      value: /** @type {Record<string, unknown>} */ (/** @type {unknown} */ (window))[name]
    });
  }
  return () => {
    window.close();
    for (const [name, descriptor] of saved) {
      if (descriptor) Object.defineProperty(globalThis, name, descriptor);
      else delete /** @type {Record<string, unknown>} */ (globalThis)[name];
    }
  };
}

/** @typedef {{ flushSync: () => void, unmount: (instance: unknown) => Promise<void> }} HarnessRuntime */

/** @param {HarnessRuntime} runtime @param {HTMLInputElement} input @param {File | null} file */
function choose(runtime, input, file) {
  const transfer = new window.DataTransfer();
  if (file) transfer.items.add(file);
  input.files = transfer.files;
  input.dispatchEvent(new Event('change', { bubbles: true }));
  runtime.flushSync();
}

/** @param {HarnessRuntime} runtime @param {HTMLElement} input */
function click(runtime, input) {
  input.click();
  runtime.flushSync();
}

/** @param {HarnessRuntime} runtime @param {HTMLInputElement} input @param {boolean} checked */
function toggle(runtime, input, checked) {
  input.checked = checked;
  input.dispatchEvent(new Event('change', { bubbles: true }));
  runtime.flushSync();
}

const siteForm = {
  name: 'Atelier', header_title: 'Atelier', intro_title: 'Atelier', header_logo: '/images/site/header-logo.png',
  header_logo_alt: 'Logo', favicon: '/images/site/favicon.png', tagline: '', hero_intro: '', hero_signature: '', footer_note: ''
};
const appearanceForm = {
  preset: 'custom', base_color: '#ffffff', accent_color: '#222222', text_color: '#111111',
  heading_color: '#111111', card_color: '#eeeeee', header_title_color: '#111111',
  intro_title_color: '#111111', font_preset: 'system', background_fit: 'top',
  background_image: '/images/site/background.png'
};
const appearancePresets = [{ id: 'custom', label: 'Custom' }];
const fontPresets = [{ id: 'system', label: 'System' }];
const heroBannerForm = {
  show: true, image_file: '/images/site/hero-banner.png', description: 'Description', caption: 'Caption', href: ''
};

test('actual rendered Studio pages enforce all four upload/removal contracts', async (t) => {
  const restoreDom = installDom();
  const { temporaryRoot, module } = await buildPages();
  const target = document.createElement('div');
  document.body.append(target);
  /** @type {unknown} */
  let instance;
  t.after(async () => {
    if (instance) await module.unmount(instance);
    restoreDom();
    fs.rmSync(temporaryRoot, { recursive: true, force: true });
  });

  const pages = [
    { page: 'identity', action: '?/saveSite', pairs: [['header_logo_upload', 'remove_header_logo'], ['favicon_upload', 'remove_favicon']] },
    { page: 'appearance', action: '?/saveAppearance', pairs: [['background_upload', 'remove_background']] },
    { page: 'hero', action: '?/saveHeroBanner', pairs: [['banner_upload', 'remove_hero_image']] }
  ];
  for (const contract of pages) {
    target.replaceChildren();
    instance = module.mountPage(target, {
      page: contract.page,
      data: { siteForm, appearanceForm, appearancePresets, fontPresets, heroBannerForm }
    });
    module.flushSync();
    const form = /** @type {HTMLFormElement} */ (target.querySelector('form'));
    assert.equal(form.getAttribute('action'), contract.action);
    assert.equal(form.enctype, 'multipart/form-data');

    for (const [uploadName, removeName] of contract.pairs) {
      const upload = /** @type {HTMLInputElement} */ (form.querySelector(`input[name="${uploadName}"]`));
      const remove = /** @type {HTMLInputElement} */ (form.querySelector(`input[name="${removeName}"]`));
      const file = new File(['real replacement'], `${uploadName}.png`, { type: 'image/png' });
      choose(module, upload, file);
      const selected = new FormData(form).get(uploadName);
      assert.ok(selected instanceof File);
      assert.equal(selected.name, file.name, `${uploadName}: real named File reaches FormData`);

      toggle(module, remove, true);
      assert.equal(upload.disabled, false, `${uploadName}: removal keeps the real upload input enabled`);
      assert.equal(upload.files?.length, 0, `${uploadName}: removal clears real file input`);
      const removalData = new FormData(form);
      assert.equal(removalData.get(removeName), 'on', `${removeName}: removal checkbox is submitted`);
      assert.equal(/** @type {File} */ (removalData.get(uploadName)).size, 0, `${uploadName}: no selected File is submitted`);

      if (contract.page === 'hero') {
        const show = /** @type {HTMLInputElement} */ (form.querySelector('input[name=show_banner]'));
        assert.equal(show.checked, false, 'Hero removal forces show off');
        assert.equal(show.disabled, true, 'Hero removal disables show while upload stays enabled');
      }

      const replacement = new File(['replacement after removal'], `${uploadName}-again.webp`, { type: 'image/webp' });
      choose(module, upload, replacement);
      assert.equal(remove.checked, false, `${uploadName}: selecting a File cancels removal`);
      assert.equal(upload.disabled, false, `${uploadName}: selecting a File restores upload field`);
      const replacementData = new FormData(form);
      assert.equal(replacementData.get(removeName), null, `${removeName}: removal mutation is omitted`);
      assert.equal(/** @type {File} */ (replacementData.get(uploadName)).name, replacement.name);
      if (contract.page === 'hero') {
        const show = /** @type {HTMLInputElement} */ (form.querySelector('input[name=show_banner]'));
        assert.equal(show.checked, true, 'Hero file selection restores the prior show state');
        assert.equal(show.disabled, false, 'Hero file selection re-enables show');
      }

      toggle(module, remove, true);
      toggle(module, remove, false);
      assert.equal(upload.files?.length, 0, `${uploadName}: cancel does not restore cleared File`);
    }

    if (contract.page === 'hero') {
      const show = /** @type {HTMLInputElement} */ (form.querySelector('input[name=show_banner]'));
      const remove = /** @type {HTMLInputElement} */ (form.querySelector('input[name=remove_hero_image]'));
      assert.equal(show.checked, true);
      toggle(module, remove, true);
      assert.equal(show.checked, false, 'Hero removal forces show off');
      assert.equal(show.disabled, true, 'Hero removal disables show');
      let data = new FormData(form);
      assert.equal(data.get('show_banner'), null);
      assert.equal(data.get('banner_image_file'), '');
      toggle(module, remove, false);
      assert.equal(show.checked, true, 'cancelling Hero removal restores prior show state');
      data = new FormData(form);
      assert.equal(data.get('show_banner'), 'on');
      assert.equal(data.get('banner_image_file'), heroBannerForm.image_file);
    }

    await module.unmount(instance);
    instance = undefined;
  }

  target.replaceChildren();
  instance = module.mountPage(target, {
    page: 'identity', data: { siteForm, appearanceForm, appearancePresets, fontPresets, heroBannerForm }
  });
  module.flushSync();
  const logo = /** @type {HTMLInputElement} */ (target.querySelector('input[name=header_logo_upload]'));
  choose(module, logo, new File(['new'], 'new.png', { type: 'image/png' }));
  assert.equal(logo.files?.length, 1);
  /** @type {{ updateForm: (form: unknown) => void }} */ (instance).updateForm({
    siteStatus: 'success',
    siteForm: { ...siteForm }
  });
  module.flushSync();
  const resetLogo = /** @type {HTMLInputElement} */ (target.querySelector('input[name=header_logo_upload]'));
  assert.equal(resetLogo, logo, 'successful save keeps the same mounted production page');
  assert.equal(resetLogo.files?.length, 0, 'success data resets mutation state');
});

test('normally hidden Hero keeps upload and detail fields disabled', async (t) => {
  const restoreDom = installDom();
  const { temporaryRoot, module } = await buildPages();
  const target = document.createElement('div');
  document.body.append(target);
  const instance = module.mountPage(target, {
    page: 'hero',
    data: {
      siteForm, appearanceForm, appearancePresets, fontPresets,
      heroBannerForm: { ...heroBannerForm, show: false }
    }
  });
  module.flushSync();
  t.after(async () => {
    await module.unmount(instance);
    restoreDom();
    fs.rmSync(temporaryRoot, { recursive: true, force: true });
  });

  const upload = /** @type {HTMLInputElement | null} */ (target.querySelector('input[name=banner_upload]'));
  const details = /** @type {HTMLFieldSetElement | null} */ (target.querySelector('fieldset'));
  assert.equal(upload?.disabled, true);
  assert.equal(details?.disabled, true);
});
