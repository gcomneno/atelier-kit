import assert from 'node:assert/strict';
import test from 'node:test';
import {
  DemoRedisBoundedCounterStore
} from './demo-redis-bounded-counter-store.js';
import {
  DemoRedisSessionStore
} from './demo-redis-session-store.js';
import {
  DemoRedisStateStoreError
} from './demo-redis-state.js';
import {
  DemoSessionStoreConflictError,
  DemoSessionStoreInvariantError
} from './demo-session-store.js';

/** @param {number} byte */
const secret = (byte) =>
  Buffer.alloc(32, byte)
    .toString('base64url');

class FakeDemoRedisTransport {
  #records = new Map();
  #clock;

  fail = false;
  failEval = false;

  /** @type {any[]} */
  calls = [];

  /** @param {() => number} clock */
  constructor(clock) {
    this.#clock = clock;
  }

  /** @param {string} key */
  #active(key) {
    const entry =
      this.#records.get(key);

    if (
      entry &&
      this.#clock() >=
        entry.expiresAt
    ) {
      this.#records.delete(key);
    }

    return (
      this.#records.get(key) ??
      null
    );
  }

  /**
   * @param {string} key
   * @param {string} value
   * @param {number} ttl
   */
  async setIfAbsent(
    key,
    value,
    ttl
  ) {
    this.calls.push([
      'setIfAbsent',
      key,
      ttl
    ]);

    if (this.fail) {
      throw new Error(
        `redis failed ${key} ${value}`
      );
    }

    if (this.#active(key)) {
      return false;
    }

    this.#records.set(
      key,
      {
        value,
        expiresAt:
          this.#clock() + ttl
      }
    );

    return true;
  }

  /** @param {string} key */
  async get(key) {
    this.calls.push([
      'get',
      key
    ]);

    if (this.fail) {
      throw new Error(
        `redis failed ${key}`
      );
    }

    return (
      this.#active(key)?.value ??
      null
    );
  }

  /** @param {string} key */
  async del(key) {
    this.calls.push([
      'del',
      key
    ]);

    if (this.fail) {
      throw new Error(
        `redis failed ${key}`
      );
    }

    return this.#records.delete(
      key
    );
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
    this.calls.push([
      'eval',
      script,
      [...keys],
      [...args]
    ]);

    if (
      this.fail ||
      this.failEval
    ) {
      throw new Error(
        `redis script failed ${keys.join(',')}`
      );
    }

    if (
      script.includes(
        'demo-bounded-counter-consume-v1'
      )
    ) {
      const limit =
        Number(args[0]);

      const ttl =
        Number(args[1]);

      const current =
        this.#active(keys[0]);

      const used =
        current
          ? Number(current.value)
          : 0;

      if (
        !Number.isSafeInteger(used) ||
        used < 0
      ) {
        return 1_000_000;
      }

      if (used >= limit) {
        return limit + 1;
      }

      const next =
        used + 1;

      this.#records.set(
        keys[0],
        {
          value: String(next),
          expiresAt:
            this.#clock() + ttl
        }
      );

      return next;
    }

    const current =
      this.#active(keys[0]);

    if (!current) {
      return 0;
    }

    if (
      current.value !== args[0]
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

    const stable =
      expected.csrfToken ===
        next.csrfToken &&
      expected.createdAt ===
        next.createdAt &&
      expected.expiresAt ===
        next.expiresAt &&
      next.rotatedAt >=
        expected.rotatedAt &&
      next.lastSeenAt >=
        expected.lastSeenAt &&
      next.lastSeenAt >=
        next.rotatedAt;

    if (!stable) {
      return 2;
    }

    const ttl =
      Number(args[2]);

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
        {
          value: args[1],
          expiresAt:
            this.#clock() + ttl
        }
      );

      return 1;
    }

    if (
      !script.includes(
        'demo-session-replace-v1'
      )
    ) {
      throw new Error(
        'unknown script'
      );
    }

    if (
      expected.sessionId ===
        next.sessionId
    ) {
      return 2;
    }

    if (this.#active(keys[1])) {
      return 3;
    }

    this.#records.set(
      keys[1],
      {
        value: args[1],
        expiresAt:
          this.#clock() + ttl
      }
    );

    this.#records.delete(keys[0]);

    return 1;
  }

  /**
   * @param {string} key
   * @param {string} value
   */
  insertUntrusted(key, value) {
    this.#records.set(
      key,
      {
        value,
        expiresAt:
          this.#clock() +
          999_999
      }
    );
  }
}

