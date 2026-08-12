import {
  isCanonicalDemoCsrfToken,
  isCanonicalDemoSessionId
} from './demo-session.js';
import {
  DemoSessionStoreConflictError,
  DemoSessionStoreInvariantError
} from './demo-session-store.js';
import {
  assertDemoRedisClock,
  assertDemoRedisStateTransport,
  DemoRedisStateConfigurationError,
  demoRedisFailure,
  demoRedisNow,
  demoRedisStateKey,
  demoRedisTtl,
  isDemoRedisBoolean,
  isPlainExactObject,
  parseDemoRedisEnvelope,
  serializeDemoRedisEnvelope,
  normalizeDemoRedisNamespace
} from './demo-redis-state.js';

const UPDATE_SCRIPT = `
-- demo-session-update-v1
local current = redis.call('GET', KEYS[1])
if not current then return 0 end
if current ~= ARGV[1] then return 2 end

local okExpected, expected =
  pcall(cjson.decode, ARGV[1])
local okNext, next =
  pcall(cjson.decode, ARGV[2])

if not okExpected or not okNext then
  return 2
end

local e = expected.record
local n = next.record

if not e or not n or
  e.sessionId ~= n.sessionId or
  e.csrfToken ~= n.csrfToken or
  e.createdAt ~= n.createdAt or
  e.expiresAt ~= n.expiresAt or
  n.rotatedAt < e.rotatedAt or
  n.lastSeenAt < e.lastSeenAt or
  n.lastSeenAt < n.rotatedAt then
  return 2
end

redis.call(
  'SET',
  KEYS[1],
  ARGV[2],
  'PX',
  ARGV[3],
  'XX'
)

return 1`;

const REPLACE_SCRIPT = `
-- demo-session-replace-v1
local current = redis.call('GET', KEYS[1])
if not current then return 0 end
if current ~= ARGV[1] then return 2 end

if redis.call('EXISTS', KEYS[2]) ~= 0 then
  return 3
end

local okExpected, expected =
  pcall(cjson.decode, ARGV[1])
local okNext, next =
  pcall(cjson.decode, ARGV[2])

if not okExpected or not okNext then
  return 2
end

local e = expected.record
local n = next.record

if not e or not n or
  e.sessionId == n.sessionId or
  e.csrfToken ~= n.csrfToken or
  e.createdAt ~= n.createdAt or
  e.expiresAt ~= n.expiresAt or
  n.rotatedAt < e.rotatedAt or
  n.lastSeenAt < e.lastSeenAt or
  n.lastSeenAt < n.rotatedAt then
  return 2
end

redis.call(
  'SET',
  KEYS[2],
  ARGV[2],
  'PX',
  ARGV[3],
  'NX'
)
redis.call('DEL', KEYS[1])

return 1`;

/** @param {any} record */
function snapshot(record) {
  return Object.freeze({
    sessionId: record.sessionId,
    csrfToken: record.csrfToken,
    createdAt: record.createdAt,
    rotatedAt: record.rotatedAt,
    expiresAt: record.expiresAt,
    lastSeenAt: record.lastSeenAt
  });
}

/** @param {unknown} value */
function validSession(value) {
  if (
    !isPlainExactObject(
      value,
      [
        'sessionId',
        'csrfToken',
        'createdAt',
        'rotatedAt',
        'expiresAt',
        'lastSeenAt'
      ]
    )
  ) {
    return false;
  }

  const record =
    /** @type {Record<string, any>} */ (
      value
    );

  if (
    !isCanonicalDemoSessionId(
      record.sessionId
    ) ||
    !isCanonicalDemoCsrfToken(
      record.csrfToken
    ) ||
    record.csrfToken ===
      record.sessionId
  ) {
    return false;
  }

  for (const field of [
    'createdAt',
    'rotatedAt',
    'expiresAt',
    'lastSeenAt'
  ]) {
    if (
      !Number.isSafeInteger(
        record[field]
      ) ||
      record[field] < 0
    ) {
      return false;
    }
  }

  return (
    record.createdAt <=
      record.rotatedAt &&
    record.rotatedAt <=
      record.lastSeenAt &&
    record.lastSeenAt <=
      record.expiresAt &&
    record.createdAt <
      record.expiresAt
  );
}

