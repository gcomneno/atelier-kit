import assert from 'node:assert/strict';
import test from 'node:test';
import {
  AuthorizedHostedIdentity,
  authorizeHostedIdentity,
  parseHostedAuthorizationConfig
} from './hosted-authorization.js';
import {
  DEFAULT_HOSTED_SESSION_POLICY,
  generateHostedSessionId,
  HostedSessionConfigurationError,
  HostedSessionLifecycle,
  HostedSessionLifecycleError,
  isCanonicalHostedSessionId,
  normalizeHostedSessionPolicy
} from './hosted-session.js';
import {
  InMemoryHostedSessionStore
} from './hosted-session-store.js';

const HOUR = 60 * 60 * 1000;
const MINUTE = 60 * 1000;

/**
 * @param {number} byte
 */
function fixedSessionId(byte) {
  return Buffer.alloc(32, byte).toString('base64url');
}

function trustedIdentity(subject = '123', login = 'operator') {
  const config = parseHostedAuthorizationConfig({
    ATELIER_STUDIO_AUTHORIZED_GITHUB_IDS: subject
  });

  const authorized = authorizeHostedIdentity(
    {
      provider: 'github',
      subject,
      login
    },
    config
  );

  assert.ok(authorized instanceof AuthorizedHostedIdentity);

  return authorized;
}

/**
 * @param {{
 *   now?: number,
 *   ids?: string[],
 *   store?: InMemoryHostedSessionStore,
 *   policy?: unknown
 * }} [options]
 */
function fixture({
  now = 1_000_000,
  ids = [
    fixedSessionId(1),
    fixedSessionId(2),
    fixedSessionId(3),
    fixedSessionId(4)
  ],
  store = new InMemoryHostedSessionStore(),
  policy = {}
} = {}) {
  let currentTime = now;
  let index = 0;

  const lifecycle = new HostedSessionLifecycle({
    store,
    clock: () => currentTime,
    sessionIdGenerator: () => ids[index++] ?? ids.at(-1),
    policy
  });

  return {
    lifecycle,
    store,
    /**
     * @param {number} value
     */
    setNow(value) {
      currentTime = value;
    }
  };
}

/**
 * @param {HostedSessionLifecycle} lifecycle
 * @param {string} sessionId
 */
