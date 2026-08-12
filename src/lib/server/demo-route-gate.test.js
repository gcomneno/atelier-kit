import assert from 'node:assert/strict';
import test from 'node:test';
import {
  DemoRouteGate,
  DEMO_ROUTE_GATE_OUTCOMES,
  getTrustedDemoRequestCsrfToken,
  isTrustedDemoRequestContext
} from './demo-route-gate.js';
import {
  DemoSessionLifecycle
} from './demo-session.js';
import {
  InMemoryDemoSessionStore
} from './demo-session-store.js';
import {
  isTrustedHostedRequestContext
} from './hosted-request-context.js';

/**
 * @param {number} byte
 */
function fixed(byte) {
  return Buffer.alloc(32, byte).toString('base64url');
}

function fixture() {
  let now = 1_000;
  let idIndex = 0;
  const ids = [fixed(1), fixed(2)];

  const lifecycle = new DemoSessionLifecycle({
    store: new InMemoryDemoSessionStore(),
    clock: () => now,
    sessionIdGenerator: () => ids[idIndex++],
    csrfTokenGenerator: () => fixed(101)
  });

  return {
    lifecycle,
    gate: new DemoRouteGate({
      sessionLifecycle: lifecycle
    }),
    /** @param {number} value */
    setNow(value) {
      now = value;
    }
  };
}

test('non-Demo runtimes are inert before touching session state', async () => {
  let called = false;

  const gate = new DemoRouteGate({
    sessionLifecycle: {
      async resolve() {
        called = true;
        throw new Error('must not resolve');
      },
      async touch() {
        called = true;
        throw new Error('must not touch');
      },
      async rotate() {
        called = true;
        throw new Error('must not rotate');
      }
    }
  });

  for (const mode of [
    'visitor',
    'local',
    'hosted',
    'invalid',
    'unknown'
  ]) {
    const result = await gate.evaluate(mode, fixed(1));

    assert.equal(
      result.outcome,
      DEMO_ROUTE_GATE_OUTCOMES.NOT_FOUND
    );
    assert.equal(result.context, null);
  }

  assert.equal(called, false);
});

test('missing Demo guest session requires session without trusted context', async () => {
  const { gate } = fixture();

  const result = await gate.evaluate(
    'demo',
    'not-a-session'
  );

  assert.equal(
    result.outcome,
    DEMO_ROUTE_GATE_OUTCOMES.SESSION_REQUIRED
  );
  assert.equal(result.context, null);
});

test('active Demo session mints a genuinely unforgeable identity-free context', async () => {
  const { lifecycle, gate } = fixture();
  const session = await lifecycle.create();

  const result = await gate.evaluate(
    'demo',
    session.sessionId
  );

  assert.equal(
    result.outcome,
    DEMO_ROUTE_GATE_OUTCOMES.ALLOWED
  );

  assert.ok(result.context);
  assert.equal(
    isTrustedDemoRequestContext(result.context),
    true
  );
  assert.equal(
    isTrustedHostedRequestContext(result.context),
    false
  );

  assert.deepEqual(
    Object.keys(result.context).sort(),
    ['runtime', 'session']
  );

  assert.equal(result.context.runtime, 'demo');
  assert.equal('identity' in result.context, false);
  assert.equal('csrfToken' in result.context, false);

  assert.equal(
    getTrustedDemoRequestCsrfToken(result.context),
    session.csrfToken
  );

  assert.equal(
    isTrustedDemoRequestContext({
      runtime: 'demo',
      session: result.context.session
    }),
    false
  );
});

test('due Demo rotation surfaces replacement credential before context issuance', async () => {
  const {
    lifecycle,
    gate,
    setNow
  } = fixture();

  const session = await lifecycle.create();

  setNow(session.createdAt + 5 * 60 * 1000);

  const result = await gate.evaluate(
    'demo',
    session.sessionId
  );

  assert.equal(
    result.outcome,
    DEMO_ROUTE_GATE_OUTCOMES.ALLOWED
  );
  assert.ok(result.sessionTransport);
  assert.notEqual(
    result.sessionTransport.replaceSessionId,
    session.sessionId
  );
  assert.deepEqual(
    Object.keys(result.sessionTransport),
    ['replaceSessionId']
  );
  assert.equal(
    'csrfToken' in result.sessionTransport,
    false
  );
  assert.equal(
    getTrustedDemoRequestCsrfToken(result.context),
    session.csrfToken
  );
});


