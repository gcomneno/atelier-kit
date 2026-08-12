import assert from 'node:assert/strict';
import test from 'node:test';
import {
  parseHostedAuthorizationConfig
} from './hosted-authorization.js';
import {
  HOSTED_MUTATION_GUARD_OUTCOMES,
  HostedMutationGuard,
  HostedMutationGuardConfigurationError
} from './hosted-mutation-guard.js';
import {
  HOSTED_ROUTE_GATE_OUTCOMES,
  HostedRouteGate
} from './hosted-route-gate.js';
import {
  HOSTED_SECURITY_EVENT_TYPES,
  HostedSecurityEventRecorder,
  serializeHostedSecurityEvent
} from './hosted-security-events.js';

const CSRF_TOKEN =
  Buffer.alloc(32, 9).toString('base64url');

const WRONG_CSRF_TOKEN =
  Buffer.alloc(32, 10).toString('base64url');

const ENVIRONMENT = Object.freeze({
  ATELIER_STUDIO_CANONICAL_ORIGIN:
    'https://studio.example.com'
});

async function createGenuineContext() {
  const session = {
    sessionId: 'A'.repeat(43),
    identity: {
      provider: 'github',
      subject: '123'
    },
    authorization: 'authorized',
    csrfToken: CSRF_TOKEN,
    createdAt: 100,
    rotatedAt: 100,
    expiresAt: 1000,
    lastSeenAt: 100
  };

  const lifecycle = {
    resolve() {
      return {
        session,
        rotationDue: false
      };
    },
    touch() {
      return {
        session,
        rotationDue: false
      };
    },
    rotate() {
      throw new Error('rotation not expected');
    }
  };

  const gate = new HostedRouteGate({
    sessionLifecycle: lifecycle,
    authorizationConfig: parseHostedAuthorizationConfig({
      ATELIER_STUDIO_AUTHORIZED_GITHUB_IDS: '123'
    })
  });

  const result = await gate.evaluate(
    'hosted',
    'opaque-session-credential'
  );

  assert.equal(
    result.outcome,
    HOSTED_ROUTE_GATE_OUTCOMES.ALLOWED
  );
  assert.ok(result.context);

  return result.context;
}

const GENUINE_CONTEXT = await createGenuineContext();

function genuineContext() {
  return GENUINE_CONTEXT;
}

/**
 * @param {any} [securityEventRecorder]
 */
function guard(securityEventRecorder = undefined) {
  return new HostedMutationGuard({
    environment: ENVIRONMENT,
    ...(securityEventRecorder === undefined
      ? {}
      : { securityEventRecorder })
  });
}

function validRequest(overrides = {}) {
  return {
    runtimeMode: 'hosted',
    trustedContext: genuineContext(),
    host: 'studio.example.com',
    origin: 'https://studio.example.com',
    method: 'POST',
    csrfToken: CSRF_TOKEN,
    ...overrides
  };
}

test('invalid origin configuration fails closed at construction', () => {
  for (const environment of [
    undefined,
    null,
    {},
    {
      ATELIER_STUDIO_CANONICAL_ORIGIN:
        'http://studio.example.com'
    }
  ]) {
    assert.throws(
      () => new HostedMutationGuard({ environment }),
      HostedMutationGuardConfigurationError
    );
  }
});

test('visitor Local Demo and invalid runtimes never enter Hosted mutation authority', () => {
  const mutationGuard = guard();

  for (const runtimeMode of [
    'visitor',
    'local',
    'demo',
    'invalid',
    'unknown'
  ]) {
    assert.deepEqual(
      mutationGuard.evaluate(
        validRequest({ runtimeMode })
      ),
      {
        outcome:
          HOSTED_MUTATION_GUARD_OUTCOMES.NOT_FOUND
      }
    );
  }
});

test('Hosted mutation requires genuinely trusted request context', () => {
  const mutationGuard = guard();

  for (const trustedContext of [
    undefined,
    null,
    {},
    {
      runtime: 'hosted',
      identity: {
        provider: 'github',
        subject: '123'
      }
    }
  ]) {
    assert.deepEqual(
      mutationGuard.evaluate(
        validRequest({ trustedContext })
      ),
      {
        outcome:
          HOSTED_MUTATION_GUARD_OUTCOMES.FORBIDDEN
      }
    );
  }
});

