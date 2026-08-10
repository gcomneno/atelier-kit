import {
  HostedSessionStoreConflictError,
  HostedSessionStoreInvariantError
} from './hosted-session-store.js';
import {
  assertHostedRedisClock,
  assertHostedRedisStateTransport,
  HostedRedisStateConfigurationError,
  hostedRedisFailure,
  hostedRedisNow,
  hostedRedisStateKey,
  hostedRedisTtl,
  isPlainExactObject,
  isRedisBoolean,
  normalizeHostedRedisNamespace,
  parseHostedRedisEnvelope,
  serializeHostedRedisEnvelope
} from './hosted-redis-state.js';

const SESSION_ID_PATTERN = /^[A-Za-z0-9_-]{43}$/;
const GITHUB_SUBJECT_PATTERN = /^[1-9][0-9]*$/;

// These scripts intentionally receive only explicit keys and arguments. Their
// return values are a small, adapter-owned protocol: 1 changed, 0 missing,
// 2 stale/malformed precondition, 3 replacement-key collision.
const UPDATE_SCRIPT = `
-- hosted-session-update-v1
local current = redis.call('GET', KEYS[1])
if not current then return 0 end
if current ~= ARGV[1] then return 2 end
local okExpected, expected = pcall(cjson.decode, ARGV[1])
local okNext, next = pcall(cjson.decode, ARGV[2])
if not okExpected or not okNext then return 2 end
local e = expected.record
local n = next.record
if not e or not n or e.sessionId ~= n.sessionId or
  e.authorization ~= n.authorization or e.csrfToken ~= n.csrfToken or
  e.createdAt ~= n.createdAt or e.expiresAt ~= n.expiresAt or
  not e.identity or not n.identity or
  e.identity.provider ~= n.identity.provider or e.identity.subject ~= n.identity.subject or
  n.rotatedAt < e.rotatedAt or n.lastSeenAt < e.lastSeenAt or
  n.lastSeenAt < n.rotatedAt then return 2 end
redis.call('SET', KEYS[1], ARGV[2], 'PX', ARGV[3], 'XX')
return 1`;

const REPLACE_SCRIPT = `
-- hosted-session-replace-v1
local current = redis.call('GET', KEYS[1])
if not current then return 0 end
if current ~= ARGV[1] then return 2 end
if redis.call('EXISTS', KEYS[2]) ~= 0 then return 3 end
local okExpected, expected = pcall(cjson.decode, ARGV[1])
local okNext, next = pcall(cjson.decode, ARGV[2])
if not okExpected or not okNext then return 2 end
local e = expected.record
local n = next.record
if not e or not n or e.sessionId == n.sessionId or
  e.authorization ~= n.authorization or e.csrfToken ~= n.csrfToken or
  e.createdAt ~= n.createdAt or e.expiresAt ~= n.expiresAt or
  not e.identity or not n.identity or
  e.identity.provider ~= n.identity.provider or e.identity.subject ~= n.identity.subject or
  n.rotatedAt < e.rotatedAt or n.lastSeenAt < e.lastSeenAt or
  n.lastSeenAt < n.rotatedAt then return 2 end
redis.call('SET', KEYS[2], ARGV[2], 'PX', ARGV[3], 'NX')
redis.call('DEL', KEYS[1])
return 1`;

/** @param {unknown} value */
function canonicalSessionId(value) {
  if (typeof value !== 'string' || !SESSION_ID_PATTERN.test(value)) return false;
  try {
    const decoded = Buffer.from(value, 'base64url');
    return decoded.length === 32 && decoded.toString('base64url') === value;
  } catch {
    return false;
  }
}

/** @param {any} record */
function snapshot(record) {
  return Object.freeze({
    sessionId: record.sessionId,
    identity: Object.freeze({ provider: record.identity.provider, subject: record.identity.subject }),
    authorization: record.authorization,
    csrfToken: record.csrfToken,
    createdAt: record.createdAt,
    rotatedAt: record.rotatedAt,
    expiresAt: record.expiresAt,
    lastSeenAt: record.lastSeenAt
  });
}

/** @param {unknown} value */
function validSession(value) {
  if (!isPlainExactObject(value, [
    'sessionId', 'identity', 'authorization', 'csrfToken', 'createdAt',
    'rotatedAt', 'expiresAt', 'lastSeenAt'
  ])) return false;
  const record = /** @type {Record<string, any>} */ (value);
  if (!isPlainExactObject(record.identity, ['provider', 'subject'])) return false;
  if (
    !canonicalSessionId(record.sessionId) ||
    record.identity.provider !== 'github' ||
    typeof record.identity.subject !== 'string' || !GITHUB_SUBJECT_PATTERN.test(record.identity.subject) ||
    record.authorization !== 'authorized' ||
    !canonicalSessionId(record.csrfToken) || record.csrfToken === record.sessionId
  ) return false;

  for (const field of ['createdAt', 'rotatedAt', 'expiresAt', 'lastSeenAt']) {
    if (!Number.isSafeInteger(record[field]) || record[field] < 0) return false;
  }
  return record.createdAt <= record.rotatedAt &&
    record.rotatedAt <= record.lastSeenAt &&
    record.lastSeenAt <= record.expiresAt &&
    record.createdAt < record.expiresAt;
}

/** @param {any} expected @param {any} next @param {boolean} rotation */
function validTransition(expected, next, rotation) {
  if (!validSession(expected) || !validSession(next)) return false;
  if ((expected.sessionId === next.sessionId) !== !rotation) return false;
  return expected.identity.provider === next.identity.provider &&
    expected.identity.subject === next.identity.subject &&
    expected.authorization === next.authorization &&
    expected.csrfToken === next.csrfToken &&
    expected.createdAt === next.createdAt &&
    expected.expiresAt === next.expiresAt &&
    next.rotatedAt >= expected.rotatedAt &&
    next.lastSeenAt >= expected.lastSeenAt;
}