function harness(
  now = 10_000
) {
  let time = now;

  const clock = () => time;

  const transport =
    new FakeDemoRedisTransport(
      clock
    );

  return {
    clock,
    transport,
    setTime:
      /** @param {number} value */
      (value) => {
        time = value;
      }
  };
}

/**
 * @param {string} [sessionId]
 * @param {number} [lastSeenAt]
 * @param {Record<string, unknown>} [overrides]
 */
function session(
  sessionId = secret(1),
  lastSeenAt = 10_000,
  overrides = {}
) {
  return {
    sessionId,
    csrfToken: secret(2),
    createdAt: 10_000,
    rotatedAt: 10_000,
    expiresAt: 30_000,
    lastSeenAt,
    ...overrides
  };
}

test('Demo Redis session keys are versioned namespaced and never contain browser credentials', async () => {
  const {
    clock,
    transport
  } = harness();

  const store =
    new DemoRedisSessionStore({
      namespace: 'demo-prod-01',
      transport,
      clock
    });

  const input =
    session();

  const key =
    store.keyFor(
      input.sessionId
    );

  assert.match(
    key,
    /^atelier:demo-state:v1:demo-prod-01:session:/
  );

  assert.equal(
    key.includes(
      input.sessionId
    ),
    false
  );

  const created =
    await store.create(input);

  assert.deepEqual(
    created,
    input
  );

  assert.equal(
    transport.calls.at(-1)[2],
    20_000
  );

  assert.deepEqual(
    await store.read(
      input.sessionId
    ),
    created
  );
});

test('Demo Redis session collision malformed state and expiry fail closed', async () => {
  const {
    clock,
    transport,
    setTime
  } = harness();

  const store =
    new DemoRedisSessionStore({
      namespace: 'demo-prod-02',
      transport,
      clock
    });

  const input =
    session();

  await store.create(input);

  await assert.rejects(
    () => store.create(input),
    DemoSessionStoreConflictError
  );

  const malformedId =
    secret(3);

  transport.insertUntrusted(
    store.keyFor(
      malformedId
    ),
    '{"v":1,"record":{"sessionId":"bad"}}'
  );

  assert.equal(
    await store.read(
      malformedId
    ),
    null
  );

  setTime(30_000);

  assert.equal(
    await store.read(
      input.sessionId
    ),
    null
  );
});

test('Demo Redis session update is CAS and cannot regress stable authority', async () => {
  const {
    clock,
    transport,
    setTime
  } = harness();

  const store =
    new DemoRedisSessionStore({
      namespace: 'demo-prod-03',
      transport,
      clock
    });

  const original =
    session();

  await store.create(original);

  setTime(12_000);

  const [
    first,
    second
  ] =
    await Promise.all([
      store.update(
        original.sessionId,
        original,
        session(
          original.sessionId,
          11_000
        )
      ),
      store.update(
        original.sessionId,
        original,
        session(
          original.sessionId,
          12_000
        )
      )
    ]);

  assert.equal(
    [first, second]
      .filter(Boolean)
      .length,
    1
  );

  const current =
    await store.read(
      original.sessionId
    );

  assert.ok(current);

  await assert.rejects(
    () =>
      store.update(
        original.sessionId,
        current,
        session(
          original.sessionId,
          current.lastSeenAt,
          {
            csrfToken:
              secret(9)
          }
        )
      ),
    DemoSessionStoreInvariantError
  );
});