test('Demo request-context facade exposes no direct issuance primitive', async () => {
  const module =
    await import('./demo-request-context.js');

  assert.deepEqual(
    Object.keys(module).sort(),
    [
      'DemoRequestContextTrustError',
      'getTrustedDemoRequestCsrfToken',
      'isTrustedDemoRequestContext',
      'requireTrustedDemoRequestContext'
    ]
  );

  for (const name of Object.keys(module)) {
    assert.equal(
      name.toLowerCase().includes('issue'),
      false
    );
    assert.equal(
      name.toLowerCase().includes('mint'),
      false
    );
    assert.equal(
      name.toLowerCase().includes('create'),
      false
    );
  }
});

test('Hosted-looking shapes cannot cross into Demo trust', () => {
  const forgedHostedShape = Object.freeze({
    runtime: 'hosted',
    identity: Object.freeze({
      provider: 'github',
      subject: '123'
    }),
    session: Object.freeze({
      createdAt: 1,
      rotatedAt: 1,
      expiresAt: 1000,
      lastSeenAt: 1
    })
  });

  assert.equal(
    isTrustedDemoRequestContext(forgedHostedShape),
    false
  );
});


test('touch cannot substitute Demo CSRF authority after resolution', async () => {
  const baseline = {
    sessionId: fixed(1),
    csrfToken: fixed(101),
    createdAt: 1,
    rotatedAt: 1,
    expiresAt: 1000,
    lastSeenAt: 1
  };

  const gate = new DemoRouteGate({
    sessionLifecycle: {
      async resolve() {
        return {
          session: baseline,
          rotationDue: false
        };
      },
      async touch() {
        return {
          session: {
            ...baseline,
            csrfToken: fixed(102)
          },
          rotationDue: false
        };
      },
      async rotate() {
        throw new Error('must not rotate');
      }
    }
  });

  const result = await gate.evaluate(
    'demo',
    baseline.sessionId
  );

  assert.equal(
    result.outcome,
    DEMO_ROUTE_GATE_OUTCOMES.SESSION_REQUIRED
  );
  assert.equal(result.context, null);
});

test('rotation cannot substitute Demo authority after resolution', async () => {
  const baseline = {
    sessionId: fixed(1),
    csrfToken: fixed(101),
    createdAt: 1,
    rotatedAt: 1,
    expiresAt: 1000,
    lastSeenAt: 1
  };

  const gate = new DemoRouteGate({
    sessionLifecycle: {
      async resolve() {
        return {
          session: baseline,
          rotationDue: true
        };
      },
      async touch() {
        return {
          session: {
            ...baseline,
            lastSeenAt: 2
          },
          rotationDue: true
        };
      },
      async rotate() {
        return {
          ...baseline,
          sessionId: fixed(2),
          csrfToken: fixed(102),
          rotatedAt: 2,
          lastSeenAt: 2
        };
      }
    }
  });

  const result = await gate.evaluate(
    'demo',
    baseline.sessionId
  );

  assert.equal(
    result.outcome,
    DEMO_ROUTE_GATE_OUTCOMES.SESSION_REQUIRED
  );
  assert.equal(result.context, null);
  assert.equal(result.sessionTransport, null);
});

test('Demo rotation transport exposes only the replacement lookup credential', async () => {
  const {
    lifecycle,
    gate,
    setNow
  } = fixture();

  const session = await lifecycle.create();
  setNow(session.createdAt + 5 * 60 * 1000);

  const result = await gate.evaluate(
    'demo',
    session.sessionId
  );

  assert.equal(
    result.outcome,
    DEMO_ROUTE_GATE_OUTCOMES.ALLOWED
  );
  assert.ok(result.sessionTransport);

  assert.deepEqual(
    Object.keys(result.sessionTransport),
    ['replaceSessionId']
  );

  assert.equal(
    isTrustedDemoRequestContext(result.context),
    true
  );

  assert.equal(
    getTrustedDemoRequestCsrfToken(result.context),
    session.csrfToken
  );
});
