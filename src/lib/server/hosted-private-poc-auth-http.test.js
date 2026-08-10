import assert from 'node:assert/strict';
import test from 'node:test';
import {
  HOSTED_PRIVATE_POC_AUTH_HTTP_OUTCOMES,
  beginHostedPrivatePocLogin,
  completeHostedPrivatePocCallback
} from './hosted-private-poc-auth-http.js';
import {
  createHostedPrivatePocRuntime
} from './hosted-private-poc-runtime.js';
import {
  HOSTED_SESSION_COOKIE_NAME,
  HOSTED_SESSION_COOKIE_OPTIONS
} from './hosted-session-cookie.js';
import {
  HOSTED_ROUTE_GATE_OUTCOMES
} from './hosted-route-gate.js';

const OAUTH_STATE =
  Buffer.alloc(32, 81).toString('base64url');
const PKCE =
  Buffer.alloc(32, 82).toString('base64url');
const SESSION_ID =
  Buffer.alloc(32, 83).toString('base64url');
const CSRF =
  Buffer.alloc(32, 84).toString('base64url');

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
      'CLIENT_SECRET_AUTH_HTTP_SENTINEL',
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

  return () => values[index++];
}

/**
 * @param {number} id
 */
function runtimeForUser(id) {
  const runtime = createHostedPrivatePocRuntime(
    'hosted',
    environment(),
    {
      clock: () => 100_000,
      oauthSecretGenerator:
        sequence([OAUTH_STATE, PKCE]),
      sessionIdGenerator:
        () => SESSION_ID,
      csrfTokenGenerator:
        () => CSRF,
      transport: {
        async exchangeAuthorizationCode() {
          return 'ACCESS_TOKEN_AUTH_HTTP_SENTINEL';
        },

        async fetchAuthenticatedUser() {
          return {
            id,
            login: 'operator'
          };
        }
      }
    }
  );

  assert.ok(runtime);
  return runtime;
}

/**
 * @param {{ failSet?: boolean }} [options]
 */
function cookieCapture({
  failSet = false
} = {}) {
  const calls = /** @type {any[]} */ ([]);

  return {
    calls,
    cookies: {
      /**
       * @param {string} name
       * @param {string} value
       * @param {any} options
       */
      set(name, value, options) {
        calls.push({
          method: 'set',
          name,
          value,
          options
        });

        if (failSet) {
          throw new Error(
            'COOKIE_FAILURE_SECRET_SENTINEL'
          );
        }
      }
    }
  };
}

test('login is unavailable outside active Hosted private PoC mode', async () => {
  for (
    const runtimeMode of
    /** @type {Array<'visitor' | 'local' | 'invalid'>} */ ([
      'visitor',
      'local',
      'invalid'
    ])
  ) {
    assert.deepEqual(
      await beginHostedPrivatePocLogin({
        runtimeMode,
        runtimeResolver() {
          throw new Error('must not run');
        }
      }),
      {
        outcome:
          HOSTED_PRIVATE_POC_AUTH_HTTP_OUTCOMES
            .NOT_FOUND,
        location: null
      }
    );
  }

  assert.deepEqual(
    await beginHostedPrivatePocLogin({
      runtimeMode: 'hosted',
      runtimeResolver: () => null
    }),
    {
      outcome:
        HOSTED_PRIVATE_POC_AUTH_HTTP_OUTCOMES
          .NOT_FOUND,
      location: null
    }
  );
});

test('login begins provider-owned OAuth redirect with canonical return target', async () => {
  const runtime = runtimeForUser(123);

  const response =
    await beginHostedPrivatePocLogin({
      runtimeMode: 'hosted',
      returnTo: '/studio',
      runtimeResolver: () => runtime
    });

  assert.equal(
    response.outcome,
    HOSTED_PRIVATE_POC_AUTH_HTTP_OUTCOMES.REDIRECT
  );

  assert.ok(
    typeof response.location === 'string'
  );

  const location =
    new URL(response.location);

  assert.equal(
    location.origin,
    'https://github.com'
  );
  assert.equal(
    location.pathname,
    '/login/oauth/authorize'
  );
  assert.equal(
    location.searchParams.get('state'),
    OAUTH_STATE
  );
});

test('login rejects external or malformed return targets without leaking input', async () => {
  const external =
    'https://attacker.example/SECRET_RETURN_SENTINEL';

  const response =
    await beginHostedPrivatePocLogin({
      runtimeMode: 'hosted',
      returnTo: external,
      runtimeResolver:
        () => runtimeForUser(123)
    });

  assert.deepEqual(
    response,
    {
      outcome:
        HOSTED_PRIVATE_POC_AUTH_HTTP_OUTCOMES
          .AUTHENTICATION_FAILED,
      location: null
    }
  );

  assert.equal(
    JSON.stringify(response).includes(external),
    false
  );
});

