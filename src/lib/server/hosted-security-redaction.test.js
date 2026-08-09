import assert from 'node:assert/strict';
import test from 'node:test';
import {
  parseHostedAuthorizationConfig
} from './hosted-authorization.js';
import {
  getTrustedHostedRequestCsrfToken
} from './hosted-request-context.js';
import {
  HOSTED_ROUTE_GATE_OUTCOMES,
  HostedRouteGate
} from './hosted-route-gate.js';
import {
  HOSTED_SECURITY_EVENT_TYPES,
  HostedSecurityEventRecorder,
  serializeHostedSecurityEvent
} from './hosted-security-events.js';

const SENTINELS = Object.freeze({
  clientSecret: 'CLIENT_SECRET_SENTINEL_DO_NOT_LOG',
  accessToken: 'ACCESS_TOKEN_SENTINEL_DO_NOT_LOG',
  authorizationCode: 'AUTH_CODE_SENTINEL_DO_NOT_LOG',
  oauthState: 'OAUTH_STATE_SENTINEL_DO_NOT_LOG',
  pkceVerifier: 'PKCE_VERIFIER_SENTINEL_DO_NOT_LOG',
  providerBody: 'PROVIDER_BODY_SENTINEL_DO_NOT_LOG',
  sessionCookie: 'SESSION_COOKIE_SENTINEL_DO_NOT_LOG',
  sessionId:
    Buffer.alloc(32, 31).toString('base64url'),
  csrfToken:
    Buffer.alloc(32, 32).toString('base64url'),
  authorizationHeader:
    'AUTHORIZATION_HEADER_SENTINEL_DO_NOT_LOG',
  repositoryCredential:
    'REPOSITORY_CREDENTIAL_SENTINEL_DO_NOT_LOG',
  environmentSecret:
    'ENVIRONMENT_SECRET_SENTINEL_DO_NOT_LOG'
});

function allSentinelValues() {
  return Object.values(SENTINELS);
}

test('operational sink sees only normalized allow-listed event fields even beside all secret classes', () => {
  const rawRequest = {
    headers: {
      authorization: SENTINELS.authorizationHeader,
      cookie: SENTINELS.sessionCookie,
      origin: 'https://attacker.example'
    },
    csrfToken: SENTINELS.csrfToken,
    oauth: {
      state: SENTINELS.oauthState,
      code: SENTINELS.authorizationCode,
      verifier: SENTINELS.pkceVerifier
    }
  };

  const providerContext = {
    clientSecret: SENTINELS.clientSecret,
    accessToken: SENTINELS.accessToken,
    rawResponse: {
      body: SENTINELS.providerBody
    }
  };

  const repositoryConfig = {
    credential: SENTINELS.repositoryCredential
  };

  const environment = {
    UNRELATED_SECRET: SENTINELS.environmentSecret
  };

  const sessionContext = {
    cookie: SENTINELS.sessionCookie,
    sessionId: SENTINELS.sessionId
  };

  /** @type {string[]} */
  const lines = [];

  const recorder = new HostedSecurityEventRecorder({
    clock: () => 444444,
    sink(event) {
      const line = serializeHostedSecurityEvent(event);

      lines.push(line);

      // These objects deliberately exist in the same operational scope.
      // The sink contract still receives only the normalized event.
      assert.ok(rawRequest);
      assert.ok(providerContext);
      assert.ok(repositoryConfig);
      assert.ok(environment);
      assert.ok(sessionContext);
    }
  });

  assert.equal(
    recorder.record(
      HOSTED_SECURITY_EVENT_TYPES.AUTHENTICATION_FAILED
    ),
    true
  );

  assert.deepEqual(lines, [
    '{"version":1,"type":"authentication-failed","occurredAt":444444}'
  ]);

  const output = lines.join('\n');

  for (const sentinel of allSentinelValues()) {
    assert.equal(
      output.includes(sentinel),
      false,
      `security output leaked sentinel: ${sentinel}`
    );
  }
});

