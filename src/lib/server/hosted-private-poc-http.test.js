import assert from 'node:assert/strict';
import test from 'node:test';
import {
  HOSTED_PRIVATE_POC_HTTP_OUTCOMES,
  HostedPrivatePocHttpError,
  applyHostedPrivatePocStudioAuthorizedRequest,
  createHostedPrivatePocRuntimeResolver,
  isHostedPrivatePocStudioAuthorizedRequest
} from './hosted-private-poc-http.js';
import {
  HOSTED_PRIVATE_POC_AUTH_RESULTS,
  createHostedPrivatePocRuntime
} from './hosted-private-poc-runtime.js';
import {
  HOSTED_SESSION_COOKIE_NAME,
  HOSTED_SESSION_COOKIE_OPTIONS
} from './hosted-session-cookie.js';
import {
  isTrustedHostedRequestContext
} from './hosted-route-gate.js';

const BASE_TIME = 90_000;
const OAUTH_STATE =
  Buffer.alloc(32, 51).toString('base64url');
const PKCE =
  Buffer.alloc(32, 52).toString('base64url');
const SESSION_1 =
  Buffer.alloc(32, 61).toString('base64url');
const SESSION_2 =
  Buffer.alloc(32, 62).toString('base64url');
const CSRF =
  Buffer.alloc(32, 71).toString('base64url');

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
      'CLIENT_SECRET_HTTP_SENTINEL',
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

    return values[index++];
  };
}

function transport() {
  return {
    async exchangeAuthorizationCode() {
      return 'ACCESS_TOKEN_HTTP_SENTINEL';
    },

    async fetchAuthenticatedUser() {
      return {
        id: 123,
        login: 'operator'
      };
    }
  };
}

/**
 * @param {() => number} [clock]
 */
function runtime(clock = () => BASE_TIME) {
  const current = createHostedPrivatePocRuntime(
    'hosted',
    environment(),
    {
      transport: transport(),
      clock,
      oauthSecretGenerator:
        sequence([OAUTH_STATE, PKCE]),
      sessionIdGenerator:
        sequence([SESSION_1, SESSION_2]),
      csrfTokenGenerator: () => CSRF
    }
  );

  assert.ok(current);
  return current;
}

/**
 * @param {string | undefined} [initial]
 */
function cookieCapture(initial = undefined) {
  const calls = /** @type {any[]} */ ([]);

  return {
    calls,
    cookies: {
      /** @param {string} name */
      get(name) {
        calls.push({
          method: 'get',
          name
        });
        return initial;
      },

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
      }
    }
  };
}

/**
 * @param {{
 *   pathname?: string,
 *   method?: string,
 *   sessionId?: string
 * }} [options]
 */
function eventFor({
  pathname = '/studio',
  method = 'GET',
  sessionId = undefined
} = {}) {
  const capture =
    cookieCapture(sessionId);

  return {
    capture,
    event: {
      url: new URL(
        `https://studio.example.com${pathname}`
      ),
      request: {
        method
      },
      cookies: capture.cookies,
      locals:
        /** @type {Record<string, unknown>} */ ({})
    }
  };
}

async function authenticatedRuntime(
  clock = () => BASE_TIME
) {
  const current = runtime(clock);

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

  return {
    runtime: current,
    sessionId: completed.sessionId
  };
}

test('only exact GET /studio belongs to the initial Hosted read-only HTTP seam', () => {
  assert.equal(
    isHostedPrivatePocStudioAuthorizedRequest(
      eventFor().event
    ),
    true
  );

  for (const candidate of [
    { pathname: '/studio/' },
    { pathname: '/studio/about' },
    { pathname: '/auth/github/login' },
    { pathname: '/studio', method: 'HEAD' },
    { pathname: '/studio', method: 'POST' }
  ]) {
    assert.equal(
      isHostedPrivatePocStudioAuthorizedRequest(
        eventFor(candidate).event
      ),
      false
    );
  }
});

