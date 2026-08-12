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
import {
  HOSTED_SECURITY_EVENT_REASONS,
  HOSTED_SECURITY_EVENT_TYPES,
  HostedSecurityEventRecorder,
  serializeHostedSecurityEvent
} from './hosted-security-events.js';

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

test('visitor Demo and invalid runtimes fail closed before session resolution', async () => {
  for (const mode of ['visitor', 'demo', 'invalid', 'unknown']) {
    const sessions = lifecycle();
    const gate = new HostedRouteGate({
      sessionLifecycle: sessions,
      authorizationConfig: config()
    });

    const result = await gate.evaluate(mode, 'browser-value');

    assert.equal(result.outcome, HOSTED_ROUTE_GATE_OUTCOMES.NOT_FOUND);
    assert.equal(result.context, null);
    assert.deepEqual(sessions.calls, []);
  }
});

test('Local Studio preserves its separate existing behavior', async () => {
  const sessions = lifecycle();
  const gate = new HostedRouteGate({
    sessionLifecycle: sessions,
    authorizationConfig: config()
  });

  const result = await gate.evaluate('local');

  assert.equal(result.outcome, HOSTED_ROUTE_GATE_OUTCOMES.LOCAL);
  assert.equal(result.context, null);
  assert.deepEqual(sessions.calls, []);
});

test('missing or invalid Hosted session requires authentication', async () => {
  const sessions = lifecycle({
    resolved: null
  });

  const gate = new HostedRouteGate({
    sessionLifecycle: sessions,
    authorizationConfig: config()
  });

  const result = await gate.evaluate('hosted', undefined);

  assert.equal(result.outcome, HOSTED_ROUTE_GATE_OUTCOMES.AUTHENTICATE);
  assert.equal(result.context, null);
  assert.deepEqual(sessions.calls, [
    ['resolve', undefined]
  ]);
});

test('current allow-list denial forbids without recording admitted activity', async () => {
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

  const result = await gate.evaluate(
    'hosted',
    'opaque-session-credential'
  );

  assert.equal(result.outcome, HOSTED_ROUTE_GATE_OUTCOMES.FORBIDDEN);
  assert.equal(result.context, null);
  assert.deepEqual(sessions.calls, [
    ['resolve', 'opaque-session-credential']
  ]);
});

