import assert from 'node:assert/strict';
import test from 'node:test';

import { createTranslator } from './index.js';

test(
  'Hero save success message is localized in every supported operator locale',
  () => {
    const english =
      createTranslator('en');
    const italian =
      createTranslator('it');

    assert.equal(
      english(
        'server.saveHeroBannerSuccess'
      ),
      'Hero banner saved.'
    );

    assert.equal(
      italian(
        'server.saveHeroBannerSuccess'
      ),
      'Hero banner salvato.'
    );

    assert.notEqual(
      english(
        'server.saveHeroBannerSuccess'
      ),
      'server.saveHeroBannerSuccess'
    );

    assert.notEqual(
      italian(
        'server.saveHeroBannerSuccess'
      ),
      'server.saveHeroBannerSuccess'
    );
  }
);
