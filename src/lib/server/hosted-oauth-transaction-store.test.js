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

test('transaction store creates immutable isolated awaitable snapshots', async () => {
  const store = new InMemoryHostedOAuthTransactionStore();
  const input = transaction();

  const created = await store.create(input);

  input.returnTo = '/studio/changed';

  assert.equal(Object.isFrozen(created), true);
  assert.equal(created.returnTo, '/studio');

  const read = await store.read('state-a');

  assert.ok(read !== null);
  assert.notEqual(read, created);
  assert.deepEqual(read, created);
});

test('duplicate OAuth state never overwrites an existing transaction', async () => {
  const store = new InMemoryHostedOAuthTransactionStore();

  await store.create(transaction('state-a'));

  await assert.rejects(
    () => store.create({
      ...transaction('state-a'),
      returnTo: '/studio/other'
    }),
    HostedOAuthTransactionStoreConflictError
  );

  const retained = await store.read('state-a');

  assert.ok(retained !== null);
  assert.equal(retained.returnTo, '/studio');
});

test('concurrent OAuth consumes admit at most one caller', async () => {
  const store = new InMemoryHostedOAuthTransactionStore();

  await store.create(transaction('state-a'));

  const [first, second] = await Promise.all([
    store.consume('state-a'),
    store.consume('state-a')
  ]);

  const consumed = [first, second].filter(Boolean);
  assert.equal(consumed.length, 1);
  const [consumedTransaction] = consumed;
  assert.ok(consumedTransaction);
  assert.equal(consumedTransaction.state, 'state-a');
  assert.equal(await store.read('state-a'), null);
  assert.equal(await store.consume('state-a'), null);
});

test('delete is idempotent', async () => {
  const store = new InMemoryHostedOAuthTransactionStore();

  await store.create(transaction('state-a'));

  assert.equal(await store.delete('state-a'), true);
  assert.equal(await store.delete('state-a'), false);
});
