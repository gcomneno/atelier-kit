import assert from 'node:assert/strict';
import test from 'node:test';
import { validateLayoutBlockPlacements } from '../src/lib/layout-block-validation.js';

test('accepts valid legacy and canonical placement data', () => {
  assert.deepEqual(validateLayoutBlockPlacements({ placement: 'sidebar' }), []);
  assert.deepEqual(validateLayoutBlockPlacements({ placements: ['main', 'menu'] }), []);
  assert.deepEqual(validateLayoutBlockPlacements({ enabled: false, placements: [] }), []);
});

test('rejects malformed and ambiguous placement data with specific issues', () => {
  assert.deepEqual(validateLayoutBlockPlacements({ placements: 'main' }), [
    'layoutBlockPlacementsMustBeArray'
  ]);
  assert.deepEqual(validateLayoutBlockPlacements({ placements: ['elsewhere'] }), [
    'layoutBlockPlacementsItemInvalid'
  ]);
  assert.deepEqual(validateLayoutBlockPlacements({ placements: ['main', 'main'] }), [
    'layoutBlockPlacementsDuplicate'
  ]);
  assert.deepEqual(validateLayoutBlockPlacements({ enabled: true, placements: [] }), [
    'layoutBlockPlacementsRequired'
  ]);
  assert.deepEqual(validateLayoutBlockPlacements({ placement: 'main', placements: ['sidebar'] }), [
    'layoutBlockPlacementsAmbiguous'
  ]);
});