test('Demo Redis rotation is atomic and retires the old lookup credential', async () => {
  const {
    clock,
    transport,
    setTime
  } = harness();

  const store =
    new DemoRedisSessionStore({
      namespace: 'demo-prod-04',
      transport,
      clock
    });

  const original =
    session();

  await store.create(original);

  setTime(11_000);

  const replacement =
    session(
      secret(4),
      11_000,
      {
        rotatedAt: 11_000
      }
    );

  const rotated =
    await store.replace(
      original.sessionId,
      original,
      replacement
    );

  assert.equal(
    rotated?.sessionId,
    replacement.sessionId
  );

  assert.equal(
    await store.read(
      original.sessionId
    ),
    null
  );

  assert.equal(
    (
      await store.read(
        replacement.sessionId
      )
    )?.expiresAt,
    original.expiresAt
  );
});

test('Demo Redis session transport failures are redacted controlled store failures', async () => {
  const {
    clock,
    transport
  } = harness();

  const store =
    new DemoRedisSessionStore({
      namespace: 'demo-prod-05',
      transport,
      clock
    });

  const input =
    session();

  transport.fail = true;

  await assert.rejects(
    () => store.create(input),
    (error) => {
      assert.ok(
        error instanceof
          DemoRedisStateStoreError
      );

      assert.equal(
        error.message.includes(
          input.sessionId
        ),
        false
      );

      assert.equal(
        error.message.includes(
          input.csrfToken
        ),
        false
      );

      return true;
    }
  );
});

test('persistent mutation counter is atomic bounded and expires with guest authority', async () => {
  const {
    clock,
    transport
  } = harness();

  const store =
    new DemoRedisBoundedCounterStore({
      namespace: 'demo-prod-06',
      kind: 'mutation',
      transport,
      clock
    });

  const key =
    secret(10);

  const results =
    await Promise.all(
      Array.from(
        { length: 7 },
        () =>
          store.consume({
            key,
            limit: 5,
            expiresAt: 30_000
          })
      )
    );

  assert.equal(
    results.filter(
      (entry) => entry.allowed
    ).length,
    5
  );

  assert.equal(
    results.filter(
      (entry) => !entry.allowed
    ).length,
    2
  );

  assert.equal(
    results.at(-1)?.remaining,
    0
  );

  assert.equal(
    store.keyFor(key).includes(key),
    false
  );
});

test('issuance counter has an independent Redis namespace kind from mutation budget', async () => {
  const {
    clock,
    transport
  } = harness();

  const mutation =
    new DemoRedisBoundedCounterStore({
      namespace: 'demo-prod-07',
      kind: 'mutation',
      transport,
      clock
    });

  const issuance =
    new DemoRedisBoundedCounterStore({
      namespace: 'demo-prod-07',
      kind: 'issuance',
      transport,
      clock
    });

  const key =
    secret(11);

  assert.notEqual(
    mutation.keyFor(key),
    issuance.keyFor(key)
  );

  const mutationResult =
    await mutation.consume({
      key,
      limit: 1,
      expiresAt: 20_000
    });

  const issuanceResult =
    await issuance.consume({
      key,
      limit: 1,
      expiresAt: 20_000
    });

  assert.equal(
    mutationResult.allowed,
    true
  );

  assert.equal(
    issuanceResult.allowed,
    true
  );
});

test('bounded counter store failure never becomes legitimate exhaustion', async () => {
  const {
    clock,
    transport
  } = harness();

  const store =
    new DemoRedisBoundedCounterStore({
      namespace: 'demo-prod-08',
      kind: 'mutation',
      transport,
      clock
    });

  transport.failEval = true;

  await assert.rejects(
    () =>
      store.consume({
        key: secret(12),
        limit: 5,
        expiresAt: 30_000
      }),
    DemoRedisStateStoreError
  );
});