test('visitor Local invalid and unrelated Hosted requests are inert before runtime or cookie state is touched', async () => {
  for (
    const runtimeMode of
    /** @type {Array<'visitor' | 'local' | 'demo' | 'invalid'>} */ ([
      'visitor',
      'local',
      'demo',
      'invalid'
    ])
  ) {
    const { event, capture } =
      eventFor({
        sessionId:
          'MALFORMED_SESSION_SENTINEL'
      });

    let resolverCalls = 0;

    const outcome =
      await applyHostedPrivatePocStudioAuthorizedRequest({
        event,
        runtimeMode,
        runtimeResolver() {
          resolverCalls += 1;
          throw new Error('must not run');
        }
      });

    assert.equal(
      outcome,
      HOSTED_PRIVATE_POC_HTTP_OUTCOMES.INERT
    );
    assert.equal(resolverCalls, 0);
    assert.deepEqual(capture.calls, []);
    assert.deepEqual(event.locals, {});
  }

  const unrelated =
    eventFor({
      pathname: '/studio/about',
      sessionId:
        'MALFORMED_SESSION_SENTINEL'
    });

  let resolverCalls = 0;

  assert.equal(
    await applyHostedPrivatePocStudioAuthorizedRequest({
      event: unrelated.event,
      runtimeMode: 'hosted',
      runtimeResolver() {
        resolverCalls += 1;
        throw new Error('must not run');
      }
    }),
    HOSTED_PRIVATE_POC_HTTP_OUTCOMES.INERT
  );

  assert.equal(resolverCalls, 0);
  assert.deepEqual(
    unrelated.capture.calls,
    []
  );
});

test('disabled private PoC is inert and does not read a presented cookie', async () => {
  const { event, capture } =
    eventFor({
      sessionId:
        'MALFORMED_SESSION_SENTINEL'
    });

  assert.equal(
    await applyHostedPrivatePocStudioAuthorizedRequest({
      event,
      runtimeMode: 'hosted',
      runtimeResolver: () => null
    }),
    HOSTED_PRIVATE_POC_HTTP_OUTCOMES.INERT
  );

  assert.deepEqual(capture.calls, []);
  assert.deepEqual(event.locals, {});
});

test('missing session requests authentication without creating or clearing browser state', async () => {
  const current = runtime();
  const { event, capture } = eventFor();

  const outcome =
    await applyHostedPrivatePocStudioAuthorizedRequest({
      event,
      runtimeMode: 'hosted',
      runtimeResolver: () => current
    });

  assert.equal(
    outcome,
    HOSTED_PRIVATE_POC_HTTP_OUTCOMES
      .AUTHENTICATE
  );

  assert.deepEqual(
    capture.calls,
    [{
      method: 'get',
      name: HOSTED_SESSION_COOKIE_NAME
    }]
  );
  assert.deepEqual(event.locals, {});
});

test('presented malformed or unknown session requests authentication and clears the stale cookie safely', async () => {
  const current = runtime();

  for (const sessionId of [
    'MALFORMED_SESSION_SENTINEL',
    Buffer.alloc(32, 99).toString('base64url')
  ]) {
    const { event, capture } =
      eventFor({ sessionId });

    const outcome =
      await applyHostedPrivatePocStudioAuthorizedRequest({
        event,
        runtimeMode: 'hosted',
        runtimeResolver: () => current
      });

    assert.equal(
      outcome,
      HOSTED_PRIVATE_POC_HTTP_OUTCOMES
        .AUTHENTICATE
    );

    assert.deepEqual(
      capture.calls.at(-1),
      {
        method: 'delete',
        name: HOSTED_SESSION_COOKIE_NAME,
        options:
          HOSTED_SESSION_COOKIE_OPTIONS
      }
    );
    assert.deepEqual(event.locals, {});
  }
});

test('authorized session places only genuine gate-issued context into locals', async () => {
  const authenticated =
    await authenticatedRuntime();

  const { event, capture } =
    eventFor({
      sessionId: authenticated.sessionId
    });

  const outcome =
    await applyHostedPrivatePocStudioAuthorizedRequest({
      event,
      runtimeMode: 'hosted',
      runtimeResolver:
        () => authenticated.runtime
    });

  assert.equal(
    outcome,
    HOSTED_PRIVATE_POC_HTTP_OUTCOMES.ALLOWED
  );

  assert.equal(
    isTrustedHostedRequestContext(
      event.locals.hostedStudio
    ),
    true
  );

  assert.equal(
    capture.calls.some(
      (call) => call.method === 'set'
    ),
    false
  );

  const serialized =
    JSON.stringify(event.locals);

  for (const forbidden of [
    SESSION_1,
    SESSION_2,
    CSRF,
    'ACCESS_TOKEN_HTTP_SENTINEL',
    'CLIENT_SECRET_HTTP_SENTINEL'
  ]) {
    assert.equal(
      serialized.includes(forbidden),
      false
    );
  }
});

