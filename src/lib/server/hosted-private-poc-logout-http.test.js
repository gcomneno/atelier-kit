import assert from 'node:assert/strict';
import test from 'node:test';
import {
  HOSTED_PRIVATE_POC_LOGOUT_OUTCOMES,
  performHostedPrivatePocLogout
} from './hosted-private-poc-logout-http.js';
import {
  HOSTED_PRIVATE_POC_AUTH_RESULTS,
  createHostedPrivatePocRuntime
} from './hosted-private-poc-runtime.js';
import {
  HOSTED_ROUTE_GATE_OUTCOMES,
  getTrustedHostedRequestCsrfToken
} from './hosted-route-gate.js';
import {
  HOSTED_SESSION_COOKIE_NAME,
  HOSTED_SESSION_COOKIE_OPTIONS
} from './hosted-session-cookie.js';

const BASE_TIME = 120_000;
const OAUTH_STATE =
  Buffer.alloc(32, 91).toString('base64url');
const PKCE =
  Buffer.alloc(32, 92).toString('base64url');
const SESSION_1 =
  Buffer.alloc(32, 93).toString('base64url');
const SESSION_2 =
  Buffer.alloc(32, 94).toString('base64url');
const CSRF =
  Buffer.alloc(32, 95).toString('base64url');

/**
 * @param {string[]} values
 */
function sequence(values) {
  let index = 0;
  return () => values[index++];
}

function environment() {
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
      'CLIENT_SECRET_LOGOUT_SENTINEL',
    ATELIER_STUDIO_GITHUB_CALLBACK_URL:
      'https://studio.example.com/auth/github/callback',
    ATELIER_STUDIO_AUTHORIZED_GITHUB_IDS:
      '123'
  };
}

/**
 * @param {() => number} clock
 */
function runtime(clock) {
  const current = createHostedPrivatePocRuntime(
    'hosted',
    environment(),
    {
      clock,
      oauthSecretGenerator:
        sequence([OAUTH_STATE, PKCE]),
      sessionIdGenerator:
        sequence([SESSION_1, SESSION_2]),
      csrfTokenGenerator: () => CSRF,
      transport: {
        async exchangeAuthorizationCode() {
          return 'ACCESS_TOKEN_LOGOUT_SENTINEL';
        },
        async fetchAuthenticatedUser() {
          return {
            id: 123,
            login: 'operator'
          };
        }
      }
    }
  );

  assert.ok(current);
  return current;
}

/**
 * @param {string | undefined} [initial]
 */
function cookieJar(initial = undefined) {
  let value = initial;
  const calls = /** @type {any[]} */ ([]);

  return {
    calls,
    current() {
      return value;
    },
    cookies: {
      /** @param {string} name */
      get(name) {
        calls.push({
          method: 'get',
          name
        });
        return value;
      },
      /**
       * @param {string} name
       * @param {string} next
       * @param {any} options
       */
      set(name, next, options) {
        calls.push({
          method: 'set',
          name,
          value: next,
          options
        });
        value = next;
      },
      /**
       * @param {string} name
       * @param {any} options
       */
      delete(name, options) {
        calls.push({
          method: 'delete',
          name,
          options
        });
        value = undefined;
      }
    }
  };
}

async function authenticatedFixture() {
  let now = BASE_TIME;
  const current = runtime(() => now);

  await current.beginAuthentication('/studio');

  const completed =
    await current.completeAuthentication({
      state: OAUTH_STATE,
      code: 'oauth-code'
    });

  assert.equal(
    completed.result,
    HOSTED_PRIVATE_POC_AUTH_RESULTS.AUTHORIZED
  );

  const decision =
    await current.evaluateRequest(
      'hosted',
      completed.sessionId
    );

  assert.equal(
    decision.outcome,
    HOSTED_ROUTE_GATE_OUTCOMES.ALLOWED
  );

  return {
    runtime: current,
    sessionId: completed.sessionId,
    context: decision.context,
    csrf:
      getTrustedHostedRequestCsrfToken(
        decision.context
      ),
    /**
     * @param {number} ms
     */
    advance(ms) {
      now += ms;
    }
  };
}

test('logout is unavailable outside active Hosted runtime', async () => {
  for (
    const runtimeMode of
    /** @type {Array<'visitor' | 'local' | 'demo' | 'invalid'>} */ ([
      'visitor',
      'local',
      'demo',
      'invalid'
    ])
  ) {
    assert.deepEqual(
      await performHostedPrivatePocLogout({
        runtimeMode,
        cookies: cookieJar().cookies,
        runtimeResolver() {
          throw new Error('must not run');
        }
      }),
      {
        outcome:
          HOSTED_PRIVATE_POC_LOGOUT_OUTCOMES
            .NOT_FOUND
      }
    );
  }

  assert.deepEqual(
    await performHostedPrivatePocLogout({
      runtimeMode: 'hosted',
      cookies: cookieJar().cookies,
      runtimeResolver: () => null
    }),
    {
      outcome:
        HOSTED_PRIVATE_POC_LOGOUT_OUTCOMES
          .NOT_FOUND
    }
  );
});

