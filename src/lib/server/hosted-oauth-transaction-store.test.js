import assert from 'node:assert/strict';
import test from 'node:test';
import {
  HostedOAuthTransactionStoreConflictError,
  InMemoryHostedOAuthTransactionStore
} from './hosted-oauth-transaction-store.js';

function transaction(state = 'state-a') {
  return {
    state,
    pkceVerifier: 'verifier-a',
    returnTo: '/studio',
    createdAt: 1000,
    expiresAt: 2000
  };
}

test('transaction store creates immutable isolated snapshots', () => {
  const store = new InMemoryHostedOAuthTransactionStore();
  const input = transaction();

  const created = store.create(input);

  input.returnTo = '/studio/changed';

  assert.equal(Object.isFrozen(created), true);
  assert.equal(created.returnTo, '/studio');

  const read = store.read('state-a');

  assert.ok(read !== null);
  assert.notEqual(read, created);
  assert.deepEqual(read, created);
});

test('duplicate OAuth state never overwrites an existing transaction', () => {
  const store = new InMemoryHostedOAuthTransactionStore();

  store.create(transaction('state-a'));

  assert.throws(
    () => store.create({
      ...transaction('state-a'),
      returnTo: '/studio/other'
    }),
    HostedOAuthTransactionStoreConflictError
  );

  const retained = store.read('state-a');

  assert.ok(retained !== null);
  assert.equal(retained.returnTo, '/studio');
});

test('consume is one-time and removes the transaction atomically', () => {
  const store = new InMemoryHostedOAuthTransactionStore();

  store.create(transaction('state-a'));

  const consumed = store.consume('state-a');

  assert.ok(consumed !== null);
  assert.equal(consumed.state, 'state-a');
  assert.equal(store.read('state-a'), null);
  assert.equal(store.consume('state-a'), null);
});

test('delete is idempotent', () => {
  const store = new InMemoryHostedOAuthTransactionStore();

  store.create(transaction('state-a'));

  assert.equal(store.delete('state-a'), true);
  assert.equal(store.delete('state-a'), false);
});
