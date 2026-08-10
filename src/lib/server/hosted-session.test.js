import assert from 'node:assert/strict';
import test from 'node:test';
import {
  AuthorizedHostedIdentity,
  authorizeHostedIdentity,
  parseHostedAuthorizationConfig
} from './hosted-authorization.js';
import {
  DEFAULT_HOSTED_SESSION_POLICY,
  generateHostedCsrfToken,
  generateHostedSessionId,
  HostedSessionConfigurationError,
  HostedSessionLifecycle,
  HostedSessionLifecycleError,
  isCanonicalHostedCsrfToken,
  isCanonicalHostedSessionId,
  normalizeHostedSessionPolicy
} from './hosted-session.js';
import {
  InMemoryHostedSessionStore
} from './hosted-session-store.js';
import {
  HOSTED_SECURITY_EVENT_REASONS,
  HOSTED_SECURITY_EVENT_TYPES,
  HostedSecurityEventRecorder,
  serializeHostedSecurityEvent
} from './hosted-security-events.js';

const HOUR = 60 * 60 * 1000;
const MINUTE = 60 * 1000;

/**
 * @param {number} byte
 */
function fixedSessionId(byte) {
  return Buffer.alloc(32, byte).toString('base64url');
}

/**
 * @param {number} byte
 */