function mustResolve(lifecycle, sessionId) {
  const result = lifecycle.resolve(sessionId);

  assert.ok(result !== null);

  return result;
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

test('generated session IDs are opaque canonical 256-bit base64url values', () => {
  const sessionId = generateHostedSessionId();

  assert.equal(isCanonicalHostedSessionId(sessionId), true);
  assert.equal(Buffer.from(sessionId, 'base64url').length, 32);

  for (const candidate of [
    '',
    'abc',
    'a'.repeat(42),
    'a'.repeat(44),
    `${'a'.repeat(42)}=`,
    `${'a'.repeat(42)}+`,
    null,
    undefined
  ]) {
    assert.equal(isCanonicalHostedSessionId(candidate), false);
  }
});

test('default lifecycle policy is the ADR 0009 8h/2h/45m policy', () => {
  assert.deepEqual(
    normalizeHostedSessionPolicy(),
    DEFAULT_HOSTED_SESSION_POLICY
  );
});

test('invalid policy configuration fails closed', () => {
  for (const policy of [
    null,
    [],
    { absoluteLifetimeMs: 0 },
    { idleTimeoutMs: -1 },
    { rotationAgeMs: Number.POSITIVE_INFINITY },
    { rotationAgeMs: 8 * HOUR },
    { unknown: 1 }
  ]) {
    assert.throws(
      () => normalizeHostedSessionPolicy(policy),
      HostedSessionConfigurationError
    );
  }
});

test('session creation requires a genuinely trusted authorization result', () => {
  const { lifecycle } = fixture();

  for (const value of [
    null,
    {},
    {
      identity: {
        provider: 'github',
        subject: '123'
      },
      authorized: true
    },
    Object.create(AuthorizedHostedIdentity.prototype)
  ]) {
    assert.throws(
      () => lifecycle.create(value),
      HostedSessionLifecycleError
    );
  }
});

test('creation stores only stable authorization identity and deterministic lifecycle state', () => {
  const start = 1_000_000;
  const { lifecycle } = fixture({ now: start });

  const session = lifecycle.create(
    trustedIdentity('123', 'display-login')
  );

  assert.deepEqual(session.identity, {
    provider: 'github',
    subject: '123'
  });
  assert.equal(session.authorization, 'authorized');
  assert.equal(session.createdAt, start);
  assert.equal(session.rotatedAt, start);
  assert.equal(session.lastSeenAt, start);
  assert.equal(session.expiresAt, start + 8 * HOUR);

  assert.equal('login' in session.identity, false);
  assert.equal('displayName' in session.identity, false);
  assert.equal('avatarUrl' in session.identity, false);
});

test('clock rollback relative to session state fails closed', () => {
  const start = 1_000_000;
  const { lifecycle, store, setNow } = fixture({ now: start });

  const session = lifecycle.create(trustedIdentity());

  setNow(start - 1);

  assert.equal(lifecycle.resolve(session.sessionId), null);
  assert.equal(store.read(session.sessionId), null);
});

test('exact absolute-expiry boundary fails closed and removes the session', () => {
  const start = 1_000_000;
  const { lifecycle, store, setNow } = fixture({ now: start });

  const session = lifecycle.create(trustedIdentity());

  setNow(start + 8 * HOUR);

  assert.equal(lifecycle.resolve(session.sessionId), null);
  assert.equal(store.read(session.sessionId), null);
});

test('exact idle-timeout boundary fails closed and removes the session', () => {
  const start = 1_000_000;
  const { lifecycle, store, setNow } = fixture({ now: start });

  const session = lifecycle.create(trustedIdentity());

  setNow(start + 2 * HOUR);

  assert.equal(lifecycle.resolve(session.sessionId), null);
  assert.equal(store.read(session.sessionId), null);
});

test('touch advances lastSeenAt without extending absolute expiry', () => {
  const start = 1_000_000;
  const { lifecycle, setNow } = fixture({ now: start });

  const session = lifecycle.create(trustedIdentity());

  setNow(start + HOUR);

  const touched = lifecycle.touch(session.sessionId);

  assert.ok(touched !== null);
  assert.equal(touched.session.createdAt, session.createdAt);
  assert.equal(touched.session.rotatedAt, session.rotatedAt);
  assert.equal(touched.session.lastSeenAt, start + HOUR);
  assert.equal(touched.session.expiresAt, session.expiresAt);
});

test('rotation becomes due exactly at the configured 45-minute boundary', () => {
  const start = 1_000_000;
  const { lifecycle, setNow } = fixture({ now: start });

  const session = lifecycle.create(trustedIdentity());

  setNow(start + 45 * MINUTE - 1);
  assert.equal(
    mustResolve(lifecycle, session.sessionId).rotationDue,
    false
  );

  setNow(start + 45 * MINUTE);
  assert.equal(
    mustResolve(lifecycle, session.sessionId).rotationDue,
    true
  );
});

test('rotation issues a fresh ID, retires the old ID and preserves absolute lifetime', () => {
  const start = 1_000_000;
  const { lifecycle, store, setNow } = fixture({ now: start });

  const original = lifecycle.create(trustedIdentity());

  setNow(start + 45 * MINUTE);

  const rotated = lifecycle.rotate(original.sessionId);

  assert.ok(rotated !== null);
  assert.notEqual(rotated.sessionId, original.sessionId);
  assert.equal(store.read(original.sessionId), null);
  assert.notEqual(store.read(rotated.sessionId), null);

  assert.equal(rotated.createdAt, original.createdAt);
  assert.equal(rotated.expiresAt, original.expiresAt);
  assert.equal(rotated.rotatedAt, start + 45 * MINUTE);
  assert.equal(rotated.lastSeenAt, start + 45 * MINUTE);
});

test('rotation never revives unknown, malformed, idle-expired or absolutely expired sessions', () => {
  const start = 1_000_000;

  {
    const { lifecycle } = fixture({ now: start });
    assert.equal(lifecycle.rotate(fixedSessionId(99)), null);
    assert.equal(lifecycle.rotate('not-a-session-id'), null);
  }

  {
    const { lifecycle, setNow } = fixture({ now: start });
    const session = lifecycle.create(trustedIdentity());

    setNow(start + 2 * HOUR);
    assert.equal(lifecycle.rotate(session.sessionId), null);
  }

  {
    const { lifecycle, setNow } = fixture({ now: start });
    const session = lifecycle.create(trustedIdentity());

    setNow(start + 8 * HOUR);
    assert.equal(lifecycle.rotate(session.sessionId), null);
  }
});

test('invalidation is effective and idempotent', () => {
  const { lifecycle } = fixture();
  const session = lifecycle.create(trustedIdentity());

  assert.equal(lifecycle.invalidate(session.sessionId), true);
  assert.equal(lifecycle.resolve(session.sessionId), null);
  assert.equal(lifecycle.invalidate(session.sessionId), false);
  assert.equal(lifecycle.invalidate('malformed'), false);
});

test('generated ID collisions never overwrite an existing session', () => {
  const firstId = fixedSessionId(1);
  const secondId = fixedSessionId(2);

  const { lifecycle, store } = fixture({
    ids: [
      firstId,
      firstId,
      secondId
    ]
  });

  const first = lifecycle.create(trustedIdentity('123'));
  const second = lifecycle.create(trustedIdentity('456'));

  assert.equal(first.sessionId, firstId);
  assert.equal(second.sessionId, secondId);

  assert.equal(mustRead(store, firstId).identity.subject, '123');
  assert.equal(mustRead(store, secondId).identity.subject, '456');
});

test('persistent generated ID collisions fail without disclosing or overwriting the existing ID', () => {
  const collisionId = fixedSessionId(7);

  const { lifecycle, store } = fixture({
    ids: [collisionId]
  });

  lifecycle.create(trustedIdentity('123'));

  assert.throws(
    () => lifecycle.create(trustedIdentity('456')),
    (error) => {
      assert.ok(error instanceof HostedSessionLifecycleError);
      assert.equal(error.message.includes(collisionId), false);
      return true;
    }
  );

  assert.equal(mustRead(store, collisionId).identity.subject, '123');
});

test('returned session snapshots cannot mutate store-owned state', () => {
  const { lifecycle, store } = fixture();

  const session = lifecycle.create(trustedIdentity());

  assert.equal(Object.isFrozen(session), true);
  assert.equal(Object.isFrozen(session.identity), true);

  const mutableIdentity =
    /** @type {{ subject: string }} */ (
      /** @type {unknown} */ (session.identity)
    );

  assert.throws(
    () => {
      mutableIdentity.subject = '999';
    },
    TypeError
  );

  assert.equal(
    mustRead(store, session.sessionId).identity.subject,
    '123'
  );
});

test('malformed generated identifiers fail without leaking their value', () => {
  const secretLikeValue = 'this-is-not-a-valid-session-secret';

  const { lifecycle } = fixture({
    ids: [secretLikeValue]
  });

  assert.throws(
    () => lifecycle.create(trustedIdentity()),
    (error) => {
      assert.ok(error instanceof HostedSessionLifecycleError);
      assert.equal(error.message.includes(secretLikeValue), false);
      return true;
    }
  );
});
