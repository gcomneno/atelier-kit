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
import {
  HostedGitHubOAuthAuthenticationError
} from './hosted-github-oauth.js';
import {
  HostedRedisStateStoreError
} from './hosted-redis-state.js';

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
const OTHER_OAUTH_STATE =
  Buffer.alloc(32, 41).toString('base64url');
const OTHER_PKCE =
  Buffer.alloc(32, 42).toString('base64url');

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

function persistentRedisEnvironment(overrides = {}) {
  return environment({
    ATELIER_STUDIO_PRIVATE_POC_STATE_TOPOLOGY: 'persistent-redis',
    ATELIER_STUDIO_STATE_REDIS_REST_URL:
      'https://redis-runtime-test.example.com',
    ATELIER_STUDIO_STATE_REDIS_REST_TOKEN:
      'REDIS_RUNTIME_TEST_TOKEN_SENTINEL',
    ATELIER_STUDIO_STATE_NAMESPACE: 'runtime-test-private-prod',
    ...overrides
  });
}

/** A deterministic no-network official-client seam with shared Redis backing. */
class FakeUpstashClient {
  #records;
  #clock;
  fail = false;
  /** @type {any[]} */
  calls = [];

  /** @param {Map<string, { value: string, expiresAt: number }>} records @param {() => number} clock */
  constructor(records, clock) {
    this.#records = records;
    this.#clock = clock;
  }

  /** @param {string} key */
  #active(key) {
    const current = this.#records.get(key);
    if (current && this.#clock() >= current.expiresAt) this.#records.delete(key);
    return this.#records.get(key) ?? null;
  }

