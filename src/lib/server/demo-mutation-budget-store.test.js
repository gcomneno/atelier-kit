import assert from 'node:assert/strict';
import test from 'node:test';
import {
  DemoMutationBudgetStoreConfigurationError,
  InMemoryDemoMutationBudgetStore
} from './demo-mutation-budget-store.js';

const KEY =
  Buffer.alloc(32, 17).toString('base64url');

test('Demo budget consumption is monotonic and bounded', async () => {
  const store = new InMemoryDemoMutationBudgetStore();

  assert.deepEqual(
    await store.consume({
      key: KEY,
      limit: 2,
      expiresAt: 1000
    }),
    {
      allowed: true,
      used: 1,
      remaining: 1
    }
  );

  assert.deepEqual(
    await store.consume({
      key: KEY,
      limit: 2,
      expiresAt: 1000
    }),
    {
      allowed: true,
      used: 2,
      remaining: 0
    }
  );

  assert.deepEqual(
    await store.consume({
      key: KEY,
      limit: 2,
      expiresAt: 1000
    }),
    {
      allowed: false,
      used: 2,
      remaining: 0
    }
  );
});

test('Demo budget refuses lifetime mutation and malformed requests', async () => {
  const store = new InMemoryDemoMutationBudgetStore();

  await store.consume({
    key: KEY,
    limit: 2,
    expiresAt: 1000
  });

  await assert.rejects(
    () => store.consume({
      key: KEY,
      limit: 2,
      expiresAt: 2000
    }),
    DemoMutationBudgetStoreConfigurationError
  );

  await assert.rejects(
    () => store.consume({
      key: 'bad',
      limit: 2,
      expiresAt: 1000
    }),
    DemoMutationBudgetStoreConfigurationError
  );
});