test('missing or invalid session cannot reach mutation authority', async () => {
  const current =
    runtime(() => BASE_TIME);

  for (const presented of [
    undefined,
    'MALFORMED_SESSION_LOGOUT_SENTINEL'
  ]) {
    const jar = cookieJar(presented);

    const result =
      await performHostedPrivatePocLogout({
        runtimeMode: 'hosted',
        cookies: jar.cookies,
        host: 'studio.example.com',
        origin:
          'https://studio.example.com',
        method: 'POST',
        csrfToken: CSRF,
        runtimeResolver: () => current
      });

    assert.equal(
      result.outcome,
      HOSTED_PRIVATE_POC_LOGOUT_OUTCOMES
        .FORBIDDEN
    );
  }
});

test('wrong Host Origin or CSRF never invalidates an active session', async () => {
  for (const mutation of [
    {
      host: 'attacker.example.com',
      origin: 'https://studio.example.com',
      method: 'POST',
      csrfToken: CSRF
    },
    {
      host: 'studio.example.com',
      origin: 'https://attacker.example.com',
      method: 'POST',
      csrfToken: CSRF
    },
    {
      host: 'studio.example.com',
      origin: 'https://studio.example.com',
      method: 'POST',
      csrfToken:
        Buffer.alloc(32, 96).toString('base64url')
    }
  ]) {
    const fixture =
      await authenticatedFixture();

    const jar =
      cookieJar(fixture.sessionId);

    const result =
      await performHostedPrivatePocLogout({
        runtimeMode: 'hosted',
        cookies: jar.cookies,
        ...mutation,
        runtimeResolver:
          () => fixture.runtime
      });

    assert.equal(
      result.outcome,
      HOSTED_PRIVATE_POC_LOGOUT_OUTCOMES
        .FORBIDDEN
    );

    assert.equal(
      (await fixture.runtime.evaluateRequest(
        'hosted',
        jar.current()
      )).outcome,
      HOSTED_ROUTE_GATE_OUTCOMES.ALLOWED
    );
  }
});

test('unsupported method never invalidates logout state', async () => {
  const fixture =
    await authenticatedFixture();
  const jar =
    cookieJar(fixture.sessionId);

  const result =
    await performHostedPrivatePocLogout({
      runtimeMode: 'hosted',
      cookies: jar.cookies,
      host: 'studio.example.com',
      origin: 'https://studio.example.com',
      method: 'GET',
      csrfToken: fixture.csrf,
      runtimeResolver:
        () => fixture.runtime
    });

  assert.equal(
    result.outcome,
    HOSTED_PRIVATE_POC_LOGOUT_OUTCOMES
      .METHOD_NOT_ALLOWED
  );

  assert.equal(
    (await fixture.runtime.evaluateRequest(
      'hosted',
      fixture.sessionId
    )).outcome,
    HOSTED_ROUTE_GATE_OUTCOMES.ALLOWED
  );
});

test('valid POST logout invalidates server authority and clears the cookie', async () => {
  const fixture =
    await authenticatedFixture();
  const jar =
    cookieJar(fixture.sessionId);

  const result =
    await performHostedPrivatePocLogout({
      runtimeMode: 'hosted',
      cookies: jar.cookies,
      host: 'studio.example.com',
      origin: 'https://studio.example.com',
      method: 'POST',
      csrfToken: fixture.csrf,
      runtimeResolver:
        () => fixture.runtime
    });

  assert.equal(
    result.outcome,
    HOSTED_PRIVATE_POC_LOGOUT_OUTCOMES
      .LOGGED_OUT
  );
  assert.equal(jar.current(), undefined);

  assert.equal(
    (await fixture.runtime.evaluateRequest(
      'hosted',
      fixture.sessionId
    )).outcome,
    HOSTED_ROUTE_GATE_OUTCOMES.AUTHENTICATE
  );

  assert.deepEqual(
    jar.calls.at(-1),
    {
      method: 'delete',
      name: HOSTED_SESSION_COOKIE_NAME,
      options:
        HOSTED_SESSION_COOKIE_OPTIONS
    }
  );
});