  #assertAvailable() {
    if (this.fail) throw new Error('fake Redis outage with REDIS_RUNTIME_TEST_TOKEN_SENTINEL');
  }

  /** @param {string} key @param {string} value @param {{ nx?: boolean, px?: number }} options */
  async set(key, value, options) {
    this.calls.push(['set', key, options]);
    this.#assertAvailable();
    const ttl = options?.px;
    if (
      options?.nx !== true ||
      typeof ttl !== 'number' ||
      !Number.isSafeInteger(ttl)
    ) throw new Error('invalid set');
    if (this.#active(key)) return null;
    this.#records.set(key, { value, expiresAt: this.#clock() + ttl });
    return 'OK';
  }

  /** @param {string} key */
  async get(key) {
    this.calls.push(['get', key]);
    this.#assertAvailable();
    return this.#active(key)?.value ?? null;
  }

  /** @param {string} key */
  async getdel(key) {
    this.calls.push(['getdel', key]);
    this.#assertAvailable();
    const current = this.#active(key);
    if (!current) return null;
    this.#records.delete(key);
    return current.value;
  }

  /** @param {string} key */
  async del(key) {
    this.calls.push(['del', key]);
    this.#assertAvailable();
    return this.#records.delete(key) ? 1 : 0;
  }

  /** @param {string} script @param {string[]} keys @param {string[]} args */
  async eval(script, keys, args) {
    this.calls.push(['eval', script, [...keys], [...args]]);
    this.#assertAvailable();
    const current = this.#active(keys[0]);
    if (!current) return 0;
    if (current.value !== args[0]) return 2;
    const expected = JSON.parse(args[0]).record;
    const next = JSON.parse(args[1]).record;
    const ttl = Number(args[2]);
    if (!Number.isSafeInteger(ttl) || ttl <= 0) return 2;
    if (script.includes('hosted-session-update-v1')) {
      if (expected.sessionId !== next.sessionId) return 2;
      this.#records.set(keys[0], { value: args[1], expiresAt: this.#clock() + ttl });
      return 1;
    }
    if (!script.includes('hosted-session-replace-v1')) return 2;
    if (expected.sessionId === next.sessionId || this.#active(keys[1])) return 3;
    this.#records.set(keys[1], { value: args[1], expiresAt: this.#clock() + ttl });
    this.#records.delete(keys[0]);
    return 1;
  }
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

/** @param {FakeUpstashClient} client @param {string[]} oauthSecrets @param {string[]} sessionIds */
function persistentRuntimeForUser(client, oauthSecrets, sessionIds) {
  const runtime = createHostedPrivatePocRuntime(
    'hosted',
    persistentRedisEnvironment(),
    {
      transport: transportForUser({ id: 123, login: 'operator' }),
      clock: () => BASE_TIME,
      oauthSecretGenerator: sequence(oauthSecrets),
      sessionIdGenerator: sequence(sessionIds),
      csrfTokenGenerator: () => CSRF,
      upstashClientFactory: () => client
    }
  );
  assert.ok(runtime);
  return runtime;
}

test('inactive runtimes and non-enabled Hosted mode create no stateful runtime', () => {
  for (
    const mode of
    /** @type {Array<'visitor' | 'local' | 'demo' | 'invalid'>} */ ([
      'visitor',
      'local',
      'demo',
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
    await runtime.beginAuthentication('/studio');

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

test('single-process runtimes retain process-local state and never share it', async () => {
  const first = runtimeForUser({ id: 123, login: 'operator' });
  const second = runtimeForUser({ id: 123, login: 'operator' });
  await first.beginAuthentication('/studio');
  await assert.rejects(
    () => second.completeAuthentication({ state: OAUTH_STATE, code: 'oauth-code' }),
    HostedGitHubOAuthAuthenticationError
  );
  assert.equal(
    (await second.evaluateRequest('hosted', SESSION_1)).outcome,
    HOSTED_ROUTE_GATE_OUTCOMES.AUTHENTICATE
  );
});

test('persistent Redis runtimes share one-time OAuth and session authority through the canonical path', async () => {
  const records = new Map();
  const clientA = new FakeUpstashClient(records, () => BASE_TIME);
  const clientB = new FakeUpstashClient(records, () => BASE_TIME);
  const first = persistentRuntimeForUser(clientA, [OAUTH_STATE, PKCE], [SESSION_1]);
  const second = persistentRuntimeForUser(
    clientB, [OTHER_OAUTH_STATE, OTHER_PKCE], [SESSION_2]
  );

  await first.beginAuthentication('/studio');
  const completed = await second.completeAuthentication({
    state: OAUTH_STATE,
    code: 'oauth-code'
  });
  assert.equal(completed.result, HOSTED_PRIVATE_POC_AUTH_RESULTS.AUTHORIZED);
  assert.equal(completed.sessionId, SESSION_2);

  await assert.rejects(
    () => first.completeAuthentication({ state: OAUTH_STATE, code: 'oauth-code' }),
    HostedGitHubOAuthAuthenticationError
  );

  const decision = await first.evaluateRequest('hosted', completed.sessionId);
  assert.equal(decision.outcome, HOSTED_ROUTE_GATE_OUTCOMES.ALLOWED);
  assert.equal(isTrustedHostedRequestContext(decision.context), true);
  assert.equal(await second.invalidateSession(completed.sessionId), true);
  assert.equal(
    (await first.evaluateRequest('hosted', completed.sessionId)).outcome,
    HOSTED_ROUTE_GATE_OUTCOMES.AUTHENTICATE
  );

  assert.ok(clientA.calls.some(([name]) => name === 'getdel'));
  assert.ok(clientB.calls.some(([name]) => name === 'set'));
});

test('persistent Redis outage never falls back or issues trusted Hosted context', async () => {
  const records = new Map();
  const client = new FakeUpstashClient(records, () => BASE_TIME);
  const runtime = persistentRuntimeForUser(client, [OAUTH_STATE, PKCE], [SESSION_1]);
  await runtime.beginAuthentication('/studio');
  const completed = await runtime.completeAuthentication({ state: OAUTH_STATE, code: 'oauth-code' });
  assert.equal(
    (await runtime.evaluateRequest('hosted', completed.sessionId)).outcome,
    HOSTED_ROUTE_GATE_OUTCOMES.ALLOWED
  );

  const getCallsBeforeOutage =
    client.calls.filter(([name]) => name === 'get').length;
  client.fail = true;
  await assert.rejects(
    () => runtime.evaluateRequest('hosted', completed.sessionId),
    (error) => {
      assert.ok(error instanceof HostedRedisStateStoreError);
      assert.equal(error.message.includes('REDIS_RUNTIME_TEST_TOKEN_SENTINEL'), false);
      return true;
    }
  );
  assert.equal(
    client.calls.filter(([name]) => name === 'get').length,
    getCallsBeforeOutage + 1
  );
});

test('authentication never implies authorization and denied identity creates no session authority', async () => {
  const runtime =
    runtimeForUser({
      id: 999,
      login: 'not-allowed'
    });

  await runtime.beginAuthentication('/studio');

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
    await runtime.evaluateRequest(
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

  await runtime.beginAuthentication('/studio');

  const completed =
    await runtime.completeAuthentication({
      state: OAUTH_STATE,
      code: 'oauth-code'
    });

  const decision =
    await runtime.evaluateRequest(
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

test('request evaluation keeps visitor invalid and Local semantics delegated to the canonical gate', async () => {
  const runtime =
    runtimeForUser({
      id: 123,
      login: 'operator'
    });

  assert.equal(
    (await runtime.evaluateRequest(
      'visitor',
      SESSION_1
    )).outcome,
    HOSTED_ROUTE_GATE_OUTCOMES.NOT_FOUND
  );

  assert.equal(
    (await runtime.evaluateRequest(
      'invalid',
      SESSION_1
    )).outcome,
    HOSTED_ROUTE_GATE_OUTCOMES.NOT_FOUND
  );

  assert.equal(
    (await runtime.evaluateRequest(
      'local',
      SESSION_1
    )).outcome,
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

  await runtime.beginAuthentication('/studio');

  const completed =
    await runtime.completeAuthentication({
      state: OAUTH_STATE,
      code: 'oauth-code'
    });

  currentTime += 45 * 60 * 1000;

  const rotatedDecision =
    await runtime.evaluateRequest(
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
    (await runtime.evaluateRequest(
      'hosted',
      SESSION_1
    )).outcome,
    HOSTED_ROUTE_GATE_OUTCOMES.AUTHENTICATE
  );

  assert.equal(
    (await runtime.evaluateRequest(
      'hosted',
      SESSION_2
    )).outcome,
    HOSTED_ROUTE_GATE_OUTCOMES.ALLOWED
  );
});

test('explicit invalidation is effective and idempotent through the runtime facade', async () => {
  const runtime =
    runtimeForUser({
      id: 123,
      login: 'operator'
    });

  await runtime.beginAuthentication('/studio');

  const completed =
    await runtime.completeAuthentication({
      state: OAUTH_STATE,
      code: 'oauth-code'
    });

  assert.equal(
    await runtime.invalidateSession(
      completed.sessionId
    ),
    true
  );

  assert.equal(
    await runtime.invalidateSession(
      completed.sessionId
    ),
    false
  );

  assert.equal(
    (await runtime.evaluateRequest(
      'hosted',
      completed.sessionId
    )).outcome,
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
