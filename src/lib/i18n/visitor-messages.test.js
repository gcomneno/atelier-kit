import assert from 'node:assert/strict';
import test from 'node:test';

import { createVisitorTranslator } from './index.js';

test('Italian view-all label stays neutral for every item plural', () => {
  const translate = createVisitorTranslator('it');

  assert.equal(translate('visitor.common.viewAllItems', { itemPlural: 'racconti' }), 'Vedi tutti');
  assert.equal(translate('visitor.common.viewAllItems', { itemPlural: 'opere' }), 'Vedi tutti');
  assert.doesNotMatch(translate('visitor.common.viewAllItems', { itemPlural: 'racconti' }), /tutte le racconti/);
});

test('English view-all label still includes the configured item plural', () => {
  const translate = createVisitorTranslator('en');

  assert.equal(translate('visitor.common.viewAllItems', { itemPlural: 'stories' }), 'View all stories');
});