test('raw request provider repository environment and error objects cannot enter the event contract', () => {
  /** @type {any[]} */
  /** @type {any[]} */
  /** @type {any[]} */
  const events = [];

  const recorder = new HostedSecurityEventRecorder({
    clock: () => 444444,
    sink(event) {
      events.push(event);
    }
  });

  const forbiddenInputs = [
    {
      headers: {
        Authorization: SENTINELS.authorizationHeader,
        Cookie: SENTINELS.sessionCookie
      }
    },
    {
      clientSecret: SENTINELS.clientSecret,
      accessToken: SENTINELS.accessToken,
      state: SENTINELS.oauthState,
      code: SENTINELS.authorizationCode,
      verifier: SENTINELS.pkceVerifier
    },
    {
      rawProviderResponse: SENTINELS.providerBody
    },
    {
      repositoryCredential:
        SENTINELS.repositoryCredential
    },
    {
      environmentSecret:
        SENTINELS.environmentSecret
    },
    new Error(
      `${SENTINELS.accessToken} ${SENTINELS.providerBody}`
    )
  ];

  for (const forbiddenInput of forbiddenInputs) {
    assert.equal(
      recorder.record(
        HOSTED_SECURITY_EVENT_TYPES.AUTHENTICATION_FAILED,
        forbiddenInput
      ),
      false
    );
  }

  assert.deepEqual(events, []);
});

test('trusted Hosted request context remains telemetry-free and secret-minimal', () => {
  const session = {
    sessionId: SENTINELS.sessionId,
    identity: {
      provider: 'github',
      subject: '123'
    },
    authorization: 'authorized',
    csrfToken: SENTINELS.csrfToken,
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

  /** @type {any[]} */
  const events = [];

  const gate = new HostedRouteGate({
    sessionLifecycle: lifecycle,
    authorizationConfig:
      parseHostedAuthorizationConfig({
        ATELIER_STUDIO_AUTHORIZED_GITHUB_IDS: '123'
      }),
    securityEventRecorder:
      new HostedSecurityEventRecorder({
        clock: () => 444444,
        sink(event) {
          events.push(event);
        }
      })
  });

  const result = gate.evaluate(
    'hosted',
    SENTINELS.sessionCookie
  );

  assert.equal(
    result.outcome,
    HOSTED_ROUTE_GATE_OUTCOMES.ALLOWED
  );
  assert.ok(result.context);

  assert.deepEqual(
    Object.keys(result.context),
    ['runtime', 'identity', 'session']
  );

  assert.deepEqual(
    Object.keys(result.context.session),
    [
      'createdAt',
      'rotatedAt',
      'expiresAt',
      'lastSeenAt'
    ]
  );

  assert.equal(
    getTrustedHostedRequestCsrfToken(
      result.context
    ),
    SENTINELS.csrfToken
  );

  const serializedContext =
    JSON.stringify(result.context);

  assert.equal(
    serializedContext.includes(SENTINELS.sessionId),
    false
  );
  assert.equal(
    serializedContext.includes(SENTINELS.sessionCookie),
    false
  );
  assert.equal(
    serializedContext.includes(SENTINELS.csrfToken),
    false
  );

  for (const forbiddenField of [
    'securityEvent',
    'securityEvents',
    'telemetry',
    'logger',
    'recorder'
  ]) {
    assert.equal(
      forbiddenField in result.context,
      false
    );
  }

  assert.deepEqual(events, []);
});

test('serialized event key set is closed and cannot absorb secret-bearing properties', () => {
  /** @type {any[]} */
  const captured = [];

  const recorder = new HostedSecurityEventRecorder({
    clock: () => 444444,
    sink(event) {
      captured.push(event);
    }
  });

  assert.equal(
    recorder.record(
      HOSTED_SECURITY_EVENT_TYPES.CSRF_REJECTED
    ),
    true
  );

  assert.equal(captured.length, 1);

  assert.deepEqual(
    Object.keys(captured[0]),
    ['version', 'type', 'occurredAt']
  );

  assert.equal(Object.isFrozen(captured[0]), true);

  const serialized =
    serializeHostedSecurityEvent(captured[0]);

  for (const sentinel of allSentinelValues()) {
    assert.equal(
      serialized.includes(sentinel),
      false
    );
  }
});
