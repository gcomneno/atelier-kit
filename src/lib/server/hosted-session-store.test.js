import assert from 'node:assert/strict';
import test from 'node:test';
import {
  HostedSessionStoreConflictError,
  HostedSessionStoreInvariantError,
  InMemoryHostedSessionStore
} from './hosted-session-store.js';

/**
 * @param {string} sessionId
 * @param {number} [lastSeenAt]
 */
function sessionRecord(sessionId, lastSeenAt = 1000) {
  return {
    sessionId,
    identity: {
      provider: 'github',
      subject: '123'
    },
    authorization: 'authorized',
    csrfToken: Buffer.alloc(32, 9).toString('base64url'),
    createdAt: 1000,
    rotatedAt: 1000,
    expiresAt: 9000,
    lastSeenAt
  };
}

/**
 * @param {InMemoryHostedSessionStore} store
 * @param {string} sessionId
 */
async function mustRead(store, sessionId) {
  const record = await store.read(sessionId);

  assert.ok(record !== null);

  return record;
}

test('store creates and reads immutable isolated awaitable session snapshots', async () => {
  const store = new InMemoryHostedSessionStore();
  const input = sessionRecord('session-a');

  const created = await store.create(input);

  input.identity.subject = '999';
  input.lastSeenAt = 5000;

  assert.equal(Object.isFrozen(created), true);
  assert.equal(Object.isFrozen(created.identity), true);
  assert.equal(created.identity.subject, '123');
  assert.equal(
    created.csrfToken,
    Buffer.alloc(32, 9).toString('base64url')
  );
  assert.equal(created.lastSeenAt, 1000);

  const read = await store.read('session-a');

  assert.notEqual(read, created);
  assert.deepEqual(read, created);
});

test('duplicate session creation never overwrites existing state', async () => {
  const store = new InMemoryHostedSessionStore();

  await store.create(sessionRecord('session-a'));

  await assert.rejects(
    () => store.create(sessionRecord('session-a', 4000)),
    HostedSessionStoreConflictError
  );

  assert.equal((await mustRead(store, 'session-a')).lastSeenAt, 1000);
});

test('update changes state without changing the lookup credential', async () => {
  const store = new InMemoryHostedSessionStore();

  await store.create(sessionRecord('session-a'));

  const updated = await store.update(
    'session-a',
    sessionRecord('session-a'),
    sessionRecord('session-a', 2000)
  );

  assert.ok(updated !== null);
  assert.equal(updated.lastSeenAt, 2000);
  assert.equal((await mustRead(store, 'session-a')).lastSeenAt, 2000);

  await assert.rejects(
    () => store.update(
      'session-a',
      sessionRecord('session-a'),
      sessionRecord('session-b', 3000)
    ),
    HostedSessionStoreInvariantError
  );
});

test('update of an unknown session fails closed without creating it', async () => {
  const store = new InMemoryHostedSessionStore();

  assert.equal(
    await store.update('missing', sessionRecord('missing'), sessionRecord('missing')),
    null
  );
  assert.equal(await store.read('missing'), null);
});

test('stale update snapshots cannot replace newer in-memory session state', async () => {
  const store = new InMemoryHostedSessionStore();
  const original = sessionRecord('session-a');

  await store.create(original);
  await store.update('session-a', original, sessionRecord('session-a', 2000));

  assert.equal(
    await store.update('session-a', original, sessionRecord('session-a', 3000)),
    null
  );
  assert.equal((await mustRead(store, 'session-a')).lastSeenAt, 2000);
});

test('replace atomically retires the old session credential', async () => {
  const store = new InMemoryHostedSessionStore();

  await store.create(sessionRecord('session-a'));

  const replacement = await store.replace(
    'session-a',
    sessionRecord('session-a'),
    sessionRecord('session-b', 2000)
  );

  assert.ok(replacement !== null);
  assert.equal(replacement.sessionId, 'session-b');
  assert.equal(await store.read('session-a'), null);
  assert.equal((await mustRead(store, 'session-b')).lastSeenAt, 2000);
});

test('async replacement collision preserves both existing sessions unchanged', async () => {
  const store = new InMemoryHostedSessionStore();

  await store.create(sessionRecord('session-a'));
  await store.create(sessionRecord('session-b', 3000));

  await assert.rejects(
    () => store.replace(
      'session-a',
      sessionRecord('session-a'),
      sessionRecord('session-b', 5000)
    ),
    HostedSessionStoreConflictError
  );

  assert.equal((await mustRead(store, 'session-a')).lastSeenAt, 1000);
  assert.equal((await mustRead(store, 'session-b')).lastSeenAt, 3000);
});

test('replace requires a genuinely new lookup credential', async () => {
  const store = new InMemoryHostedSessionStore();

  await store.create(sessionRecord('session-a'));

  await assert.rejects(
    () => store.replace(
      'session-a',
      sessionRecord('session-a'),
      sessionRecord('session-a', 2000)
    ),
    HostedSessionStoreInvariantError
  );
});

test('invalidation is effective and idempotent', async () => {
  const store = new InMemoryHostedSessionStore();

  await store.create(sessionRecord('session-a'));

  assert.equal(await store.delete('session-a'), true);
  assert.equal(await store.read('session-a'), null);
  assert.equal(await store.delete('session-a'), false);
});
