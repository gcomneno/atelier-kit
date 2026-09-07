import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

import {
  getImageFocalPointObjectPosition
} from '../src/lib/image-focal-point.js';

const visitorSource =
  fs.readFileSync(
    'src/routes/+page.svelte',
    'utf8'
  );

test('Visitor Hero uses the canonical focal-point object-position mapping', () => {
  assert.match(
    visitorSource,
    /getImageFocalPointObjectPosition/
  );

  assert.match(
    visitorSource,
    /style:object-position=\{bannerObjectPosition\}/
  );

  assert.equal(
    getImageFocalPointObjectPosition({
      x: 0.28,
      y: 0.35
    }),
    '28% 35%'
  );
});

test('Visitor Hero missing focal metadata preserves centered legacy rendering', () => {
  assert.equal(
    getImageFocalPointObjectPosition(undefined),
    'center'
  );

  assert.equal(
    getImageFocalPointObjectPosition(null),
    'center'
  );
});