function fixedCsrfToken(byte) {
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
 *   csrfTokens?: string[],
 *   store?: InMemoryHostedSessionStore,
 *   policy?: unknown,
 *   securityEventRecorder?: any
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
  csrfTokens = [
    fixedCsrfToken(101),
    fixedCsrfToken(102),
    fixedCsrfToken(103),
    fixedCsrfToken(104)
  ],
  store = new InMemoryHostedSessionStore(),
  policy = {},
  securityEventRecorder
} = {}) {
  let currentTime = now;
  let idIndex = 0;
  let csrfIndex = 0;

  const lifecycle = new HostedSessionLifecycle({
    store,
    clock: () => currentTime,
    sessionIdGenerator: () =>
      ids[idIndex++] ?? ids.at(-1),
    csrfTokenGenerator: () =>
      csrfTokens[csrfIndex++] ?? csrfTokens.at(-1),
    policy,
    ...(securityEventRecorder === undefined
      ? {}
      : { securityEventRecorder })
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
async function mustResolve(lifecycle, sessionId) {
  const result = await lifecycle.resolve(sessionId);

  assert.ok(result !== null);

  return result;
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

test('generated CSRF tokens are canonical independent 256-bit secrets', () => {
  const sessionId = generateHostedSessionId();
  const csrfToken = generateHostedCsrfToken();

  assert.equal(isCanonicalHostedCsrfToken(csrfToken), true);
  assert.equal(Buffer.from(csrfToken, 'base64url').length, 32);

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
    assert.equal(isCanonicalHostedCsrfToken(candidate), false);
  }

  assert.notEqual(csrfToken, sessionId);
});

test('session and CSRF generators are independent lifecycle dependencies', async () => {
  let sessionCalls = 0;
  let csrfCalls = 0;

  const lifecycle = new HostedSessionLifecycle({
    store: new InMemoryHostedSessionStore(),
    clock: () => 1_000_000,
    sessionIdGenerator: () => {
      sessionCalls += 1;
      return fixedSessionId(1);
    },
    csrfTokenGenerator: () => {
      csrfCalls += 1;
      return fixedCsrfToken(101);
    }
  });

  const session = await lifecycle.create(trustedIdentity());

  assert.equal(sessionCalls, 1);
  assert.equal(csrfCalls, 1);
  assert.equal(session.sessionId, fixedSessionId(1));
  assert.equal(session.csrfToken, fixedCsrfToken(101));
  assert.notEqual(session.sessionId, session.csrfToken);
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

test('session creation requires a genuinely trusted authorization result', async () => {
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
    await assert.rejects(
      () => lifecycle.create(value),
      HostedSessionLifecycleError
    );
  }
});

test('creation stores only stable authorization identity and deterministic lifecycle state', async () => {
  const start = 1_000_000;
  const { lifecycle } = fixture({ now: start });

  const session = await lifecycle.create(
    trustedIdentity('123', 'display-login')
  );

  assert.deepEqual(session.identity, {
    provider: 'github',
    subject: '123'
  });
  assert.equal(session.authorization, 'authorized');
  assert.equal(session.csrfToken, fixedCsrfToken(101));
  assert.notEqual(session.csrfToken, session.sessionId);
  assert.equal(session.createdAt, start);
  assert.equal(session.rotatedAt, start);
  assert.equal(session.lastSeenAt, start);
  assert.equal(session.expiresAt, start + 8 * HOUR);

  assert.equal('login' in session.identity, false);
  assert.equal('displayName' in session.identity, false);
  assert.equal('avatarUrl' in session.identity, false);
});

test('clock rollback relative to session state fails closed', async () => {
  const start = 1_000_000;
  const { lifecycle, store, setNow } = fixture({ now: start });

  const session = await lifecycle.create(trustedIdentity());

  setNow(start - 1);

  assert.equal(await lifecycle.resolve(session.sessionId), null);
  assert.equal(await store.read(session.sessionId), null);
});

test('exact absolute-expiry boundary fails closed and removes the session', async () => {
  const start = 1_000_000;
  const { lifecycle, store, setNow } = fixture({ now: start });

  const session = await lifecycle.create(trustedIdentity());

  setNow(start + 8 * HOUR);

  assert.equal(await lifecycle.resolve(session.sessionId), null);
  assert.equal(await store.read(session.sessionId), null);
});

test('exact idle-timeout boundary fails closed and removes the session', async () => {
  const start = 1_000_000;
  const { lifecycle, store, setNow } = fixture({ now: start });

  const session = await lifecycle.create(trustedIdentity());

  setNow(start + 2 * HOUR);

  assert.equal(await lifecycle.resolve(session.sessionId), null);
  assert.equal(await store.read(session.sessionId), null);
});

test('touch advances lastSeenAt without extending absolute expiry', async () => {
  const start = 1_000_000;
  const { lifecycle, setNow } = fixture({ now: start });

  const session = await lifecycle.create(trustedIdentity());

  setNow(start + HOUR);

  const touched = await lifecycle.touch(session.sessionId);

  assert.ok(touched !== null);
  assert.equal(touched.session.createdAt, session.createdAt);
  assert.equal(touched.session.csrfToken, session.csrfToken);
  assert.equal(touched.session.rotatedAt, session.rotatedAt);
  assert.equal(touched.session.lastSeenAt, start + HOUR);
  assert.equal(touched.session.expiresAt, session.expiresAt);
});

test('rotation becomes due exactly at the configured 45-minute boundary', async () => {
  const start = 1_000_000;
  const { lifecycle, setNow } = fixture({ now: start });

  const session = await lifecycle.create(trustedIdentity());

  setNow(start + 45 * MINUTE - 1);
  assert.equal(
    (await mustResolve(lifecycle, session.sessionId)).rotationDue,
    false
  );

  setNow(start + 45 * MINUTE);
  assert.equal(
    (await mustResolve(lifecycle, session.sessionId)).rotationDue,
    true
  );
});

test('rotation issues a fresh ID, retires the old ID and preserves absolute lifetime', async () => {
  const start = 1_000_000;
  const { lifecycle, store, setNow } = fixture({ now: start });

  const original = await lifecycle.create(trustedIdentity());

  setNow(start + 45 * MINUTE);

  const rotated = await lifecycle.rotate(original.sessionId);

  assert.ok(rotated !== null);
  assert.notEqual(rotated.sessionId, original.sessionId);
  assert.equal(await store.read(original.sessionId), null);
  assert.notEqual(await store.read(rotated.sessionId), null);

  assert.equal(rotated.createdAt, original.createdAt);
  assert.equal(rotated.csrfToken, original.csrfToken);
  assert.equal(rotated.expiresAt, original.expiresAt);
  assert.equal(rotated.rotatedAt, start + 45 * MINUTE);
  assert.equal(rotated.lastSeenAt, start + 45 * MINUTE);
});

test('rotation never revives unknown, malformed, idle-expired or absolutely expired sessions', async () => {
  const start = 1_000_000;

  {
    const { lifecycle } = fixture({ now: start });
    assert.equal(await lifecycle.rotate(fixedSessionId(99)), null);
    assert.equal(await lifecycle.rotate('not-a-session-id'), null);
  }

  {
    const { lifecycle, setNow } = fixture({ now: start });
    const session = await lifecycle.create(trustedIdentity());

    setNow(start + 2 * HOUR);
    assert.equal(await lifecycle.rotate(session.sessionId), null);
  }

  {
    const { lifecycle, setNow } = fixture({ now: start });
    const session = await lifecycle.create(trustedIdentity());

    setNow(start + 8 * HOUR);
    assert.equal(await lifecycle.rotate(session.sessionId), null);
  }
});

test('malformed stored CSRF state invalidates the session fail-closed', async () => {
  const sessionId = fixedSessionId(8);
  const store = new InMemoryHostedSessionStore();

  await store.create({
    sessionId,
    identity: {
      provider: 'github',
      subject: '123'
    },
    authorization: 'authorized',
    csrfToken: 'not-a-canonical-csrf-token',
    createdAt: 1_000_000,
    rotatedAt: 1_000_000,
    expiresAt: 1_000_000 + 8 * HOUR,
    lastSeenAt: 1_000_000
  });

  const { lifecycle } = fixture({
    now: 1_000_000,
    store
  });

  assert.equal(await lifecycle.resolve(sessionId), null);
  assert.equal(await store.read(sessionId), null);
});

test('CSRF token cannot equal the session lookup credential', async () => {
  const shared = fixedSessionId(1);

  const { lifecycle } = fixture({
    ids: [
      shared,
      fixedSessionId(2)
    ],
    csrfTokens: [shared]
  });

  const session = await lifecycle.create(trustedIdentity());

  assert.equal(session.csrfToken, shared);
  assert.equal(session.sessionId, fixedSessionId(2));
  assert.notEqual(session.sessionId, session.csrfToken);
});

test('invalidation is effective and idempotent', async () => {
  const { lifecycle } = fixture();
  const session = await lifecycle.create(trustedIdentity());

  assert.equal(await lifecycle.invalidate(session.sessionId), true);
  assert.equal(await lifecycle.resolve(session.sessionId), null);
  assert.equal(await lifecycle.invalidate(session.sessionId), false);
  assert.equal(await lifecycle.invalidate('malformed'), false);
});

test('generated ID collisions never overwrite an existing session', async () => {
  const firstId = fixedSessionId(1);
  const secondId = fixedSessionId(2);

  const { lifecycle, store } = fixture({
    ids: [
      firstId,
      firstId,
      secondId
    ]
  });

  const first = await lifecycle.create(trustedIdentity('123'));
  const second = await lifecycle.create(trustedIdentity('456'));

  assert.equal(first.sessionId, firstId);
  assert.equal(second.sessionId, secondId);

  assert.equal((await mustRead(store, firstId)).identity.subject, '123');
  assert.equal((await mustRead(store, secondId)).identity.subject, '456');
});

test('persistent generated ID collisions fail without disclosing or overwriting the existing ID', async () => {
  const collisionId = fixedSessionId(7);

  const { lifecycle, store } = fixture({
    ids: [collisionId]
  });

  await lifecycle.create(trustedIdentity('123'));

  await assert.rejects(
    () => lifecycle.create(trustedIdentity('456')),
    (error) => {
      assert.ok(error instanceof HostedSessionLifecycleError);
      assert.equal(error.message.includes(collisionId), false);
      return true;
    }
  );

  assert.equal((await mustRead(store, collisionId)).identity.subject, '123');
});

test('returned session snapshots cannot mutate store-owned state', async () => {
  const { lifecycle, store } = fixture();

  const session = await lifecycle.create(trustedIdentity());

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
    (await mustRead(store, session.sessionId)).identity.subject,
    '123'
  );
});

test('malformed generated CSRF tokens fail without leaking their value', async () => {
  const secretLikeValue = 'this-is-not-a-valid-csrf-secret';

  const { lifecycle } = fixture({
    csrfTokens: [secretLikeValue]
  });

  await assert.rejects(
    () => lifecycle.create(trustedIdentity()),
    (error) => {
      assert.ok(error instanceof HostedSessionLifecycleError);
      assert.equal(error.message.includes(secretLikeValue), false);
      return true;
    }
  );
});

test('CSRF generator failures are generic and fail closed', async () => {
  const lifecycle = new HostedSessionLifecycle({
    store: new InMemoryHostedSessionStore(),
    clock: () => 1_000_000,
    sessionIdGenerator: () => fixedSessionId(1),
    csrfTokenGenerator: () => {
      throw new Error('csrf-provider-secret');
    }
  });

  await assert.rejects(
    () => lifecycle.create(trustedIdentity()),
    (error) => {
      assert.ok(error instanceof HostedSessionLifecycleError);
      assert.equal(
        error.message.includes('csrf-provider-secret'),
        false
      );
      return true;
    }
  );
});

test('malformed generated identifiers fail without leaking their value', async () => {
  const secretLikeValue = 'this-is-not-a-valid-session-secret';

  const { lifecycle } = fixture({
    ids: [secretLikeValue]
  });

  await assert.rejects(
    () => lifecycle.create(trustedIdentity()),
    (error) => {
      assert.ok(error instanceof HostedSessionLifecycleError);
      assert.equal(error.message.includes(secretLikeValue), false);
      return true;
    }
  );
});


function sessionSecurityEventCapture() {
  /** @type {any[]} */
  const events = [];

  return {
    events,
    recorder: new HostedSecurityEventRecorder({
      clock: () => 999999,
      sink(event) {
        events.push(event);
      }
    })
  };
}

test('explicit invalidation records only an actually removed session', async () => {
  const capture = sessionSecurityEventCapture();

  const { lifecycle } = fixture({
    securityEventRecorder: capture.recorder
  });

  const created = await lifecycle.create(trustedIdentity());

  assert.equal(
    await lifecycle.invalidate(created.sessionId),
    true
  );

  assert.equal(
    await lifecycle.invalidate(created.sessionId),
    false
  );

  assert.equal(
    await lifecycle.invalidate(
      'SESSION_IDENTIFIER_SENTINEL_DO_NOT_LOG'
    ),
    false
  );

  assert.deepEqual(capture.events, [{
    version: 1,
    type:
      HOSTED_SECURITY_EVENT_TYPES.SESSION_INVALIDATED,
    occurredAt: 999999,
    reason:
      HOSTED_SECURITY_EVENT_REASONS
        .SESSION_EXPLICIT_INVALIDATION
  }]);

  const serialized =
    serializeHostedSecurityEvent(capture.events[0]);

  assert.equal(
    serialized.includes(created.sessionId),
    false
  );
  assert.equal(
    serialized.includes(created.csrfToken),
    false
  );
});

test('automatic expiry cleanup does not masquerade as explicit invalidation telemetry', async () => {
  const capture = sessionSecurityEventCapture();
  const start = 1_000_000;

  const {
    lifecycle,
    setNow
  } = fixture({
    now: start,
    securityEventRecorder: capture.recorder
  });

  const created = await lifecycle.create(trustedIdentity());

  setNow(
    start +
      DEFAULT_HOSTED_SESSION_POLICY.idleTimeoutMs
  );

  assert.equal(
    await lifecycle.resolve(created.sessionId),
    null
  );

  assert.deepEqual(capture.events, []);
});

test('session invalidation recorder failure cannot change successful invalidation', async () => {
  const { lifecycle, store } = fixture({
    securityEventRecorder: {
      record() {
        throw new Error(
          'LOGGER_SECRET_SHOULD_NOT_ESCAPE'
        );
      }
    }
  });

  const created = await lifecycle.create(trustedIdentity());

  assert.equal(
    await lifecycle.invalidate(created.sessionId),
    true
  );

  assert.equal(
    await store.read(created.sessionId),
    null
  );
});
