import assert from 'node:assert/strict';
import test from 'node:test';
import {
  DemoSessionStoreConflictError,
  InMemoryDemoSessionStore
} from './demo-session-store.js';

function record(byte = 1) {
  return {
    sessionId: Buffer.alloc(32, byte).toString('base64url'),
    csrfToken: Buffer.alloc(32, 101).toString('base64url'),
    createdAt: 100,
    rotatedAt: 100,
    expiresAt: 1000,
    lastSeenAt: 100
  };
}

test('Demo store snapshots state and rejects credential collisions', async () => {
  const store = new InMemoryDemoSessionStore();
  const input = record();

  const created = await store.create(input);
  input.lastSeenAt = 999;

  const stored = await store.read(created.sessionId);
  assert.ok(stored);
  assert.equal(stored.lastSeenAt, 100);

  await assert.rejects(
    () => store.create(record()),
    DemoSessionStoreConflictError
  );
});

test('Demo store supports compare-and-swap update replace and delete', async () => {
  const store = new InMemoryDemoSessionStore();
  const created = await store.create(record());

  const touched = await store.update(
    created.sessionId,
    created,
    {
      ...created,
      lastSeenAt: 200
    }
  );

  assert.ok(touched);

  const rotated = await store.replace(
    touched.sessionId,
    touched,
    {
      ...touched,
      sessionId: record(2).sessionId,
      rotatedAt: 200,
      lastSeenAt: 200
    }
  );

  assert.ok(rotated);
  assert.equal(await store.read(created.sessionId), null);
  assert.ok(await store.read(rotated.sessionId));

  assert.equal(await store.delete(rotated.sessionId), true);
  assert.equal(await store.delete(rotated.sessionId), false);
});
