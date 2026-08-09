import assert from 'node:assert/strict';
import test from 'node:test';
import {
  parseHostedAuthorizationConfig
} from './hosted-authorization.js';
import {
  isTrustedHostedRequestContext
} from './hosted-request-context.js';
import {
  HOSTED_ROUTE_GATE_OUTCOMES,
  HostedRouteGate,
  HostedRouteGateConfigurationError,
  isHostedAuthenticationRouteEligible
} from './hosted-route-gate.js';

function fixedCsrfToken(byte = 9) {
  return Buffer.alloc(32, byte).toString('base64url');
}

function session({
  subject = '123',
  sessionId = 'A'.repeat(43),
  csrfToken = fixedCsrfToken(),
  createdAt = 100,
  rotatedAt = 100,
  lastSeenAt = 100,
  expiresAt = 1000
} = {}) {
  return {
    sessionId,
    identity: {
      provider: 'github',
      subject
    },
    authorization: 'authorized',
    csrfToken,
    createdAt,
    rotatedAt,
    lastSeenAt,
    expiresAt
  };
}

/**
 * @param {{
 *   resolved?: any,
 *   touched?: any,
 *   rotated?: any
 * }} [options]
 */
function lifecycle({
  resolved = {
    session: session(),
    rotationDue: false
  },
  touched = {
    session: session({
      lastSeenAt: 150
    }),
    rotationDue: false
  },
  rotated = session({
    sessionId: 'B'.repeat(43),
    rotatedAt: 150,
    lastSeenAt: 150
  })
} = {}) {
  /** @type {Array<[string, unknown]>} */
  const calls = [];

  return {
    calls,
    /** @param {unknown} value */
    resolve(value) {
      calls.push(['resolve', value]);
      return resolved;
    },
    /** @param {unknown} value */
    touch(value) {
      calls.push(['touch', value]);
      return touched;
    },
    /** @param {unknown} value */
    rotate(value) {
      calls.push(['rotate', value]);
      return rotated;
    }
  };
}

function config(subjects = '123') {
  return parseHostedAuthorizationConfig({
    ATELIER_STUDIO_AUTHORIZED_GITHUB_IDS: subjects
  });
}

test('visitor and invalid runtime fail closed before session resolution', () => {
  for (const mode of ['visitor', 'invalid', 'unknown']) {
    const sessions = lifecycle();
    const gate = new HostedRouteGate({
      sessionLifecycle: sessions,
      authorizationConfig: config()
    });

    const result = gate.evaluate(mode, 'browser-value');

    assert.equal(result.outcome, HOSTED_ROUTE_GATE_OUTCOMES.NOT_FOUND);
    assert.equal(result.context, null);
    assert.deepEqual(sessions.calls, []);
  }
});

test('Local Studio preserves its separate existing behavior', () => {
  const sessions = lifecycle();
  const gate = new HostedRouteGate({
    sessionLifecycle: sessions,
    authorizationConfig: config()
  });

  const result = gate.evaluate('local');

  assert.equal(result.outcome, HOSTED_ROUTE_GATE_OUTCOMES.LOCAL);
  assert.equal(result.context, null);
  assert.deepEqual(sessions.calls, []);
});

test('missing or invalid Hosted session requires authentication', () => {
  const sessions = lifecycle({
    resolved: null
  });

  const gate = new HostedRouteGate({
    sessionLifecycle: sessions,
    authorizationConfig: config()
  });

  const result = gate.evaluate('hosted', undefined);

  assert.equal(result.outcome, HOSTED_ROUTE_GATE_OUTCOMES.AUTHENTICATE);
  assert.equal(result.context, null);
  assert.deepEqual(sessions.calls, [
    ['resolve', undefined]
  ]);
});

