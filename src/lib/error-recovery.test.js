import assert from 'node:assert/strict';
import test from 'node:test';

import { getErrorRecovery } from './error-recovery.js';
import { createVisitorTranslator } from './i18n/index.js';

test('global error recovery keeps visitor, item, and Studio namespaces separate', () => {
  assert.deepEqual(getErrorRecovery('/unknown', 404), {
    href: '/',
    labelKey: 'error.backToHome'
  });
  assert.deepEqual(getErrorRecovery('/items/missing-item', 404), {
    href: '/catalog',
    labelKey: 'common.backToCatalog'
  });
  assert.deepEqual(getErrorRecovery('/studio', 404), {
    href: '/studio',
    labelKey: 'error.backToStudio'
  });
  assert.deepEqual(getErrorRecovery('/studio/unknown', 404), {
    href: '/studio',
    labelKey: 'error.backToStudio'
  });
  assert.deepEqual(getErrorRecovery('/studio/editor/items/missing', 404), {
    href: '/studio',
    labelKey: 'error.backToStudio'
  });
  assert.deepEqual(getErrorRecovery('/studiox/unknown', 404), {
    href: '/',
    labelKey: 'error.backToHome'
  });
});

test('Studio recovery label is localized through the visitor catalog', () => {
  assert.equal(createVisitorTranslator('en')('visitor.error.backToStudio'), 'Back to Studio');
  assert.equal(createVisitorTranslator('it')('visitor.error.backToStudio'), 'Torna allo Studio');
});
