import assert from 'node:assert/strict';
import test from 'node:test';
import {
  createDemoPublicRuntime,
  DemoPublicRuntime,
  DemoPublicRuntimeConfigurationError
} from './demo-public-runtime.js';
import {
  createDemoPublicRuntimeResolver
} from './demo-public-http.js';
import {
  DEMO_SESSION_ISSUANCE_OUTCOMES
} from './demo-session-issuance-limiter.js';

const SESSION_ID =
  Buffer.alloc(32, 101)
    .toString('base64url');

const CSRF =
  Buffer.alloc(32, 102)
    .toString('base64url');

const ISSUANCE_SECRET =
  Buffer.alloc(32, 103)
    .toString('base64url');

function environment() {
  return {
    ATELIER_STUDIO_MODE:
      'demo',
    ATELIER_DEMO_PUBLIC:
      '1',
    ATELIER_DEMO_CANONICAL_ORIGIN:
      'https://demo.example.test',
    ATELIER_DEMO_STATE_REDIS_REST_URL:
      'https://redis.example.test',
    ATELIER_DEMO_STATE_REDIS_REST_TOKEN:
      'token',
    ATELIER_DEMO_STATE_NAMESPACE:
      'demo-runtime',
    ATELIER_DEMO_ISSUANCE_SECRET:
      ISSUANCE_SECRET
  };
}

class FakeRedisClient {
  #records = new Map();

  /**
   * @param {string} key
   * @param {string} value
   * @param {{ nx?: boolean, px?: number }} options
   */
  async set(
    key,
    value,
    options
  ) {
    if (
      options?.nx &&
      this.#records.has(key)
    ) {
      return null;
    }

    this.#records.set(
      key,
      value
    );

    return 'OK';
  }

  /** @param {string} key */
  async get(key) {
    return (
      this.#records.get(key) ??
      null
    );
  }

  /** @param {string} key */
  async del(key) {
    return this.#records.delete(
      key
    ) ? 1 : 0;
  }

  /**
   * @param {string} script
   * @param {string[]} keys
   * @param {string[]} args
   */
  async eval(
    script,
    keys,
    args
  ) {
    if (
      script.includes(
        'demo-bounded-counter-consume-v1'
      )
    ) {
      const current =
        Number(
          this.#records.get(
            keys[0]
          ) ?? 0
        );

      const limit =
        Number(args[0]);

      if (current >= limit) {
        return limit + 1;
      }

      const next =
        current + 1;

      this.#records.set(
        keys[0],
        String(next)
      );

      return next;
    }

    const current =
      this.#records.get(
        keys[0]
      );

    if (current === undefined) {
      return 0;
    }

    if (
      current !== args[0]
    ) {
      return 2;
    }

    const expected =
      JSON.parse(
        args[0]
      ).record;

    const next =
      JSON.parse(
        args[1]
      ).record;

    if (
      script.includes(
        'demo-session-update-v1'
      )
    ) {
      if (
        expected.sessionId !==
          next.sessionId
      ) {
        return 2;
      }

      this.#records.set(
        keys[0],
        args[1]
      );

      return 1;
    }

    if (
      script.includes(
        'demo-session-replace-v1'
      )
    ) {
      if (
        this.#records.has(
          keys[1]
        )
      ) {
        return 3;
      }

      this.#records.set(
        keys[1],
        args[1]
      );
      this.#records.delete(
        keys[0]
      );

      return 1;
    }

    throw new Error(
      'unknown script'
    );
  }
}

function dependencies() {
  const client =
    new FakeRedisClient();

  return {
    clock: () => 10_000,
    sessionIdGenerator:
      () => SESSION_ID,
    csrfTokenGenerator:
      () => CSRF,
    upstashClientFactory:
      () => client
  };
}

test('inactive Demo public runtime remains null', () => {
  assert.equal(
    createDemoPublicRuntime(
      'visitor',
      environment(),
      dependencies()
    ),
    null
  );

  assert.equal(
    createDemoPublicRuntime(
      'demo',
      {
        ATELIER_STUDIO_MODE:
          'demo'
      },
      dependencies()
    ),
    null
  );
});

test('complete persistent configuration builds the isolated Demo runtime', () => {
  const runtime =
    createDemoPublicRuntime(
      'demo',
      environment(),
      dependencies()
    );

  assert.ok(
    runtime instanceof
      DemoPublicRuntime
  );
});

test('guest creation is server-only and passes through issuance limiting', async () => {
  const runtime =
    createDemoPublicRuntime(
      'demo',
      environment(),
      dependencies()
    );

  assert.ok(runtime);

  const issued =
    await runtime.issueGuestSession(
      'server-derived-subject'
    );

  assert.equal(
    issued.outcome,
    DEMO_SESSION_ISSUANCE_OUTCOMES
      .ALLOWED
  );

  assert.equal(
    issued.session?.sessionId,
    SESSION_ID
  );

  assert.equal(
    'identity' in
      issued.session,
    false
  );

  const admitted =
    await runtime.evaluateRequest(
      'demo',
      SESSION_ID
    );

  assert.equal(
    admitted.outcome,
    'allowed'
  );
});

test('lazy resolver retains one persistent runtime object', () => {
  let factories = 0;

  const resolver =
    createDemoPublicRuntimeResolver({
      environment:
        environment(),
      dependencies: {
        ...dependencies(),
        upstashClientFactory() {
          factories += 1;
          return new FakeRedisClient();
        }
      }
    });

  const first =
    resolver('demo');

  const second =
    resolver('demo');

  assert.ok(first);
  assert.equal(
    first,
    second
  );

  assert.equal(
    factories,
    1
  );

  assert.equal(
    resolver('hosted'),
    null
  );
});


test('runtime lifecycle contract requires invalidation as well as creation', () => {
  assert.throws(
    () =>
      new DemoPublicRuntime({
        sessionLifecycle: {
          async create() {
            return {};
          }
        },
        routeGate: {
          async evaluate() {
            return {};
          }
        },
        mutationGuard: {
          async evaluate() {
            return {};
          }
        },
        issuanceLimiter: {
          async evaluate() {
            return {};
          }
        }
      }),
    DemoPublicRuntimeConfigurationError
  );
});