test('logout awaits invalidation before clearing browser transport', async () => {
  const fixture = await authenticatedFixture();
  /** @type {(value: boolean) => void} */
  let releaseInvalidation = () => {
    throw new Error('invalidation resolver not assigned');
  };
  let invalidationStarted = false;
  /** @type {() => void} */
  let notifyInvalidationStarted = () => {
    throw new Error('invalidation notifier not assigned');
  };
  const invalidationStartedPromise = new Promise((resolve) => {
    notifyInvalidationStarted = () => resolve(undefined);
  });
  let cookieCleared = false;
  const resultPromise = performHostedPrivatePocLogout({
    runtimeMode: 'hosted',
    cookies: {
      get() {
        return fixture.sessionId;
      },
      delete() {
        cookieCleared = true;
      }
    },
    host: 'studio.example.com',
    origin: 'https://studio.example.com',
    method: 'POST',
    csrfToken: fixture.csrf,
    runtimeResolver() {
      return /** @type {import('./hosted-private-poc-runtime.js').HostedPrivatePocRuntime} */ (/** @type {unknown} */ ({
        async evaluateRequest() {
          return {
            outcome: HOSTED_ROUTE_GATE_OUTCOMES.ALLOWED,
            context: fixture.context,
            sessionTransport: null
          };
        },
        evaluateMutation() {
          return {
            outcome: 'allowed'
          };
        },
        invalidateSession() {
          invalidationStarted = true;
          notifyInvalidationStarted();
          return new Promise((resolve) => {
            releaseInvalidation = (value) => resolve(value);
          });
        }
      }));
    }
  });

  let settled = false;
  resultPromise.then(() => {
    settled = true;
  });
  await invalidationStartedPromise;

  assert.equal(invalidationStarted, true);
  assert.equal(cookieCleared, false);
  assert.equal(settled, false);

  releaseInvalidation(true);
  assert.deepEqual(await resultPromise, {
    outcome: HOSTED_PRIVATE_POC_LOGOUT_OUTCOMES.LOGGED_OUT
  });
  assert.equal(cookieCleared, true);
});

test('rotation before rejected logout updates browser credential and preserves active authority', async () => {
  const fixture =
    await authenticatedFixture();

  fixture.advance(45 * 60 * 1000);

  const jar =
    cookieJar(fixture.sessionId);

  const result =
    await performHostedPrivatePocLogout({
      runtimeMode: 'hosted',
      cookies: jar.cookies,
      host: 'studio.example.com',
      origin: 'https://studio.example.com',
      method: 'POST',
      csrfToken:
        Buffer.alloc(32, 97).toString('base64url'),
      runtimeResolver:
        () => fixture.runtime
    });

  assert.equal(
    result.outcome,
    HOSTED_PRIVATE_POC_LOGOUT_OUTCOMES
      .FORBIDDEN
  );

  assert.equal(jar.current(), SESSION_2);

  assert.equal(
    (await fixture.runtime.evaluateRequest(
      'hosted',
      SESSION_1
    )).outcome,
    HOSTED_ROUTE_GATE_OUTCOMES.AUTHENTICATE
  );

  assert.equal(
    (await fixture.runtime.evaluateRequest(
      'hosted',
      SESSION_2
    )).outcome,
    HOSTED_ROUTE_GATE_OUTCOMES.ALLOWED
  );
});

test('successful rotated logout invalidates the replacement credential and clears transport', async () => {
  const fixture =
    await authenticatedFixture();

  fixture.advance(45 * 60 * 1000);

  const jar =
    cookieJar(fixture.sessionId);

  const result =
    await performHostedPrivatePocLogout({
      runtimeMode: 'hosted',
      cookies: jar.cookies,
      host: 'studio.example.com',
      origin: 'https://studio.example.com',
      method: 'POST',
      csrfToken: fixture.csrf,
      runtimeResolver:
        () => fixture.runtime
    });

  assert.equal(
    result.outcome,
    HOSTED_PRIVATE_POC_LOGOUT_OUTCOMES
      .LOGGED_OUT
  );

  assert.equal(jar.current(), undefined);

  for (const sessionId of [
    SESSION_1,
    SESSION_2
  ]) {
    assert.equal(
      (await fixture.runtime.evaluateRequest(
        'hosted',
        sessionId
      )).outcome,
      HOSTED_ROUTE_GATE_OUTCOMES.AUTHENTICATE
    );
  }
});

test('logout result and cookie metadata never disclose security secrets', async () => {
  const fixture =
    await authenticatedFixture();
  const jar =
    cookieJar(fixture.sessionId);

  const result =
    await performHostedPrivatePocLogout({
      runtimeMode: 'hosted',
      cookies: jar.cookies,
      host: 'wrong.example.com',
      origin: 'https://wrong.example.com',
      method: 'POST',
      csrfToken:
        'CSRF_LOGOUT_SECRET_SENTINEL',
      runtimeResolver:
        () => fixture.runtime
    });

  const serialized =
    JSON.stringify({
      result,
      calls: jar.calls.map((call) => ({
        method: call.method,
        name: call.name,
        options: call.options
      }))
    });

  for (const forbidden of [
    SESSION_1,
    SESSION_2,
    CSRF,
    'CSRF_LOGOUT_SECRET_SENTINEL',
    'CLIENT_SECRET_LOGOUT_SENTINEL',
    'ACCESS_TOKEN_LOGOUT_SENTINEL'
  ]) {
    assert.equal(
      serialized.includes(forbidden),
      false
    );
  }
});
