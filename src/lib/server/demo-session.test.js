import assert from 'node:assert/strict';
import test from 'node:test';
import {
  DEFAULT_DEMO_SESSION_POLICY,
  DemoSessionLifecycle,
  DemoSessionLifecycleError,
  generateDemoCsrfToken,
  generateDemoSessionId,
  isCanonicalDemoCsrfToken,
  isCanonicalDemoSessionId,
  normalizeDemoSessionPolicy
} from './demo-session.js';
import {
  InMemoryDemoSessionStore
} from './demo-session-store.js';

/**
 * @param {number} byte
 */
function fixed(byte) {
  return Buffer.alloc(32, byte).toString('base64url');
}

function fixture() {
  let now = 1_000_000;
  let idIndex = 0;
  const ids = [fixed(1), fixed(2), fixed(3)];

  const store = new InMemoryDemoSessionStore();
  const lifecycle = new DemoSessionLifecycle({
    store,
    clock: () => now,
    sessionIdGenerator: () => ids[idIndex++],
    csrfTokenGenerator: () => fixed(101)
  });

  return {
    lifecycle,
    store,
    /** @param {number} value */
    setNow(value) {
      now = value;
    }
  };
}

test('Demo credentials are independent canonical opaque 256-bit values', () => {
  const sessionId = generateDemoSessionId();
  const csrfToken = generateDemoCsrfToken();

  assert.equal(isCanonicalDemoSessionId(sessionId), true);
  assert.equal(isCanonicalDemoCsrfToken(csrfToken), true);
  assert.equal(Buffer.from(sessionId, 'base64url').length, 32);
  assert.equal(Buffer.from(csrfToken, 'base64url').length, 32);
  assert.notEqual(sessionId, csrfToken);

  for (const value of ['', 'abc', 'a'.repeat(42), null, undefined]) {
    assert.equal(isCanonicalDemoSessionId(value), false);
    assert.equal(isCanonicalDemoCsrfToken(value), false);
  }
});

test('Demo policy is deliberately short-lived', () => {
  assert.deepEqual(
    normalizeDemoSessionPolicy(),
    DEFAULT_DEMO_SESSION_POLICY
  );

  assert.deepEqual(DEFAULT_DEMO_SESSION_POLICY, {
    absoluteLifetimeMs: 30 * 60 * 1000,
    idleTimeoutMs: 10 * 60 * 1000,
    rotationAgeMs: 5 * 60 * 1000
  });
});

test('guest session creation carries no identity or authorization surrogate', async () => {
  const { lifecycle } = fixture();
  const session = await lifecycle.create();

  assert.deepEqual(
    Object.keys(session).sort(),
    [
      'createdAt',
      'csrfToken',
      'expiresAt',
      'lastSeenAt',
      'rotatedAt',
      'sessionId'
    ]
  );

  assert.equal('identity' in session, false);
  assert.equal('authorization' in session, false);
});

test('resolve touch rotation and invalidation preserve bounded authority', async () => {
  const { lifecycle, setNow } = fixture();

  const created = await lifecycle.create();

  setNow(created.createdAt + 4 * 60 * 1000);

  let resolved = await lifecycle.resolve(created.sessionId);
  assert.ok(resolved);
  assert.equal(resolved.rotationDue, false);

  setNow(created.createdAt + 5 * 60 * 1000);

  resolved = await lifecycle.touch(created.sessionId);
  assert.ok(resolved);
  assert.equal(resolved.rotationDue, true);

  const rotated = await lifecycle.rotate(created.sessionId);
  assert.ok(rotated);
  assert.notEqual(rotated.sessionId, created.sessionId);
  assert.equal(rotated.csrfToken, created.csrfToken);

  assert.equal(
    await lifecycle.resolve(created.sessionId),
    null
  );
  assert.ok(
    await lifecycle.resolve(rotated.sessionId)
  );

  assert.equal(
    await lifecycle.invalidate(rotated.sessionId),
    true
  );
  assert.equal(
    await lifecycle.resolve(rotated.sessionId),
    null
  );
});

test('idle and absolute expiry fail closed', async () => {
  {
    const { lifecycle, setNow } = fixture();
    const session = await lifecycle.create();

    setNow(
      session.createdAt +
      DEFAULT_DEMO_SESSION_POLICY.idleTimeoutMs
    );

    assert.equal(
      await lifecycle.resolve(session.sessionId),
      null
    );
  }

  {
    const { lifecycle, setNow } = fixture();
    const session = await lifecycle.create();

    setNow(
      session.createdAt +
      DEFAULT_DEMO_SESSION_POLICY.absoluteLifetimeMs
    );

    assert.equal(
      await lifecycle.resolve(session.sessionId),
      null
    );
  }
});

test('invalid generators fail closed', async () => {
  const lifecycle = new DemoSessionLifecycle({
    store: new InMemoryDemoSessionStore(),
    sessionIdGenerator: () => 'bad',
    csrfTokenGenerator: () => fixed(101)
  });

  await assert.rejects(
    () => lifecycle.create(),
    DemoSessionLifecycleError
  );
});