test('allowed active session is touched and produces trusted minimal context', async () => {
  const sessions = lifecycle();

  const gate = new HostedRouteGate({
    sessionLifecycle: sessions,
    authorizationConfig: config()
  });

  const result = await gate.evaluate(
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

test('trusted context is not issued before awaited lifecycle activity completes', async () => {
  const current = session();
  /** @type {() => void} */
  let releaseTouch = () => {
    throw new Error('touch resolver not assigned');
  };
  const gate = new HostedRouteGate({
    sessionLifecycle: {
      resolve() {
        return { session: current, rotationDue: false };
      },
      touch() {
        return new Promise((resolve) => {
          releaseTouch = () => resolve({
            session: { ...current, lastSeenAt: 150 },
            rotationDue: false
          });
        });
      },
      rotate() {
        throw new Error('rotation not expected');
      }
    },
    authorizationConfig: config()
  });

  let settled = false;
  const decisionPromise = gate.evaluate(
    'hosted',
    'opaque-session-credential'
  ).then((decision) => {
    settled = true;
    return decision;
  });

  await Promise.resolve();
  assert.equal(settled, false);

  releaseTouch();
  const decision = await decisionPromise;
  assert.equal(decision.outcome, HOSTED_ROUTE_GATE_OUTCOMES.ALLOWED);
  assert.ok(isTrustedHostedRequestContext(decision.context));
});

test('malformed session CSRF authority fails closed before admitted activity', async () => {
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

  const result = await gate.evaluate(
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

test('touch cannot substitute CSRF authority after authorization', async () => {
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

  const result = await gate.evaluate(
    'hosted',
    'opaque-session-credential'
  );

  assert.equal(
    result.outcome,
    HOSTED_ROUTE_GATE_OUTCOMES.AUTHENTICATE
  );
  assert.equal(result.context, null);
});

test('rotation cannot substitute CSRF authority after authorization', async () => {
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

  const result = await gate.evaluate(
    'hosted',
    'opaque-session-credential'
  );

  assert.equal(
    result.outcome,
    HOSTED_ROUTE_GATE_OUTCOMES.AUTHENTICATE
  );
  assert.equal(result.context, null);
});

test('touch cannot substitute a different identity after authorization', async () => {
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

  const result = await gate.evaluate(
    'hosted',
    'opaque-session-credential'
  );

  assert.equal(result.outcome, HOSTED_ROUTE_GATE_OUTCOMES.AUTHENTICATE);
  assert.equal(result.context, null);
});

test('rotation cannot substitute a different identity after authorization', async () => {
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

  const result = await gate.evaluate(
    'hosted',
    'opaque-session-credential'
  );

  assert.equal(result.outcome, HOSTED_ROUTE_GATE_OUTCOMES.AUTHENTICATE);
  assert.equal(result.context, null);
});

test('session disappearing before admitted activity fails closed', async () => {
  const sessions = lifecycle({
    touched: null
  });

  const gate = new HostedRouteGate({
    sessionLifecycle: sessions,
    authorizationConfig: config()
  });

  const result = await gate.evaluate(
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

test('due rotation is lifecycle-owned and surfaced for future cookie transport', async () => {
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

  const result = await gate.evaluate(
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

test('failed periodic rotation fails closed instead of pretending browser rotation', async () => {
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

  const result = await gate.evaluate(
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

  for (const mode of ['visitor', 'local', 'demo', 'invalid', 'unknown']) {
    assert.equal(
      isHostedAuthenticationRouteEligible(mode),
      false
    );
  }
});


function routeSecurityEventCapture() {
  /** @type {any[]} */
  const events = [];

  return {
    events,
    recorder: new HostedSecurityEventRecorder({
      clock: () => 888888,
      sink(event) {
        events.push(event);
      }
    })
  };
}

test('missing Hosted session stays quiet but presented invalid credential is recorded safely', async () => {
  {
    const capture = routeSecurityEventCapture();
    const sessions = lifecycle({ resolved: null });
    const gate = new HostedRouteGate({
      sessionLifecycle: sessions,
      authorizationConfig: config(),
      securityEventRecorder: capture.recorder
    });

    const result = await gate.evaluate('hosted', undefined);

    assert.equal(
      result.outcome,
      HOSTED_ROUTE_GATE_OUTCOMES.AUTHENTICATE
    );
    assert.deepEqual(capture.events, []);
  }

  {
    const credential =
      'SESSION_COOKIE_SENTINEL_DO_NOT_LOG';
    const capture = routeSecurityEventCapture();
    const sessions = lifecycle({ resolved: null });
    const gate = new HostedRouteGate({
      sessionLifecycle: sessions,
      authorizationConfig: config(),
      securityEventRecorder: capture.recorder
    });

    const result = await gate.evaluate(
      'hosted',
      credential
    );

    assert.equal(
      result.outcome,
      HOSTED_ROUTE_GATE_OUTCOMES.AUTHENTICATE
    );

    assert.deepEqual(capture.events, [{
      version: 1,
      type:
        HOSTED_SECURITY_EVENT_TYPES.SESSION_REJECTED,
      occurredAt: 888888,
      reason:
        HOSTED_SECURITY_EVENT_REASONS.SESSION_INVALID
    }]);

    assert.equal(
      serializeHostedSecurityEvent(
        capture.events[0]
      ).includes(credential),
      false
    );
  }
});

test('authorization denial emits one safe event without allow-list data', async () => {
  const allowListSecret = '123';
  const capture = routeSecurityEventCapture();
  const sessions = lifecycle({
    resolved: {
      session: session({ subject: '456' }),
      rotationDue: false
    }
  });

  const gate = new HostedRouteGate({
    sessionLifecycle: sessions,
    authorizationConfig: config(allowListSecret),
    securityEventRecorder: capture.recorder
  });

  const result = await gate.evaluate(
    'hosted',
    'SESSION_COOKIE_SENTINEL_DO_NOT_LOG'
  );

  assert.equal(
    result.outcome,
    HOSTED_ROUTE_GATE_OUTCOMES.FORBIDDEN
  );

  assert.deepEqual(capture.events, [{
    version: 1,
    type:
      HOSTED_SECURITY_EVENT_TYPES.AUTHORIZATION_REJECTED,
    occurredAt: 888888
  }]);

  const serialized =
    serializeHostedSecurityEvent(capture.events[0]);

  assert.equal(
    serialized.includes(
      'SESSION_COOKIE_SENTINEL_DO_NOT_LOG'
    ),
    false
  );

  assert.equal(serialized.includes('"123"'), false);
  assert.equal(serialized.includes('"456"'), false);
});

test('post-resolution session integrity failure emits one session rejection', async () => {
  const capture = routeSecurityEventCapture();

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
    authorizationConfig: config(),
    securityEventRecorder: capture.recorder
  });

  const result = await gate.evaluate(
    'hosted',
    'SESSION_COOKIE_SENTINEL_DO_NOT_LOG'
  );

  assert.equal(
    result.outcome,
    HOSTED_ROUTE_GATE_OUTCOMES.AUTHENTICATE
  );

  assert.equal(capture.events.length, 1);
  assert.equal(
    capture.events[0].type,
    HOSTED_SECURITY_EVENT_TYPES.SESSION_REJECTED
  );
});

test('allowed Local visitor and valid Hosted requests emit no rejection telemetry', async () => {
  for (const [mode, sessionId] of [
    ['local', undefined],
    ['visitor', 'SESSION_COOKIE_SENTINEL_DO_NOT_LOG'],
    ['hosted', 'SESSION_COOKIE_SENTINEL_DO_NOT_LOG']
  ]) {
    const capture = routeSecurityEventCapture();
    const gate = new HostedRouteGate({
      sessionLifecycle: lifecycle(),
      authorizationConfig: config(),
      securityEventRecorder: capture.recorder
    });

    await gate.evaluate(mode, sessionId);

    assert.deepEqual(capture.events, []);
  }
});

test('route security recorder failure cannot weaken or replace denial semantics', async () => {
  const sessions = lifecycle({ resolved: null });

  const gate = new HostedRouteGate({
    sessionLifecycle: sessions,
    authorizationConfig: config(),
    securityEventRecorder: {
      record() {
        throw new Error(
          'LOGGER_SECRET_SHOULD_NOT_ESCAPE'
        );
      }
    }
  });

  const result = await gate.evaluate(
    'hosted',
    'SESSION_COOKIE_SENTINEL_DO_NOT_LOG'
  );

  assert.equal(
    result.outcome,
    HOSTED_ROUTE_GATE_OUTCOMES.AUTHENTICATE
  );
});
