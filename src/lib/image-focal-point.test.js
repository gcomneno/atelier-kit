import assert from 'node:assert/strict';
import test from 'node:test';

import {
  getImageFocalPointObjectPosition,
  isValidImageFocalPoint,
  parseImageFocalPoint,
  parseImageFocalPointFormFields
} from './image-focal-point.js';

test('missing focal points fall back to center', () => {
  assert.equal(parseImageFocalPoint(undefined), null);
  assert.equal(parseImageFocalPoint(null), null);
  assert.equal(getImageFocalPointObjectPosition(undefined), 'center');
  assert.equal(getImageFocalPointObjectPosition(null), 'center');
});

test('valid focal points are preserved', () => {
  assert.equal(isValidImageFocalPoint({ x: 0.25, y: 0.75 }), true);
  assert.deepEqual(
    parseImageFocalPoint({ x: 0.25, y: 0.75 }),
    { x: 0.25, y: 0.75 }
  );
});

test('inclusive boundaries are valid', () => {
  assert.equal(isValidImageFocalPoint({ x: 0, y: 1 }), true);
  assert.equal(isValidImageFocalPoint({ x: 1, y: 0 }), true);
});

test('malformed focal points are rejected', () => {
  const invalid = [
    { x: '0.5', y: 0.5 },
    { x: 0.5, y: '0.5' },
    { x: 0.5 },
    { y: 0.5 },
    { x: NaN, y: 0.5 },
    { x: 0.5, y: Infinity },
    { x: -0.01, y: 0.5 },
    { x: 0.5, y: 1.01 },
    [],
    null
  ];

  for (const value of invalid) {
    assert.equal(isValidImageFocalPoint(value), false);
    assert.equal(parseImageFocalPoint(value), null);
  }
});

test('object-position maps normalized coordinates to percentages', () => {
  assert.equal(
    getImageFocalPointObjectPosition({ x: 0, y: 1 }),
    '0% 100%'
  );

  assert.equal(
    getImageFocalPointObjectPosition({ x: 1, y: 0 }),
    '100% 0%'
  );

  assert.equal(
    getImageFocalPointObjectPosition({ x: 0.25, y: 0.75 }),
    '25% 75%'
  );
});


test('form parser distinguishes reset from valid focal-point submission', () => {
  assert.equal(
    parseImageFocalPointFormFields({
      enabled: false,
      x: null,
      y: null
    }),
    null
  );

  assert.deepEqual(
    parseImageFocalPointFormFields({
      enabled: true,
      x: '0',
      y: '1'
    }),
    { x: 0, y: 1 }
  );

  assert.deepEqual(
    parseImageFocalPointFormFields({
      enabled: true,
      x: '0.28',
      y: '0.35'
    }),
    { x: 0.28, y: 0.35 }
  );
});

test('form parser rejects malformed or incomplete enabled submissions', () => {
  const invalid = [
    { enabled: false, x: '0.5', y: null },
    { enabled: false, x: null, y: '0.5' },
    { enabled: true, x: null, y: null },
    { enabled: true, x: '0.5', y: null },
    { enabled: true, x: null, y: '0.5' },
    { enabled: true, x: '', y: '0.5' },
    { enabled: true, x: 'NaN', y: '0.5' },
    { enabled: true, x: 'Infinity', y: '0.5' },
    { enabled: true, x: '-0.1', y: '0.5' },
    { enabled: true, x: '1.1', y: '0.5' },
    { enabled: true, x: '0x1', y: '0.5' }
  ];

  for (const input of invalid) {
    assert.throws(
      () => parseImageFocalPointFormFields(input),
      TypeError
    );
  }
});
