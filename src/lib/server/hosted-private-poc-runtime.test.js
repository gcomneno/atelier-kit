import assert from 'node:assert/strict';
import test from 'node:test';
import {
  HOSTED_PRIVATE_POC_AUTH_RESULTS,
  HostedPrivatePocRuntimeConfigurationError,
  createHostedPrivatePocRuntime
} from './hosted-private-poc-runtime.js';
import {
  HOSTED_ROUTE_GATE_OUTCOMES,
  getTrustedHostedRequestCsrfToken,
  isTrustedHostedRequestContext
} from './hosted-route-gate.js';

const BASE_TIME = 50_000;

const OAUTH_STATE =
  Buffer.alloc(32, 11).toString('base64url');
const PKCE =
  Buffer.alloc(32, 12).toString('base64url');
const SESSION_1 =
  Buffer.alloc(32, 21).toString('base64url');
const SESSION_2 =
  Buffer.alloc(32, 22).toString('base64url');
const CSRF =
  Buffer.alloc(32, 31).toString('base64url');

function environment(overrides = {}) {
  return {
    ATELIER_STUDIO_MODE: 'hosted',
    ATELIER_STUDIO_PRIVATE_POC: '1',
    ATELIER_STUDIO_PRIVATE_POC_STATE_TOPOLOGY:
      'single-process',
    ATELIER_STUDIO_CANONICAL_ORIGIN:
      'https://studio.example.com',
    ATELIER_STUDIO_GITHUB_CLIENT_ID:
      'client-id',
    ATELIER_STUDIO_GITHUB_CLIENT_SECRET:
      'CLIENT_SECRET_RUNTIME_SENTINEL',
    ATELIER_STUDIO_GITHUB_CALLBACK_URL:
      'https://studio.example.com/auth/github/callback',
    ATELIER_STUDIO_AUTHORIZED_GITHUB_IDS:
      '123',
    ...overrides
  };
}

/**
 * @param {string[]} values
 */
function sequence(values) {
  let index = 0;

  return () => {
    if (index >= values.length) {
      throw new Error('sequence exhausted');
    }

    const value = values[index];
    index += 1;
    return value;
  };
}

/**
 * @param {{ id: number, login?: string }} user
 */
function transportForUser(user) {
  return {
    async exchangeAuthorizationCode() {
      return 'ACCESS_TOKEN_RUNTIME_SENTINEL';
    },

    async fetchAuthenticatedUser() {
      return user;
    }
  };
}

/**
 * @param {{ id: number, login?: string }} user
 * @param {{
 *   now?: () => number,
 *   sessionIds?: string[]
 * }} [options]
 */
function runtimeForUser(
  user,
  {
    now = () => BASE_TIME,
    sessionIds = [SESSION_1, SESSION_2]
  } = {}
) {
  const runtime =
    createHostedPrivatePocRuntime(
    'hosted',
    environment(),
    {
      transport: transportForUser(user),
      clock: now,
      oauthSecretGenerator:
        sequence([OAUTH_STATE, PKCE]),
      sessionIdGenerator:
        sequence(sessionIds),
      csrfTokenGenerator: () => CSRF
    }
  );

  assert.ok(runtime);
  return runtime;
}

test('inactive runtimes and non-enabled Hosted mode create no stateful runtime', () => {
  for (
    const mode of
    /** @type {Array<'visitor' | 'local' | 'invalid'>} */ ([
      'visitor',
      'local',
      'invalid'
    ])
  ) {
    assert.equal(
      createHostedPrivatePocRuntime(
        mode,
        {}
      ),
      null
    );
  }

  assert.equal(
    createHostedPrivatePocRuntime(
      'hosted',
      {
        ATELIER_STUDIO_MODE: 'hosted'
      }
    ),
    null
  );
});

test('runtime dependency container fails closed without secret diagnostics', () => {
  for (const invalid of [
    null,
    [],
    'invalid'
  ]) {
    let caught;

    try {
      createHostedPrivatePocRuntime(
        'hosted',
        environment(),
        /** @type {any} */ (invalid)
      );
    } catch (error) {
      caught = error;
    }

    assert.ok(
      caught instanceof
        HostedPrivatePocRuntimeConfigurationError
    );
    assert.equal(
      String(caught).includes(
        'CLIENT_SECRET_RUNTIME_SENTINEL'
      ),
      false
    );
  }
});

test('OAuth transaction state persists inside one private single-process runtime', async () => {
  const runtime =
    runtimeForUser({
      id: 123,
      login: 'operator'
    });

  assert.ok(runtime);

  const begun =
    runtime.beginAuthentication('/studio');

  const authorizationUrl =
    new URL(begun.authorizationUrl);

  assert.equal(
    authorizationUrl.searchParams.get('state'),
    OAUTH_STATE
  );

  const completed =
    await runtime.completeAuthentication({
      state: OAUTH_STATE,
      code: 'oauth-code'
    });

  assert.equal(
    completed.result,
    HOSTED_PRIVATE_POC_AUTH_RESULTS.AUTHORIZED
  );
  assert.equal(completed.returnTo, '/studio');
  assert.equal(completed.sessionId, SESSION_1);
  assert.equal(Object.isFrozen(completed), true);
});