test('current allow-list denial forbids without recording admitted activity', () => {
  const sessions = lifecycle({
    resolved: {
      session: session({
        subject: '456'
      }),
      rotationDue: false
    }
  });

  const gate = new HostedRouteGate({
    sessionLifecycle: sessions,
    authorizationConfig: config('123')
  });

  const result = gate.evaluate(
    'hosted',
    'opaque-session-credential'
  );

  assert.equal(result.outcome, HOSTED_ROUTE_GATE_OUTCOMES.FORBIDDEN);
  assert.equal(result.context, null);
  assert.deepEqual(sessions.calls, [
    ['resolve', 'opaque-session-credential']
  ]);
});

test('allowed active session is touched and produces trusted minimal context', () => {
  const sessions = lifecycle();

  const gate = new HostedRouteGate({
    sessionLifecycle: sessions,
    authorizationConfig: config()
  });

  const result = gate.evaluate(
    'hosted',
    'opaque-session-credential'
  );

  assert.equal(result.outcome, HOSTED_ROUTE_GATE_OUTCOMES.ALLOWED);
  assert.ok(result.context);
  assert.equal(isTrustedHostedRequestContext(result.context), true);
  assert.deepEqual(result.context.identity, {
    provider: 'github',
    subject: '123'
  });
  assert.equal('sessionId' in result.context.session, false);
  assert.equal(result.sessionTransport, null);

  assert.deepEqual(sessions.calls, [
    ['resolve', 'opaque-session-credential'],
    ['touch', 'opaque-session-credential']
  ]);
});

test('malformed session CSRF authority fails closed before admitted activity', () => {
  const sessions = lifecycle({
    resolved: {
      session: session({
        csrfToken: 'malformed-csrf'
      }),
      rotationDue: false
    }
  });

  const gate = new HostedRouteGate({
    sessionLifecycle: sessions,
    authorizationConfig: config()
  });

  const result = gate.evaluate(
    'hosted',
    'opaque-session-credential'
  );

  assert.equal(
    result.outcome,
    HOSTED_ROUTE_GATE_OUTCOMES.AUTHENTICATE
  );
  assert.equal(result.context, null);
  assert.deepEqual(sessions.calls, [
    ['resolve', 'opaque-session-credential']
  ]);
});

test('touch cannot substitute CSRF authority after authorization', () => {
  const sessions = lifecycle({
    touched: {
      session: session({
        csrfToken: fixedCsrfToken(10),
        lastSeenAt: 150
      }),
      rotationDue: false
    }
  });

  const gate = new HostedRouteGate({
    sessionLifecycle: sessions,
    authorizationConfig: config()
  });

  const result = gate.evaluate(
    'hosted',
    'opaque-session-credential'
  );

  assert.equal(
    result.outcome,
    HOSTED_ROUTE_GATE_OUTCOMES.AUTHENTICATE
  );
  assert.equal(result.context, null);
});

test('rotation cannot substitute CSRF authority after authorization', () => {
  const sessions = lifecycle({
    touched: {
      session: session({
        lastSeenAt: 150
      }),
      rotationDue: true
    },
    rotated: session({
      sessionId: 'B'.repeat(43),
      csrfToken: fixedCsrfToken(10),
      rotatedAt: 150,
      lastSeenAt: 150
    })
  });

  const gate = new HostedRouteGate({
    sessionLifecycle: sessions,
    authorizationConfig: config()
  });

  const result = gate.evaluate(
    'hosted',
    'opaque-session-credential'
  );

  assert.equal(
    result.outcome,
    HOSTED_ROUTE_GATE_OUTCOMES.AUTHENTICATE
  );
  assert.equal(result.context, null);
});

test('touch cannot substitute a different identity after authorization', () => {
  const sessions = lifecycle({
    touched: {
      session: session({
        subject: '456',
        lastSeenAt: 150
      }),
      rotationDue: false
    }
  });

  const gate = new HostedRouteGate({
    sessionLifecycle: sessions,
    authorizationConfig: config('123')
  });

  const result = gate.evaluate(
    'hosted',
    'opaque-session-credential'
  );

  assert.equal(result.outcome, HOSTED_ROUTE_GATE_OUTCOMES.AUTHENTICATE);
  assert.equal(result.context, null);
});

