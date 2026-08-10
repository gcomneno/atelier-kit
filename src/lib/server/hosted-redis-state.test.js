import assert from 'node:assert/strict';
import test from 'node:test';
import {
  HostedOAuthTransactionStoreConflictError
} from './hosted-oauth-transaction-store.js';
import {
  HostedRedisOAuthTransactionStore
} from './hosted-redis-oauth-transaction-store.js';
import {
  HostedRedisSessionStore
} from './hosted-redis-session-store.js';
import {
  HostedRedisStateStoreError
} from './hosted-redis-state.js';
import {
  HostedSessionStoreConflictError,
  HostedSessionStoreInvariantError
} from './hosted-session-store.js';

/** @param {number} byte */
const secret = (byte) => Buffer.alloc(32, byte).toString('base64url');

/** A deterministic Redis seam, including the finite session script protocol. */
class FakeHostedRedisTransport {
  #records = new Map();
  #clock;
  fail = false;
  failEval = false;
  /** @type {any[]} */
  calls = [];

  /** @param {() => number} clock */
  constructor(clock) { this.#clock = clock; }

  /** @param {string} key */
  #active(key) {
    const entry = this.#records.get(key);
    if (entry && this.#clock() >= entry.expiresAt) this.#records.delete(key);
    return this.#records.get(key) ?? null;
  }

  /** @param {string} key @param {string} value @param {number} ttl */
  async setIfAbsent(key, value, ttl) {
    this.calls.push(['setIfAbsent', key, ttl]);
    if (this.fail) throw new Error(`redis transport failed for ${key}: ${value}`);
    if (this.#active(key)) return false;
    this.#records.set(key, { value, expiresAt: this.#clock() + ttl });
    return true;
  }

  /** @param {string} key */
  async get(key) {
    this.calls.push(['get', key]);
    if (this.fail) throw new Error(`redis transport failed for ${key}`);
    return this.#active(key)?.value ?? null;
  }

  /** @param {string} key */
  async getDel(key) {
    this.calls.push(['getDel', key]);
    if (this.fail) throw new Error(`redis transport failed for ${key}`);
    const entry = this.#active(key);
    if (!entry) return null;
    this.#records.delete(key);
    return entry.value;
  }

  /** @param {string} key */
  async del(key) {
    this.calls.push(['del', key]);
    if (this.fail) throw new Error(`redis transport failed for ${key}`);
    return this.#records.delete(key);
  }

  /** @param {string} script @param {string[]} keys @param {string[]} args */
  async eval(script, keys, args) {
    this.calls.push(['eval', script, [...keys], [...args]]);
    if (this.fail || this.failEval) throw new Error(`redis script failed for ${keys.join(',')}: ${args.join(',')}`);
    const current = this.#active(keys[0]);
    if (!current) return 0;
    if (current.value !== args[0]) return 2;
    const expected = JSON.parse(args[0]).record;
    const next = JSON.parse(args[1]).record;
    const stable = expected.authorization === next.authorization &&
      expected.csrfToken === next.csrfToken && expected.createdAt === next.createdAt &&
      expected.expiresAt === next.expiresAt &&
      expected.identity.provider === next.identity.provider &&
      expected.identity.subject === next.identity.subject &&
      next.rotatedAt >= expected.rotatedAt && next.lastSeenAt >= expected.lastSeenAt &&
      next.lastSeenAt >= next.rotatedAt;
    if (!stable) return 2;
    const ttl = Number(args[2]);
    if (script.includes('hosted-session-update-v1')) {
      if (expected.sessionId !== next.sessionId) return 2;
      this.#records.set(keys[0], { value: args[1], expiresAt: this.#clock() + ttl });
      return 1;
    }
    if (!script.includes('hosted-session-replace-v1')) throw new Error('unknown script');
    if (expected.sessionId === next.sessionId) return 2;
    if (this.#active(keys[1])) return 3;
    this.#records.set(keys[1], { value: args[1], expiresAt: this.#clock() + ttl });
    this.#records.delete(keys[0]);
    return 1;
  }

  /** @param {string} key @param {string} value */
  insertUntrusted(key, value) { this.#records.set(key, { value, expiresAt: this.#clock() + 999_999 }); }
  /** @param {string} key */
  has(key) { return this.#active(key) !== null; }
}

function harness(now = 10_000) {
  let time = now;
  const clock = () => time;
  const transport = new FakeHostedRedisTransport(clock);
  return { clock, transport, setTime: /** @param {number} value */ (value) => { time = value; } };
}

function transaction(state = secret(1), expiresAt = 20_000) {
  return { state, pkceVerifier: secret(2), returnTo: '/studio', createdAt: 10_000, expiresAt };
}

function session(sessionId = secret(3), lastSeenAt = 10_000, overrides = {}) {
  return {
    sessionId,
    identity: { provider: 'github', subject: '123' },
    authorization: 'authorized',
    csrfToken: secret(4),
    createdAt: 10_000,
    rotatedAt: 10_000,
    expiresAt: 30_000,
    lastSeenAt,
    ...overrides
  };
}

test('Redis OAuth keys are namespaced/versioned, hashed and transactions are one-time', async () => {
  const { clock, transport } = harness();
  const store = new HostedRedisOAuthTransactionStore({ namespace: 'private-prod-01', transport, clock });
  const input = transaction();
  const key = store.keyFor(input.state);
  assert.match(key, /^atelier:hosted-state:v1:private-prod-01:oauth:/);
  assert.equal(key.includes(input.state), false);
  const created = await store.create(input);
  assert.equal(created.state, input.state);
  assert.equal(transport.calls.at(-1)[2], 10_000);
  assert.deepEqual(await store.read(input.state), created);
  const [first, second] = await Promise.all([store.consume(input.state), store.consume(input.state)]);
  assert.equal([first, second].filter(Boolean).length, 1);
  assert.equal(await store.delete(input.state), false);
});

test('Redis OAuth creation preserves collision authority and untrusted state fails closed', async () => {
  const { clock, transport, setTime } = harness();
  const store = new HostedRedisOAuthTransactionStore({ namespace: 'private-prod-02', transport, clock });
  const input = transaction();
  await store.create(input);
  await assert.rejects(() => store.create(input), HostedOAuthTransactionStoreConflictError);
  transport.insertUntrusted(store.keyFor(secret(5)), '{"v":99,"record":{}}');
  assert.equal(await store.read(secret(5)), null);
  transport.insertUntrusted(store.keyFor(secret(6)), '{broken');
  assert.equal(await store.consume(secret(6)), null);
  setTime(20_000);
  assert.equal(await store.read(input.state), null);
  await assert.rejects(() => store.create(transaction(secret(7), 20_000)), HostedRedisStateStoreError);
});

test('Redis OAuth transport failures are controlled and redact secrets', async () => {
  const { clock, transport } = harness();
  const input = transaction();
  const store = new HostedRedisOAuthTransactionStore({ namespace: 'private-prod-03', transport, clock });
  transport.fail = true;
  await assert.rejects(() => store.create(input), (error) => {
    assert.ok(error instanceof HostedRedisStateStoreError);
    assert.equal(error.message.includes(input.state), false);
    assert.equal(error.message.includes(input.pkceVerifier), false);
    return true;
  });
});

test('Redis session create/read/delete has bounded absolute TTL and collision preservation', async () => {
  const { clock, transport } = harness();
  const store = new HostedRedisSessionStore({ namespace: 'private-prod-04', transport, clock });
  const input = session();
  const key = store.keyFor(input.sessionId);
  assert.match(key, /^atelier:hosted-state:v1:private-prod-04:session:/);
  assert.equal(key.includes(input.sessionId), false);
  await store.create(input);
  assert.equal(transport.calls.at(-1)[2], 20_000);
  assert.equal((await store.read(input.sessionId))?.lastSeenAt, 10_000);
  await assert.rejects(() => store.create(session(input.sessionId)), HostedSessionStoreConflictError);
  assert.equal((await store.read(input.sessionId))?.lastSeenAt, 10_000);
  assert.equal(await store.delete(input.sessionId), true);
  assert.equal(await store.delete(input.sessionId), false);
});

test('Redis session rejects malformed, wrong-version, and expired persisted records', async () => {
  const { clock, transport, setTime } = harness();
  const store = new HostedRedisSessionStore({ namespace: 'private-prod-05', transport, clock });
  const id = secret(3);
  transport.insertUntrusted(store.keyFor(id), '{"v":1,"record":{"sessionId":"bad"}}');
  assert.equal(await store.read(id), null);
  transport.insertUntrusted(store.keyFor(id), '{"v":2,"record":{}}');
  assert.equal(await store.read(id), null);
  await store.create(session(secret(8)));
  setTime(30_000);
  assert.equal(await store.read(secret(8)), null);
});

test('Redis session update is atomic, compare-and-transition, and cannot regress authority', async () => {
  const { clock, transport, setTime } = harness();
  const store = new HostedRedisSessionStore({ namespace: 'private-prod-06', transport, clock });
  const original = session();
  await store.create(original);
  setTime(12_000);
  const [first, second] = await Promise.all([
    store.update(original.sessionId, original, session(original.sessionId, 11_000)),
    store.update(original.sessionId, original, session(original.sessionId, 12_000))
  ]);
  assert.equal([first, second].filter(Boolean).length, 1);
  const current = await store.read(original.sessionId);
  assert.ok(current);
  assert.ok(current.lastSeenAt === 11_000 || current.lastSeenAt === 12_000);
  assert.equal(await store.update(original.sessionId, original, session(original.sessionId, 13_000)), null);
  await assert.rejects(() => store.update(
    original.sessionId, current, session(original.sessionId, current.lastSeenAt - 1)
  ), HostedSessionStoreInvariantError);
  for (const stableChange of [
    { identity: { provider: 'github', subject: '999' } },
    { authorization: 'other' },
    { csrfToken: secret(10) },
    { createdAt: 9_000 },
    { expiresAt: 31_000 }
  ]) {
    await assert.rejects(
      () => store.update(original.sessionId, current, session(
        original.sessionId,
        current.lastSeenAt,
        stableChange
      )),
      HostedSessionStoreInvariantError
    );
  }
  assert.equal((await store.read(original.sessionId))?.authorization, 'authorized');
  assert.equal(transport.calls.filter(([name]) => name === 'eval').at(-1)[3][2], String(30_000 - 12_000));
});

test('Redis stale update cannot resurrect deleted or rotated state', async () => {
  const { clock, transport, setTime } = harness();
  const store = new HostedRedisSessionStore({ namespace: 'private-prod-07', transport, clock });
  const original = session();
  await store.create(original);
  await store.delete(original.sessionId);
  assert.equal(await store.update(original.sessionId, original, session(original.sessionId, 11_000)), null);
  await store.create(original);
  setTime(11_000);
  const replacement = session(secret(8), 11_000, { rotatedAt: 11_000 });
  assert.ok(await store.replace(original.sessionId, original, replacement));
  assert.equal(await store.update(original.sessionId, original, session(original.sessionId, 12_000)), null);
});

test('Redis replacement is atomic: collision and stale preconditions leave both keys unchanged', async () => {
  const { clock, transport, setTime } = harness();
  const store = new HostedRedisSessionStore({ namespace: 'private-prod-08', transport, clock });
  const old = session();
  const occupied = session(secret(8), 12_000, { rotatedAt: 12_000 });
  await store.create(old);
  setTime(12_000);
  await store.create(occupied);
  await assert.rejects(
    () => store.replace(old.sessionId, old, session(occupied.sessionId, 11_000, { rotatedAt: 11_000 })),
    HostedSessionStoreConflictError
  );
  assert.equal((await store.read(old.sessionId))?.lastSeenAt, 10_000);
  assert.equal((await store.read(occupied.sessionId))?.lastSeenAt, 12_000);
  const stale = session(old.sessionId, 10_500);
  assert.equal(await store.replace(old.sessionId, stale, session(secret(9), 11_000, { rotatedAt: 11_000 })), null);
  assert.ok(await store.read(old.sessionId));
});

test('Redis rotation retires old atomically and script failures never mutate state or disclose secrets', async () => {
  const { clock, transport, setTime } = harness();
  const store = new HostedRedisSessionStore({ namespace: 'private-prod-09', transport, clock });
  const old = session();
  const next = session(secret(8), 11_000, { rotatedAt: 11_000 });
  await store.create(old);
  setTime(11_000);
  transport.failEval = true;
  await assert.rejects(() => store.replace(old.sessionId, old, next), (error) => {
    assert.ok(error instanceof HostedRedisStateStoreError);
    assert.equal(error.message.includes(old.sessionId), false);
    assert.equal(error.message.includes(old.csrfToken), false);
    return true;
  });
  assert.ok(await store.read(old.sessionId));
  assert.equal(await store.read(next.sessionId), null);
  transport.failEval = false;
  const rotated = await store.replace(old.sessionId, old, next);
  assert.equal(rotated?.sessionId, next.sessionId);
  assert.equal(await store.read(old.sessionId), null);
  assert.equal((await store.read(next.sessionId))?.expiresAt, old.expiresAt);
});