test('Host must exactly match trusted canonical configuration', () => {
  const mutationGuard = guard();

  for (const host of [
    undefined,
    null,
    '',
    'example.com',
    'admin.studio.example.com',
    'studio.example.com:443',
    'STUDIO.EXAMPLE.COM'
  ]) {
    assert.deepEqual(
      mutationGuard.evaluate(validRequest({ host })),
      {
        outcome:
          HOSTED_MUTATION_GUARD_OUTCOMES.FORBIDDEN
      }
    );
  }
});

test('Origin must exactly match trusted canonical configuration', () => {
  const mutationGuard = guard();

  for (const origin of [
    undefined,
    null,
    '',
    'http://studio.example.com',
    'https://admin.studio.example.com',
    'https://studio.example.com/',
    'https://studio.example.com:443',
    'null'
  ]) {
    assert.deepEqual(
      mutationGuard.evaluate(validRequest({ origin })),
      {
        outcome:
          HOSTED_MUTATION_GUARD_OUTCOMES.FORBIDDEN
      }
    );
  }
});

test('safe and unsupported HTTP methods never become Hosted mutations', () => {
  const mutationGuard = guard();

  for (const method of [
    undefined,
    null,
    '',
    'GET',
    'HEAD',
    'OPTIONS',
    'TRACE',
    'CONNECT',
    'post'
  ]) {
    assert.deepEqual(
      mutationGuard.evaluate(validRequest({ method })),
      {
        outcome:
          HOSTED_MUTATION_GUARD_OUTCOMES.METHOD_NOT_ALLOWED
      }
    );
  }
});

test('all explicitly supported state-changing methods may reach CSRF validation', () => {
  const mutationGuard = guard();

  for (const method of [
    'POST',
    'PUT',
    'PATCH',
    'DELETE'
  ]) {
    assert.deepEqual(
      mutationGuard.evaluate(validRequest({ method })),
      {
        outcome:
          HOSTED_MUTATION_GUARD_OUTCOMES.ALLOWED
      }
    );
  }
});

test('missing malformed and incorrect CSRF tokens fail closed', () => {
  const mutationGuard = guard();

  for (const csrfToken of [
    undefined,
    null,
    '',
    'malformed',
    WRONG_CSRF_TOKEN
  ]) {
    assert.deepEqual(
      mutationGuard.evaluate(
        validRequest({ csrfToken })
      ),
      {
        outcome:
          HOSTED_MUTATION_GUARD_OUTCOMES.FORBIDDEN
      }
    );
  }
});

test('valid CSRF succeeds only with all prior security boundaries satisfied', () => {
  const mutationGuard = guard();

  assert.deepEqual(
    mutationGuard.evaluate(validRequest()),
    {
      outcome:
        HOSTED_MUTATION_GUARD_OUTCOMES.ALLOWED
    }
  );

  for (const override of [
    { trustedContext: {} },
    { host: 'evil.example.com' },
    { origin: 'https://evil.example.com' },
    { method: 'GET' },
    { csrfToken: WRONG_CSRF_TOKEN }
  ]) {
    assert.notEqual(
      mutationGuard.evaluate(
        validRequest(override)
      ).outcome,
      HOSTED_MUTATION_GUARD_OUTCOMES.ALLOWED
    );
  }
});

test('forged context cannot authorize even with the exact CSRF token', () => {
  const trusted = genuineContext();
  const forged = structuredClone(trusted);

  assert.deepEqual(
    guard().evaluate(
      validRequest({
        trustedContext: forged,
        csrfToken: CSRF_TOKEN
      })
    ),
    {
      outcome:
        HOSTED_MUTATION_GUARD_OUTCOMES.FORBIDDEN
    }
  );
});

test('future POST logout receives the same CSRF protection with no exemption', () => {
  const mutationGuard = guard();
  const context = genuineContext();

  const futureLogoutRequest = {
    runtimeMode: 'hosted',
    trustedContext: context,
    host: 'studio.example.com',
    origin: 'https://studio.example.com',
    method: 'POST'
  };

  assert.deepEqual(
    mutationGuard.evaluate(futureLogoutRequest),
    {
      outcome:
        HOSTED_MUTATION_GUARD_OUTCOMES.FORBIDDEN
    }
  );

  assert.deepEqual(
    mutationGuard.evaluate({
      ...futureLogoutRequest,
      csrfToken: CSRF_TOKEN
    }),
    {
      outcome:
        HOSTED_MUTATION_GUARD_OUTCOMES.ALLOWED
    }
  );
});