/** Redis persistence adapter for opaque Hosted session records. */
export class HostedRedisSessionStore {
  #namespace;
  #transport;
  #clock;

  /** @param {{ namespace: string, transport: object, clock?: () => number }} options */
  constructor(options) {
    if (
      options === null || typeof options !== 'object' || Array.isArray(options) ||
      Object.getPrototypeOf(options) !== Object.prototype ||
      Object.keys(options).some((key) => !['namespace', 'transport', 'clock'].includes(key))
    ) {
      throw new HostedRedisStateConfigurationError();
    }
    const { namespace, transport, clock = Date.now } = options;
    this.#namespace = normalizeHostedRedisNamespace(namespace);
    assertHostedRedisStateTransport(transport);
    assertHostedRedisClock(clock);
    this.#transport = transport;
    this.#clock = clock;
  }

  /** @param {string} sessionId */
  keyFor(sessionId) {
    return hostedRedisStateKey(this.#namespace, 'session', sessionId);
  }

  /** @param {any} record */
  async create(record) {
    if (!validSession(record)) throw new HostedSessionStoreInvariantError('Hosted session record is invalid.');
    const canonical = snapshot(record);
    const now = hostedRedisNow(this.#clock);
    if (canonical.createdAt > now || canonical.rotatedAt > now || canonical.lastSeenAt > now) {
      throw new HostedSessionStoreInvariantError('Hosted session record is invalid.');
    }
    const ttl = hostedRedisTtl(canonical.expiresAt, now);
    let created;
    try {
      created = await /** @type {any} */ (this.#transport).setIfAbsent(
        this.keyFor(canonical.sessionId), serializeHostedRedisEnvelope(canonical), ttl
      );
    } catch (error) {
      throw hostedRedisFailure(error);
    }
    if (!isRedisBoolean(created)) throw hostedRedisFailure();
    if (!created) throw new HostedSessionStoreConflictError();
    return snapshot(canonical);
  }

  /** @param {string} sessionId */
  async read(sessionId) {
    if (!canonicalSessionId(sessionId)) return null;
    let value;
    try {
      value = await /** @type {any} */ (this.#transport).get(this.keyFor(sessionId));
    } catch (error) {
      throw hostedRedisFailure(error);
    }
    const record = parseHostedRedisEnvelope(value);
    if (!validSession(record) || record.sessionId !== sessionId) return null;
    const now = hostedRedisNow(this.#clock);
    if (record.createdAt > now || record.rotatedAt > now || record.lastSeenAt > now || now >= record.expiresAt) return null;
    return snapshot(record);
  }

  /** @param {string} sessionId @param {any} expected @param {any} record */
  async update(sessionId, expected, record) {
    if (!canonicalSessionId(sessionId) || expected?.sessionId !== sessionId || record?.sessionId !== sessionId) return null;
    if (!validTransition(expected, record, false)) throw new HostedSessionStoreInvariantError('Hosted session update violates lifecycle invariants.');
    const now = hostedRedisNow(this.#clock);
    if (now >= record.expiresAt || record.createdAt > now || record.rotatedAt > now || record.lastSeenAt > now) return null;
    const ttl = hostedRedisTtl(record.expiresAt, now);
    const expectedPayload = serializeHostedRedisEnvelope(snapshot(expected));
    const nextPayload = serializeHostedRedisEnvelope(snapshot(record));
    const result = await this.#eval(UPDATE_SCRIPT, [this.keyFor(sessionId)], [expectedPayload, nextPayload, String(ttl)]);
    if (result === 1) return snapshot(record);
    if (result === 0 || result === 2) return null;
    throw hostedRedisFailure();
  }

  /** @param {string} oldSessionId @param {any} expected @param {any} record */
  async replace(oldSessionId, expected, record) {
    if (!canonicalSessionId(oldSessionId) || expected?.sessionId !== oldSessionId || !canonicalSessionId(record?.sessionId)) return null;
    if (!validTransition(expected, record, true)) throw new HostedSessionStoreInvariantError('Hosted session rotation violates lifecycle invariants.');
    const now = hostedRedisNow(this.#clock);
    if (now >= record.expiresAt || record.createdAt > now || record.rotatedAt > now || record.lastSeenAt > now) return null;
    const ttl = hostedRedisTtl(record.expiresAt, now);
    const expectedPayload = serializeHostedRedisEnvelope(snapshot(expected));
    const nextPayload = serializeHostedRedisEnvelope(snapshot(record));
    const result = await this.#eval(REPLACE_SCRIPT, [this.keyFor(oldSessionId), this.keyFor(record.sessionId)], [expectedPayload, nextPayload, String(ttl)]);
    if (result === 1) return snapshot(record);
    if (result === 3) throw new HostedSessionStoreConflictError();
    if (result === 0 || result === 2) return null;
    throw hostedRedisFailure();
  }

  /** @param {string} sessionId */
  async delete(sessionId) {
    if (!canonicalSessionId(sessionId)) return false;
    try {
      const deleted = await /** @type {any} */ (this.#transport).del(this.keyFor(sessionId));
      if (!isRedisBoolean(deleted)) throw hostedRedisFailure();
      return deleted;
    } catch (error) {
      throw hostedRedisFailure(error);
    }
  }

  /** @param {string} script @param {string[]} keys @param {string[]} args */
  async #eval(script, keys, args) {
    try {
      const result = await /** @type {any} */ (this.#transport).eval(script, keys, args);
      if (![0, 1, 2, 3].includes(result)) throw hostedRedisFailure();
      return result;
    } catch (error) {
      throw hostedRedisFailure(error);
    }
  }
}