test('authorized callback creates opaque cookie and redirects only to stored return target', async () => {
  const runtime = runtimeForUser(123);

  await beginHostedPrivatePocLogin({
    runtimeMode: 'hosted',
    returnTo: '/studio',
    runtimeResolver: () => runtime
  });

  const capture = cookieCapture();

  const response =
    await completeHostedPrivatePocCallback({
      runtimeMode: 'hosted',
      callback: {
        state: OAUTH_STATE,
        code: 'oauth-code'
      },
      cookies: capture.cookies,
      runtimeResolver: () => runtime
    });

  assert.deepEqual(
    response,
    {
      outcome:
        HOSTED_PRIVATE_POC_AUTH_HTTP_OUTCOMES
          .REDIRECT,
      location: '/studio'
    }
  );

  assert.deepEqual(
    capture.calls,
    [{
      method: 'set',
      name: HOSTED_SESSION_COOKIE_NAME,
      value: SESSION_ID,
      options:
        HOSTED_SESSION_COOKIE_OPTIONS
    }]
  );
});

test('authenticated but unauthorized callback creates no browser or session authority', async () => {
  const runtime = runtimeForUser(999);

  await beginHostedPrivatePocLogin({
    runtimeMode: 'hosted',
    runtimeResolver: () => runtime
  });

  const capture = cookieCapture();

  const response =
    await completeHostedPrivatePocCallback({
      runtimeMode: 'hosted',
      callback: {
        state: OAUTH_STATE,
        code: 'oauth-code'
      },
      cookies: capture.cookies,
      runtimeResolver: () => runtime
    });

  assert.deepEqual(
    response,
    {
      outcome:
        HOSTED_PRIVATE_POC_AUTH_HTTP_OUTCOMES
          .FORBIDDEN,
      location: null
    }
  );

  assert.deepEqual(capture.calls, []);

  assert.equal(
    (await runtime.evaluateRequest(
      'hosted',
      SESSION_ID
    )).outcome,
    HOSTED_ROUTE_GATE_OUTCOMES.AUTHENTICATE
  );
});

test('invalid callback is generic and never sets browser state', async () => {
  const runtime = runtimeForUser(123);

  const capture = cookieCapture();

  const response =
    await completeHostedPrivatePocCallback({
      runtimeMode: 'hosted',
      callback: {
        state:
          'OAUTH_STATE_SECRET_SENTINEL',
        code:
          'OAUTH_CODE_SECRET_SENTINEL'
      },
      cookies: capture.cookies,
      runtimeResolver: () => runtime
    });

  assert.deepEqual(
    response,
    {
      outcome:
        HOSTED_PRIVATE_POC_AUTH_HTTP_OUTCOMES
          .AUTHENTICATION_FAILED,
      location: null
    }
  );

  assert.deepEqual(capture.calls, []);

  const serialized = JSON.stringify(response);

  assert.equal(
    serialized.includes(
      'OAUTH_STATE_SECRET_SENTINEL'
    ),
    false
  );
  assert.equal(
    serialized.includes(
      'OAUTH_CODE_SECRET_SENTINEL'
    ),
    false
  );
});

test('cookie transport failure invalidates the newly-created session before returning failure', async () => {
  const runtime = runtimeForUser(123);

  await beginHostedPrivatePocLogin({
    runtimeMode: 'hosted',
    runtimeResolver: () => runtime
  });

  const capture =
    cookieCapture({ failSet: true });

  const response =
    await completeHostedPrivatePocCallback({
      runtimeMode: 'hosted',
      callback: {
        state: OAUTH_STATE,
        code: 'oauth-code'
      },
      cookies: capture.cookies,
      runtimeResolver: () => runtime
    });

  assert.equal(
    response.outcome,
    HOSTED_PRIVATE_POC_AUTH_HTTP_OUTCOMES
      .AUTHENTICATION_FAILED
  );

  assert.equal(
    (await runtime.evaluateRequest(
      'hosted',
      SESSION_ID
    )).outcome,
    HOSTED_ROUTE_GATE_OUTCOMES.AUTHENTICATE
  );

  assert.equal(
    JSON.stringify(response).includes(
      'COOKIE_FAILURE_SECRET_SENTINEL'
    ),
    false
  );
});
