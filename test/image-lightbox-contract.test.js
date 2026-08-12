import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import en from '../src/lib/i18n/messages/en.js';
import it from '../src/lib/i18n/messages/it.js';

const component = readFileSync('src/lib/components/ImageLightbox.svelte', 'utf8');
const markup = component.match(/<\/script>([\s\S]*?)<style>/)?.[1] ?? '';

/** @param {'cover' | 'contain' | 'natural'} fit */
function fitRule(fit) {
  const match = component.match(
    new RegExp(`\\.lightbox-stage\\[data-fit='${fit}'\\] \\.lightbox-image \\{([\\s\\S]*?)\\n  \\}`)
  );

  assert.ok(match, `${fit} fit rule exists`);
  return match[1];
}

test('ImageLightbox localizes gallery navigation and preserves cover focal position', () => {
  for (const key of ['galleryNavigation', 'previous', 'next']) {
    assert.match(component, new RegExp(`t\\('imageLightbox\\.${key}'\\)`));
  }

  assert.doesNotMatch(markup, /aria-label="Image navigation"/);
  assert.doesNotMatch(markup, />\s*Previous\s*</);
  assert.doesNotMatch(markup, />\s*Next\s*</);

  assert.match(fitRule('cover'), /object-fit: cover;/);
  assert.match(fitRule('cover'), /object-position: center top;/);
  assert.doesNotMatch(fitRule('contain'), /object-position:/);
  assert.doesNotMatch(fitRule('natural'), /object-position:/);

  assert.deepEqual(
    {
      en: {
        galleryNavigation: en.visitor.imageLightbox.galleryNavigation,
        previous: en.visitor.imageLightbox.previous,
        next: en.visitor.imageLightbox.next
      },
      it: {
        galleryNavigation: it.visitor.imageLightbox.galleryNavigation,
        previous: it.visitor.imageLightbox.previous,
        next: it.visitor.imageLightbox.next
      }
    },
    {
      en: { galleryNavigation: 'Image navigation', previous: 'Previous', next: 'Next' },
      it: { galleryNavigation: 'Navigazione immagini', previous: 'Precedente', next: 'Successiva' }
    }
  );
});