test('rotation cannot substitute a different identity after authorization', () => {
  const sessions = lifecycle({
    touched: {
      session: session({
        lastSeenAt: 150
      }),
      rotationDue: true
    },
    rotated: session({
      subject: '456',
      sessionId: 'B'.repeat(43),
      rotatedAt: 150,
      lastSeenAt: 150
    })
  });

  const gate = new HostedRouteGate({
    sessionLifecycle: sessions,
    authorizationConfig: config('123')
  });

  const result = gate.evaluate(
    'hosted',
    'opaque-session-credential'
  );

  assert.equal(result.outcome, HOSTED_ROUTE_GATE_OUTCOMES.AUTHENTICATE);
  assert.equal(result.context, null);
});

test('session disappearing before admitted activity fails closed', () => {
  const sessions = lifecycle({
    touched: null
  });

  const gate = new HostedRouteGate({
    sessionLifecycle: sessions,
    authorizationConfig: config()
  });

  const result = gate.evaluate(
    'hosted',
    'opaque-session-credential'
  );

  assert.equal(result.outcome, HOSTED_ROUTE_GATE_OUTCOMES.AUTHENTICATE);
  assert.equal(result.context, null);
  assert.deepEqual(sessions.calls, [
    ['resolve', 'opaque-session-credential'],
    ['touch', 'opaque-session-credential']
  ]);
});

test('due rotation is lifecycle-owned and surfaced for future cookie transport', () => {
  const sessions = lifecycle({
    touched: {
      session: session({
        lastSeenAt: 150
      }),
      rotationDue: true
    }
  });

  const gate = new HostedRouteGate({
    sessionLifecycle: sessions,
    authorizationConfig: config()
  });

  const result = gate.evaluate(
    'hosted',
    'opaque-session-credential'
  );

  assert.equal(result.outcome, HOSTED_ROUTE_GATE_OUTCOMES.ALLOWED);
  assert.ok(result.context);
  assert.equal(isTrustedHostedRequestContext(result.context), true);
  assert.deepEqual(result.sessionTransport, {
    replaceSessionId: 'B'.repeat(43)
  });

  assert.equal(
    'sessionId' in result.context.session,
    false
  );

  assert.deepEqual(sessions.calls, [
    ['resolve', 'opaque-session-credential'],
    ['touch', 'opaque-session-credential'],
    ['rotate', 'opaque-session-credential']
  ]);
});

test('failed periodic rotation fails closed instead of pretending browser rotation', () => {
  const sessions = lifecycle({
    touched: {
      session: session({
        lastSeenAt: 150
      }),
      rotationDue: true
    },
    rotated: null
  });

  const gate = new HostedRouteGate({
    sessionLifecycle: sessions,
    authorizationConfig: config()
  });

  const result = gate.evaluate(
    'hosted',
    'opaque-session-credential'
  );

  assert.equal(result.outcome, HOSTED_ROUTE_GATE_OUTCOMES.AUTHENTICATE);
  assert.equal(result.context, null);
});

test('gate configuration fails closed before request evaluation', () => {
  assert.throws(
    () => new HostedRouteGate({
      sessionLifecycle: {},
      authorizationConfig: config()
    }),
    HostedRouteGateConfigurationError
  );

  assert.throws(
    () => new HostedRouteGate({
      sessionLifecycle: lifecycle(),
      authorizationConfig: {
        allowedGitHubSubjects: []
      }
    })
  );
});

test('authentication endpoints are eligible only in Hosted runtime', () => {
  assert.equal(
    isHostedAuthenticationRouteEligible('hosted'),
    true
  );

  for (const mode of ['visitor', 'local', 'invalid', 'unknown']) {
    assert.equal(
      isHostedAuthenticationRouteEligible(mode),
      false
    );
  }
});