/**
 * @param {any} expected
 * @param {any} next
 * @param {boolean} rotation
 */
function validTransition(
  expected,
  next,
  rotation
) {
  if (
    !validSession(expected) ||
    !validSession(next)
  ) {
    return false;
  }

  if (
    (
      expected.sessionId ===
        next.sessionId
    ) !== !rotation
  ) {
    return false;
  }

  return (
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
      next.rotatedAt
  );
}

export class DemoRedisSessionStore {
  #namespace;
  #transport;
  #clock;

  /**
   * @param {{
   *   namespace: string,
   *   transport: object,
   *   clock?: () => number
   * }} options
   */
  constructor(options) {
    if (
      options === null ||
      typeof options !== 'object' ||
      Array.isArray(options) ||
      Object.getPrototypeOf(options) !==
        Object.prototype ||
      Object.keys(options).some(
        (key) =>
          ![
            'namespace',
            'transport',
            'clock'
          ].includes(key)
      )
    ) {
      throw new DemoRedisStateConfigurationError();
    }

    const {
      namespace,
      transport,
      clock = Date.now
    } = options;

    this.#namespace =
      normalizeDemoRedisNamespace(
        namespace
      );

    assertDemoRedisStateTransport(
      transport
    );
    assertDemoRedisClock(clock);

    this.#transport = transport;
    this.#clock = clock;
  }

  /** @param {string} sessionId */
  keyFor(sessionId) {
    return demoRedisStateKey(
      this.#namespace,
      'session',
      sessionId
    );
  }