test('authentication never implies authorization and denied identity creates no session authority', async () => {
  const runtime =
    runtimeForUser({
      id: 999,
      login: 'not-allowed'
    });

  runtime.beginAuthentication('/studio');

  const completed =
    await runtime.completeAuthentication({
      state: OAUTH_STATE,
      code: 'oauth-code'
    });

  assert.deepEqual(completed, {
    result:
      HOSTED_PRIVATE_POC_AUTH_RESULTS.FORBIDDEN,
    returnTo: '/studio',
    sessionId: null
  });

  const decision =
    runtime.evaluateRequest(
      'hosted',
      SESSION_1
    );

  assert.equal(
    decision.outcome,
    HOSTED_ROUTE_GATE_OUTCOMES.AUTHENTICATE
  );
  assert.equal(decision.context, null);
});

test('authorized fresh session is admitted only through the canonical route gate', async () => {
  const runtime =
    runtimeForUser({
      id: 123,
      login: 'operator'
    });

  runtime.beginAuthentication('/studio');

  const completed =
    await runtime.completeAuthentication({
      state: OAUTH_STATE,
      code: 'oauth-code'
    });

  const decision =
    runtime.evaluateRequest(
      'hosted',
      completed.sessionId
    );

  assert.equal(
    decision.outcome,
    HOSTED_ROUTE_GATE_OUTCOMES.ALLOWED
  );
  assert.equal(
    isTrustedHostedRequestContext(
      decision.context
    ),
    true
  );
  assert.ok(decision.context);

  assert.equal(
    decision.context.identity.subject,
    '123'
  );
  assert.equal(
    getTrustedHostedRequestCsrfToken(
      decision.context
    ),
    CSRF
  );

  const serialized =
    JSON.stringify(decision.context);

  for (const forbidden of [
    SESSION_1,
    CSRF,
    'operator',
    'ACCESS_TOKEN_RUNTIME_SENTINEL',
    'CLIENT_SECRET_RUNTIME_SENTINEL'
  ]) {
    assert.equal(
      serialized.includes(forbidden),
      false
    );
  }
});

test('request evaluation keeps visitor invalid and Local semantics delegated to the canonical gate', () => {
  const runtime =
    runtimeForUser({
      id: 123,
      login: 'operator'
    });

  assert.equal(
    runtime.evaluateRequest(
      'visitor',
      SESSION_1
    ).outcome,
    HOSTED_ROUTE_GATE_OUTCOMES.NOT_FOUND
  );

  assert.equal(
    runtime.evaluateRequest(
      'invalid',
      SESSION_1
    ).outcome,
    HOSTED_ROUTE_GATE_OUTCOMES.NOT_FOUND
  );

  assert.equal(
    runtime.evaluateRequest(
      'local',
      SESSION_1
    ).outcome,
    HOSTED_ROUTE_GATE_OUTCOMES.LOCAL
  );
});

test('periodic rotation is surfaced by the canonical gate and retires the old credential', async () => {
  let currentTime = /** @type {number} */ (BASE_TIME);

  const runtime =
    runtimeForUser(
      {
        id: 123,
        login: 'operator'
      },
      {
        now: () => currentTime
      }
    );

  runtime.beginAuthentication('/studio');

  const completed =
    await runtime.completeAuthentication({
      state: OAUTH_STATE,
      code: 'oauth-code'
    });

  currentTime += 45 * 60 * 1000;

  const rotatedDecision =
    runtime.evaluateRequest(
      'hosted',
      completed.sessionId
    );

  assert.equal(
    rotatedDecision.outcome,
    HOSTED_ROUTE_GATE_OUTCOMES.ALLOWED
  );
  assert.deepEqual(
    rotatedDecision.sessionTransport,
    {
      replaceSessionId: SESSION_2
    }
  );

  assert.equal(
    runtime.evaluateRequest(
      'hosted',
      SESSION_1
    ).outcome,
    HOSTED_ROUTE_GATE_OUTCOMES.AUTHENTICATE
  );

  assert.equal(
    runtime.evaluateRequest(
      'hosted',
      SESSION_2
    ).outcome,
    HOSTED_ROUTE_GATE_OUTCOMES.ALLOWED
  );
});

test('explicit invalidation is effective and idempotent through the runtime facade', async () => {
  const runtime =
    runtimeForUser({
      id: 123,
      login: 'operator'
    });

  runtime.beginAuthentication('/studio');

  const completed =
    await runtime.completeAuthentication({
      state: OAUTH_STATE,
      code: 'oauth-code'
    });

  assert.equal(
    runtime.invalidateSession(
      completed.sessionId
    ),
    true
  );

  assert.equal(
    runtime.invalidateSession(
      completed.sessionId
    ),
    false
  );

  assert.equal(
    runtime.evaluateRequest(
      'hosted',
      completed.sessionId
    ).outcome,
    HOSTED_ROUTE_GATE_OUTCOMES.AUTHENTICATE
  );
});

test('runtime public shape exposes no stores configuration or provider secrets', () => {
  const runtime =
    runtimeForUser({
      id: 123,
      login: 'operator'
    });

  assert.deepEqual(
    Object.keys(runtime),
    []
  );

  const serialized =
    JSON.stringify(runtime);

  for (const forbidden of [
    'CLIENT_SECRET_RUNTIME_SENTINEL',
    'ACCESS_TOKEN_RUNTIME_SENTINEL',
    'allowedGitHubSubjects',
    'transactionStore',
    'sessionStore',
    OAUTH_STATE,
    PKCE,
    SESSION_1,
    CSRF
  ]) {
    assert.equal(
      serialized.includes(forbidden),
      false
    );
  }
});