test('periodic rotation replaces the opaque cookie before trusted locals are admitted', async () => {
  let now = BASE_TIME;

  const authenticated =
    await authenticatedRuntime(() => now);

  now += 45 * 60 * 1000;

  const { event, capture } =
    eventFor({
      sessionId: authenticated.sessionId
    });

  const outcome =
    await applyHostedPrivatePocStudioAuthorizedRequest({
      event,
      runtimeMode: 'hosted',
      runtimeResolver:
        () => authenticated.runtime
    });

  assert.equal(
    outcome,
    HOSTED_PRIVATE_POC_HTTP_OUTCOMES.ALLOWED
  );

  assert.deepEqual(
    capture.calls.at(-1),
    {
      method: 'set',
      name: HOSTED_SESSION_COOKIE_NAME,
      value: SESSION_2,
      options:
        HOSTED_SESSION_COOKIE_OPTIONS
    }
  );

  assert.equal(
    isTrustedHostedRequestContext(
      event.locals.hostedStudio
    ),
    true
  );
});

test('runtime resolver retains exactly one process-local state owner', () => {
  const resolver =
    createHostedPrivatePocRuntimeResolver({
      environment: environment(),
      dependencies: {
        transport: transport(),
        clock: () => BASE_TIME,
        oauthSecretGenerator:
          sequence([OAUTH_STATE, PKCE]),
        sessionIdGenerator:
          sequence([SESSION_1, SESSION_2]),
        csrfTokenGenerator: () => CSRF
      }
    });

  assert.equal(resolver('visitor'), null);
  assert.equal(resolver('local'), null);

  const first = resolver('hosted');
  const second = resolver('hosted');

  assert.ok(first);
  assert.equal(first, second);
});

test('forged allowed context cannot be placed into locals', async () => {
  const { event } = eventFor({
    sessionId: SESSION_1
  });

  const forgedRuntime =
    Object.create(
      Object.getPrototypeOf(runtime())
    );

  forgedRuntime.evaluateRequest = () => ({
    outcome: 'allowed',
    context: Object.freeze({
      runtime: 'hosted'
    }),
    sessionTransport: null
  });

  await assert.rejects(
    () =>
      applyHostedPrivatePocStudioAuthorizedRequest({
        event,
        runtimeMode: 'hosted',
        runtimeResolver:
          () => forgedRuntime
      }),
    HostedPrivatePocHttpError
  );

  assert.deepEqual(event.locals, {});
});

test('private PoC authority seam admits only explicitly approved Studio request shapes', () => {
  for (const [pathname, method] of [
    ['/studio', 'GET'],
    ['/studio/site/social', 'GET'],
    ['/studio/site/social', 'POST'],
    ['/studio/site/hero', 'GET'],
    ['/studio/site/hero', 'POST']
  ]) {
    assert.equal(
      isHostedPrivatePocStudioAuthorizedRequest(
        eventFor({
          pathname,
          method
        }).event
      ),
      true,
      `${method} ${pathname}`
    );
  }

  for (const [pathname, method] of [
    ['/studio', 'POST'],
    ['/studio/site/social', 'PUT'],
    ['/studio/site/social', 'PATCH'],
    ['/studio/site/social', 'DELETE'],
    ['/studio/site/hero', 'PUT'],
    ['/studio/site/hero', 'PATCH'],
    ['/studio/site/hero', 'DELETE'],
    ['/studio/site/hero/', 'GET'],
    ['/studio/site/contact', 'GET'],
    ['/studio/site/contact', 'POST']
  ]) {
    assert.equal(
      isHostedPrivatePocStudioAuthorizedRequest(
        eventFor({
          pathname,
          method
        }).event
      ),
      false,
      `${method} ${pathname}`
    );
  }
});

test('authorized Hero POST receives genuine trusted context before the action', async () => {
  const authenticated =
    await authenticatedRuntime();

  const {
    event
  } = eventFor({
    pathname:
      '/studio/site/hero',
    method: 'POST',
    sessionId:
      authenticated.sessionId
  });

  const result =
    await applyHostedPrivatePocStudioAuthorizedRequest({
      event,
      runtimeMode: 'hosted',
      runtimeResolver: () =>
        authenticated.runtime
    });

  assert.equal(
    result,
    HOSTED_PRIVATE_POC_HTTP_OUTCOMES.ALLOWED
  );

  assert.equal(
    isTrustedHostedRequestContext(
      event.locals.hostedStudio
    ),
    true
  );
});

test('authorized Social POST receives genuine trusted context before the action', async () => {
  const authenticated =
    await authenticatedRuntime();

  const {
    event
  } = eventFor({
    pathname:
      '/studio/site/social',
    method: 'POST',
    sessionId:
      authenticated.sessionId
  });

  const result =
    await applyHostedPrivatePocStudioAuthorizedRequest({
      event,
      runtimeMode: 'hosted',
      runtimeResolver: () =>
        authenticated.runtime
    });

  assert.equal(
    result,
    HOSTED_PRIVATE_POC_HTTP_OUTCOMES.ALLOWED
  );

  assert.equal(
    isTrustedHostedRequestContext(
      event.locals.hostedStudio
    ),
    true
  );
});