  /** @param {any} record */
  async create(record) {
    if (!validSession(record)) {
      throw new DemoSessionStoreInvariantError(
        'Demo session record is invalid.'
      );
    }

    const canonical =
      snapshot(record);

    const now =
      demoRedisNow(this.#clock);

    if (
      canonical.createdAt > now ||
      canonical.rotatedAt > now ||
      canonical.lastSeenAt > now
    ) {
      throw new DemoSessionStoreInvariantError(
        'Demo session record is invalid.'
      );
    }

    const ttl =
      demoRedisTtl(
        canonical.expiresAt,
        now
      );

    let created;

    try {
      created =
        await /** @type {any} */ (
          this.#transport
        ).setIfAbsent(
          this.keyFor(
            canonical.sessionId
          ),
          serializeDemoRedisEnvelope(
            canonical
          ),
          ttl
        );
    } catch (error) {
      throw demoRedisFailure(error);
    }

    if (!isDemoRedisBoolean(created)) {
      throw demoRedisFailure();
    }

    if (!created) {
      throw new DemoSessionStoreConflictError();
    }

    return snapshot(canonical);
  }

  /** @param {string} sessionId */
  async read(sessionId) {
    if (
      !isCanonicalDemoSessionId(
        sessionId
      )
    ) {
      return null;
    }

    let value;

    try {
      value =
        await /** @type {any} */ (
          this.#transport
        ).get(
          this.keyFor(sessionId)
        );
    } catch (error) {
      throw demoRedisFailure(error);
    }

    const record =
      parseDemoRedisEnvelope(value);

    if (
      !validSession(record) ||
      record.sessionId !== sessionId
    ) {
      return null;
    }

    const now =
      demoRedisNow(this.#clock);

    if (
      record.createdAt > now ||
      record.rotatedAt > now ||
      record.lastSeenAt > now ||
      now >= record.expiresAt
    ) {
      return null;
    }

    return snapshot(record);
  }

  /**
   * @param {string} sessionId
   * @param {any} expected
   * @param {any} record
   */
  async update(
    sessionId,
    expected,
    record
  ) {
    if (
      !isCanonicalDemoSessionId(
        sessionId
      ) ||
      expected?.sessionId !==
        sessionId ||
      record?.sessionId !==
        sessionId
    ) {
      return null;
    }

    if (
      !validTransition(
        expected,
        record,
        false
      )
    ) {
      throw new DemoSessionStoreInvariantError(
        'Demo session update violates lifecycle invariants.'
      );
    }

    const now =
      demoRedisNow(this.#clock);

    if (
      now >= record.expiresAt ||
      record.createdAt > now ||
      record.rotatedAt > now ||
      record.lastSeenAt > now
    ) {
      return null;
    }

    const ttl =
      demoRedisTtl(
        record.expiresAt,
        now
      );

    const expectedPayload =
      serializeDemoRedisEnvelope(
        snapshot(expected)
      );

    const nextPayload =
      serializeDemoRedisEnvelope(
        snapshot(record)
      );

    const result =
      await this.#eval(
        UPDATE_SCRIPT,
        [
          this.keyFor(sessionId)
        ],
        [
          expectedPayload,
          nextPayload,
          String(ttl)
        ]
      );

    if (result === 1) {
      return snapshot(record);
    }

    if (
      result === 0 ||
      result === 2
    ) {
      return null;
    }

    throw demoRedisFailure();
  }

  /**
   * @param {string} oldSessionId
   * @param {any} expected
   * @param {any} record
   */
  async replace(
    oldSessionId,
    expected,
    record
  ) {
    if (
      !isCanonicalDemoSessionId(
        oldSessionId
      ) ||
      expected?.sessionId !==
        oldSessionId ||
      !isCanonicalDemoSessionId(
        record?.sessionId
      )
    ) {
      return null;
    }

    if (
      !validTransition(
        expected,
        record,
        true
      )
    ) {
      throw new DemoSessionStoreInvariantError(
        'Demo session rotation violates lifecycle invariants.'
      );
    }

    const now =
      demoRedisNow(this.#clock);

    if (
      now >= record.expiresAt ||
      record.createdAt > now ||
      record.rotatedAt > now ||
      record.lastSeenAt > now
    ) {
      return null;
    }

    const ttl =
      demoRedisTtl(
        record.expiresAt,
        now
      );

    const expectedPayload =
      serializeDemoRedisEnvelope(
        snapshot(expected)
      );

    const nextPayload =
      serializeDemoRedisEnvelope(
        snapshot(record)
      );

    const result =
      await this.#eval(
        REPLACE_SCRIPT,
        [
          this.keyFor(oldSessionId),
          this.keyFor(
            record.sessionId
          )
        ],
        [
          expectedPayload,
          nextPayload,
          String(ttl)
        ]
      );

    if (result === 1) {
      return snapshot(record);
    }

    if (result === 3) {
      throw new DemoSessionStoreConflictError();
    }

    if (
      result === 0 ||
      result === 2
    ) {
      return null;
    }

    throw demoRedisFailure();
  }

  /** @param {string} sessionId */
  async delete(sessionId) {
    if (
      !isCanonicalDemoSessionId(
        sessionId
      )
    ) {
      return false;
    }

    try {
      const deleted =
        await /** @type {any} */ (
          this.#transport
        ).del(
          this.keyFor(sessionId)
        );

      if (
        !isDemoRedisBoolean(
          deleted
        )
      ) {
        throw demoRedisFailure();
      }

      return deleted;
    } catch (error) {
      throw demoRedisFailure(error);
    }
  }

  /**
   * @param {string} script
   * @param {string[]} keys
   * @param {string[]} args
   */
  async #eval(
    script,
    keys,
    args
  ) {
    try {
      const result =
        await /** @type {any} */ (
          this.#transport
        ).eval(
          script,
          keys,
          args
        );

      if (
        ![0, 1, 2, 3].includes(
          result
        )
      ) {
        throw demoRedisFailure();
      }

      return result;
    } catch (error) {
      throw demoRedisFailure(error);
    }
  }
}
