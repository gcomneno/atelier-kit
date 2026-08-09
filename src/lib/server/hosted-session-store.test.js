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
function mustRead(store, sessionId) {
  const record = store.read(sessionId);

  assert.ok(record !== null);

  return record;
}

test('store creates and reads immutable isolated session snapshots', () => {
  const store = new InMemoryHostedSessionStore();
  const input = sessionRecord('session-a');

  const created = store.create(input);

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

  const read = store.read('session-a');

  assert.notEqual(read, created);
  assert.deepEqual(read, created);
});

test('duplicate session creation never overwrites existing state', () => {
  const store = new InMemoryHostedSessionStore();

  store.create(sessionRecord('session-a'));

  assert.throws(
    () => store.create(sessionRecord('session-a', 4000)),
    HostedSessionStoreConflictError
  );

  assert.equal(mustRead(store, 'session-a').lastSeenAt, 1000);
});

test('update changes state without changing the lookup credential', () => {
  const store = new InMemoryHostedSessionStore();

  store.create(sessionRecord('session-a'));

  const updated = store.update(
    'session-a',
    sessionRecord('session-a', 2000)
  );

  assert.ok(updated !== null);
  assert.equal(updated.lastSeenAt, 2000);
  assert.equal(mustRead(store, 'session-a').lastSeenAt, 2000);

  assert.throws(
    () => store.update(
      'session-a',
      sessionRecord('session-b', 3000)
    ),
    HostedSessionStoreInvariantError
  );
});

test('update of an unknown session fails closed without creating it', () => {
  const store = new InMemoryHostedSessionStore();

  assert.equal(
    store.update('missing', sessionRecord('missing')),
    null
  );
  assert.equal(store.read('missing'), null);
});

test('replace atomically retires the old session credential', () => {
  const store = new InMemoryHostedSessionStore();

  store.create(sessionRecord('session-a'));

  const replacement = store.replace(
    'session-a',
    sessionRecord('session-b', 2000)
  );

  assert.ok(replacement !== null);
  assert.equal(replacement.sessionId, 'session-b');
  assert.equal(store.read('session-a'), null);
  assert.equal(mustRead(store, 'session-b').lastSeenAt, 2000);
});

test('replacement collision preserves both existing sessions unchanged', () => {
  const store = new InMemoryHostedSessionStore();

  store.create(sessionRecord('session-a'));
  store.create(sessionRecord('session-b', 3000));

  assert.throws(
    () => store.replace(
      'session-a',
      sessionRecord('session-b', 5000)
    ),
    HostedSessionStoreConflictError
  );

  assert.equal(mustRead(store, 'session-a').lastSeenAt, 1000);
  assert.equal(mustRead(store, 'session-b').lastSeenAt, 3000);
});

test('replace requires a genuinely new lookup credential', () => {
  const store = new InMemoryHostedSessionStore();

  store.create(sessionRecord('session-a'));

  assert.throws(
    () => store.replace(
      'session-a',
      sessionRecord('session-a', 2000)
    ),
    HostedSessionStoreInvariantError
  );
});

test('invalidation is effective and idempotent', () => {
  const store = new InMemoryHostedSessionStore();

  store.create(sessionRecord('session-a'));

  assert.equal(store.delete('session-a'), true);
  assert.equal(store.read('session-a'), null);
  assert.equal(store.delete('session-a'), false);
});
