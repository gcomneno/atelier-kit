// @ts-nocheck

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { editorialFontPresets } from './editorial-markup.js';
import {
  buildAboutData,
  loadAboutFormData,
  parseAboutPortrait,
  validateAboutPortraitContent
} from './about-config.js';

const legacy = {
  about: {
    title: 'Studio story',
    portrait: { show: true, image_file: '/images/site/portrait.webp', image_alt: 'Studio portrait' }
  }
};

test('loads legacy About data without inferring a caption from image_alt', () => {
  const form = loadAboutFormData(legacy);
  assert.equal(form.portrait_caption, '');
  assert.equal(form.portrait_image_alt, 'Studio portrait');
});

test('loads and writes a valid marked portrait caption independently from alt text', () => {
  const form = loadAboutFormData({
    about: {
      title: 'Studio story',
      portrait: {
        show: true,
        image_file: '/images/site/portrait.webp',
        image_alt: 'Plain accessibility description',
        caption: '{muted}Visible caption{/muted}'
      }
    }
  });
  const written = buildAboutData(legacy, form);

  assert.equal(written.about.portrait.caption, '{muted}Visible caption{/muted}');
  assert.equal(written.about.portrait.image_alt, 'Plain accessibility description');
});

test('preserves a caption while the portrait is hidden and after it is re-enabled', () => {
  const form = {
    ...loadAboutFormData({
      about: {
        title: 'Studio story',
        portrait: {
          show: true,
          image_file: '/images/site/portrait.webp',
          caption: '{muted}Kept{/muted}'
        }
      }
    }),
    show_portrait: false
  };
  const hidden = buildAboutData(legacy, form);
  assert.equal(hidden.about.portrait.show, false);
  assert.equal(hidden.about.portrait.caption, '{muted}Kept{/muted}');

  const shown = buildAboutData(hidden, { ...loadAboutFormData(hidden), show_portrait: true });
  assert.equal(shown.about.portrait.caption, '{muted}Kept{/muted}');
});

test('rejects invalid Atelier Mark before a Studio write', () => {
  assert.throws(
    () => buildAboutData(legacy, { ...loadAboutFormData(legacy), portrait_caption: '{muted}Broken' }),
    /portrait\.caption: Unclosed tag/
  );
});

test('rejects recognizable Atelier Mark in plain alt text before a Studio write', () => {
  assert.throws(
    () =>
      buildAboutData(legacy, {
        ...loadAboutFormData(legacy),
        portrait_image_alt: '{muted}Not plain{/muted}'
      }),
    /portrait\.image_alt: Atelier Mark is not allowed/
  );
});

test('accepts plain alt text and literal non-markup braces', () => {
  for (const imageAlt of ['Portrait of the artist', 'Portrait {front view}', 'Work from {2026}']) {
    const written = buildAboutData(legacy, {
      ...loadAboutFormData(legacy),
      portrait_image_alt: imageAlt
    });
    assert.equal(written.about.portrait.image_alt, imageAlt);
  }
});

test('public portrait parsing includes non-empty captions and omits empty ones', () => {
  const withCaption = parseAboutPortrait({
    title: 'Fallback',
    portrait: {
      show: true,
      image_file: '/portrait.webp',
      image_alt: 'Portrait in the studio',
      caption: '{muted}Visible{/muted}'
    }
  });
  assert.equal(withCaption.caption, '{muted}Visible{/muted}');
  assert.equal(withCaption.image_alt, 'Portrait in the studio');

  const withoutCaption = parseAboutPortrait({
    title: 'Fallback',
    portrait: { show: true, image_file: '/portrait.webp', caption: '   ' }
  });
  assert.equal('caption' in withoutCaption, false);
});

test('font discovery uses only a renderable normalized portrait caption', () => {
  const visible = parseAboutPortrait({
    title: 'Studio',
    portrait: {
      show: true,
      image_file: '/portrait.webp',
      caption: '{font:fraunces}Caption{/font}'
    }
  });
  const hidden = parseAboutPortrait({
    title: 'Studio',
    portrait: {
      show: false,
      image_file: '/portrait.webp',
      caption: '{font:lora}Hidden{/font}'
    }
  });
  const missingImage = parseAboutPortrait({
    title: 'Studio',
    portrait: { show: true, caption: '{font:lora}Hidden{/font}' }
  });
  const emptyCaption = parseAboutPortrait({
    title: 'Studio',
    portrait: { show: true, image_file: '/portrait.webp', caption: '   ' }
  });

  assert.deepEqual(editorialFontPresets(visible?.caption), ['fraunces']);
  assert.deepEqual(editorialFontPresets(hidden?.caption), []);
  assert.deepEqual(editorialFontPresets(missingImage?.caption), []);
  assert.deepEqual(editorialFontPresets(emptyCaption?.caption), []);
});

test('layout font discovery consumes the canonical marked registry including the portrait caption', () => {
  const config = readFileSync(new URL('./about-config.js', import.meta.url), 'utf8');
  const showcase = readFileSync(new URL('./server/showcase.js', import.meta.url), 'utf8');
  const serverLayout = readFileSync(new URL('../routes/+layout.server.js', import.meta.url), 'utf8');
  const layout = readFileSync(new URL('../routes/+layout.svelte', import.meta.url), 'utf8');

  assert.doesNotMatch(config, /aboutCaptionFontPresets/);
  assert.match(showcase, /about\?\.portrait\?\.caption/);
  assert.match(serverLayout, /markedTextValues:\s*getPublicMarkedTextValues\(\)/);
  assert.match(layout, /markedTextFontPresets\(data\.markedTextValues \?\? \[\]\)/);
});

test('public component conditionally renders semantic figcaption through EditorialText', () => {
  const component = readFileSync(new URL('../routes/about/+page.svelte', import.meta.url), 'utf8');
  assert.match(component, /\{#if data\.about\.portrait\.caption\}[\s\S]*tag="figcaption"/);
});

test('content checks report invalid caption markup and Atelier Mark in alt text', () => {
  assert.match(
    validateAboutPortraitContent({ portrait: { caption: '{muted}Broken' } }).join(' '),
    /portrait\.caption: Unclosed tag/
  );
  assert.match(
    validateAboutPortraitContent({ portrait: { image_alt: '{accent}Marked{\/accent}' } }).join(' '),
    /portrait\.image_alt: Atelier Mark is not allowed/
  );
  const doctor = readFileSync(new URL('../../scripts/content-doctor.js', import.meta.url), 'utf8');
  const validator = readFileSync(new URL('../../scripts/validate-content.js', import.meta.url), 'utf8');
  assert.match(doctor, /validateAboutPortraitContent\(data\.about\)/);
  assert.match(validator, /validateAboutPortraitContent\(data\.about\)/);
});