test('mutation guard outcomes never expose canonical origin or CSRF secrets', () => {
  const result = guard().evaluate(
    validRequest({
      csrfToken: WRONG_CSRF_TOKEN
    })
  );

  const serialized = JSON.stringify(result);

  assert.equal(serialized.includes(CSRF_TOKEN), false);
  assert.equal(serialized.includes(WRONG_CSRF_TOKEN), false);
  assert.equal(
    serialized.includes('studio.example.com'),
    false
  );
});

test('security checks preserve ADR 0009 precedence before method evaluation', () => {
  const mutationGuard = guard();

  assert.equal(
    mutationGuard.evaluate(
      validRequest({
        trustedContext: {},
        host: 'evil.example.com',
        origin: 'https://evil.example.com',
        method: 'GET',
        csrfToken: WRONG_CSRF_TOKEN
      })
    ).outcome,
    HOSTED_MUTATION_GUARD_OUTCOMES.FORBIDDEN
  );

  assert.equal(
    mutationGuard.evaluate(
      validRequest({
        host: 'evil.example.com',
        origin: 'https://evil.example.com',
        method: 'GET',
        csrfToken: WRONG_CSRF_TOKEN
      })
    ).outcome,
    HOSTED_MUTATION_GUARD_OUTCOMES.FORBIDDEN
  );

  assert.equal(
    mutationGuard.evaluate(
      validRequest({
        origin: 'https://evil.example.com',
        method: 'GET',
        csrfToken: WRONG_CSRF_TOKEN
      })
    ).outcome,
    HOSTED_MUTATION_GUARD_OUTCOMES.FORBIDDEN
  );
});

test('supported-method check precedes synchronizer CSRF validation', () => {
  const mutationGuard = guard();

  assert.equal(
    mutationGuard.evaluate(
      validRequest({
        method: 'GET',
        csrfToken: WRONG_CSRF_TOKEN
      })
    ).outcome,
    HOSTED_MUTATION_GUARD_OUTCOMES.METHOD_NOT_ALLOWED
  );

  assert.equal(
    mutationGuard.evaluate(
      validRequest({
        method: 'POST',
        csrfToken: WRONG_CSRF_TOKEN
      })
    ).outcome,
    HOSTED_MUTATION_GUARD_OUTCOMES.FORBIDDEN
  );
});


function mutationSecurityEventCapture() {
  /** @type {any[]} */
  const events = [];

  return {
    events,
    recorder: new HostedSecurityEventRecorder({
      clock: () => 666666,
      sink(event) {
        events.push(event);
      }
    })
  };
}

test('Host Origin and CSRF rejection telemetry follows ADR 0009 precedence exactly', () => {
  {
    const capture = mutationSecurityEventCapture();
    const mutationGuard = guard(capture.recorder);

    const result = mutationGuard.evaluate(
      validRequest({
        host: 'HOST_SENTINEL_DO_NOT_LOG',
        origin: 'https://ORIGIN_SENTINEL_DO_NOT_LOG',
        method: 'POST',
        csrfToken: WRONG_CSRF_TOKEN
      })
    );

    assert.equal(
      result.outcome,
      HOSTED_MUTATION_GUARD_OUTCOMES.FORBIDDEN
    );

    assert.deepEqual(capture.events, [{
      version: 1,
      type:
        HOSTED_SECURITY_EVENT_TYPES.HOST_REJECTED,
      occurredAt: 666666
    }]);
  }

  {
    const capture = mutationSecurityEventCapture();
    const mutationGuard = guard(capture.recorder);

    const result = mutationGuard.evaluate(
      validRequest({
        origin: 'https://ORIGIN_SENTINEL_DO_NOT_LOG',
        method: 'POST',
        csrfToken: WRONG_CSRF_TOKEN
      })
    );

    assert.equal(
      result.outcome,
      HOSTED_MUTATION_GUARD_OUTCOMES.FORBIDDEN
    );

    assert.deepEqual(capture.events, [{
      version: 1,
      type:
        HOSTED_SECURITY_EVENT_TYPES.ORIGIN_REJECTED,
      occurredAt: 666666
    }]);
  }

  {
    const capture = mutationSecurityEventCapture();
    const mutationGuard = guard(capture.recorder);

    const result = mutationGuard.evaluate(
      validRequest({
        method: 'GET',
        csrfToken: WRONG_CSRF_TOKEN
      })
    );

    assert.equal(
      result.outcome,
      HOSTED_MUTATION_GUARD_OUTCOMES.METHOD_NOT_ALLOWED
    );

    assert.deepEqual(capture.events, []);
  }

  {
    const capture = mutationSecurityEventCapture();
    const mutationGuard = guard(capture.recorder);

    const result = mutationGuard.evaluate(
      validRequest({
        method: 'POST',
        csrfToken: WRONG_CSRF_TOKEN
      })
    );

    assert.equal(
      result.outcome,
      HOSTED_MUTATION_GUARD_OUTCOMES.FORBIDDEN
    );

    assert.deepEqual(capture.events, [{
      version: 1,
      type:
        HOSTED_SECURITY_EVENT_TYPES.CSRF_REJECTED,
      occurredAt: 666666
    }]);
  }
});

test('untrusted context and non-Hosted runtimes never produce downstream Host Origin or CSRF events', () => {
  for (const request of [
    validRequest({
      runtimeMode: 'visitor',
      host: 'HOST_SENTINEL_DO_NOT_LOG',
      origin: 'https://ORIGIN_SENTINEL_DO_NOT_LOG',
      csrfToken: WRONG_CSRF_TOKEN
    }),
    validRequest({
      trustedContext: {},
      host: 'HOST_SENTINEL_DO_NOT_LOG',
      origin: 'https://ORIGIN_SENTINEL_DO_NOT_LOG',
      csrfToken: WRONG_CSRF_TOKEN
    })
  ]) {
    const capture = mutationSecurityEventCapture();
    const mutationGuard = guard(capture.recorder);

    mutationGuard.evaluate(request);

    assert.deepEqual(capture.events, []);
  }
});

test('mutation security events never contain presented or configured Host Origin or CSRF values', () => {
  const cases = [
    {
      override: {
        host: 'HOST_SENTINEL_DO_NOT_LOG'
      },
      type:
        HOSTED_SECURITY_EVENT_TYPES.HOST_REJECTED
    },
    {
      override: {
        origin:
          'https://ORIGIN_SENTINEL_DO_NOT_LOG'
      },
      type:
        HOSTED_SECURITY_EVENT_TYPES.ORIGIN_REJECTED
    },
    {
      override: {
        csrfToken: WRONG_CSRF_TOKEN
      },
      type:
        HOSTED_SECURITY_EVENT_TYPES.CSRF_REJECTED
    }
  ];

  for (const { override, type } of cases) {
    const capture = mutationSecurityEventCapture();
    const mutationGuard = guard(capture.recorder);

    mutationGuard.evaluate(
      validRequest(override)
    );

    assert.equal(capture.events.length, 1);
    assert.equal(capture.events[0].type, type);

    const serialized =
      serializeHostedSecurityEvent(capture.events[0]);

    for (const forbidden of [
      'HOST_SENTINEL_DO_NOT_LOG',
      'ORIGIN_SENTINEL_DO_NOT_LOG',
      'studio.example.com',
      'https://studio.example.com',
      CSRF_TOKEN,
      WRONG_CSRF_TOKEN
    ]) {
      assert.equal(
        serialized.includes(forbidden),
        false,
        `security event leaked: ${forbidden}`
      );
    }
  }
});

test('valid Hosted mutation emits no rejection telemetry', () => {
  const capture = mutationSecurityEventCapture();
  const mutationGuard = guard(capture.recorder);

  assert.deepEqual(
    mutationGuard.evaluate(validRequest()),
    {
      outcome:
        HOSTED_MUTATION_GUARD_OUTCOMES.ALLOWED
    }
  );

  assert.deepEqual(capture.events, []);
});

test('mutation security recorder failure cannot change denial or method semantics', () => {
  const mutationGuard = guard({
    record() {
      throw new Error(
        'LOGGER_SECRET_SHOULD_NOT_ESCAPE'
      );
    }
  });

  assert.doesNotThrow(() => {
    assert.equal(
      mutationGuard.evaluate(
        validRequest({
          host: 'HOST_SENTINEL_DO_NOT_LOG'
        })
      ).outcome,
      HOSTED_MUTATION_GUARD_OUTCOMES.FORBIDDEN
    );

    assert.equal(
      mutationGuard.evaluate(
        validRequest({
          method: 'GET',
          csrfToken: WRONG_CSRF_TOKEN
        })
      ).outcome,
      HOSTED_MUTATION_GUARD_OUTCOMES.METHOD_NOT_ALLOWED
    );
  });
});

test('mutation guard rejects an invalid security-event recorder at construction', () => {
  for (const securityEventRecorder of [
    null,
    {},
    [],
    {
      record: 'not-callable'
    }
  ]) {
    assert.throws(
      () => new HostedMutationGuard({
        environment: ENVIRONMENT,
        securityEventRecorder
      }),
      HostedMutationGuardConfigurationError
    );
  }
});
