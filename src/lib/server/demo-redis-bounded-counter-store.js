import {
  assertDemoRedisClock,
  assertDemoRedisStateTransport,
  DemoRedisStateConfigurationError,
  demoRedisFailure,
  demoRedisNow,
  demoRedisStateKey,
  demoRedisTtl,
  normalizeDemoRedisNamespace
} from './demo-redis-state.js';

const COUNTER_SCRIPT = `
-- demo-bounded-counter-consume-v1
local current = redis.call('GET', KEYS[1])
local used = 0

if current then
  used = tonumber(current)
  if not used or used < 0 then
    return 1000000
  end
end

local limit = tonumber(ARGV[1])
local ttl = tonumber(ARGV[2])

if not limit or
  not ttl or
  limit <= 0 or
  ttl <= 0 then
  return 1000000
end

if used >= limit then
  return limit + 1
end

used = used + 1

redis.call(
  'SET',
  KEYS[1],
  tostring(used),
  'PX',
  ttl
)

return used`;

/** @param {unknown} value */
function canonicalCounterKey(value) {
  if (
    typeof value !== 'string' ||
    !/^[A-Za-z0-9_-]{43}$/.test(
      value
    )
  ) {
    return false;
  }

  try {
    const bytes =
      Buffer.from(
        value,
        'base64url'
      );

    return (
      bytes.length === 32 &&
      bytes.toString(
        'base64url'
      ) === value
    );
  } catch {
    return false;
  }
}

export class DemoRedisBoundedCounterStore {
  #namespace;
  #kind;
  #transport;
  #clock;

  /**
   * @param {{
   *   namespace: string,
   *   kind: 'mutation' | 'issuance',
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
            'kind',
            'transport',
            'clock'
          ].includes(key)
      )
    ) {
      throw new DemoRedisStateConfigurationError();
    }

    const {
      namespace,
      kind,
      transport,
      clock = Date.now
    } = options;

    if (
      kind !== 'mutation' &&
      kind !== 'issuance'
    ) {
      throw new DemoRedisStateConfigurationError();
    }

    this.#namespace =
      normalizeDemoRedisNamespace(
        namespace
      );

    this.#kind = kind;

    assertDemoRedisStateTransport(
      transport
    );
    assertDemoRedisClock(clock);

    this.#transport = transport;
    this.#clock = clock;
  }

  /** @param {string} key */
  keyFor(key) {
    return demoRedisStateKey(
      this.#namespace,
      this.#kind,
      key
    );
  }

  /**
   * Atomic bounded consume contract.
   *
   * This intentionally matches DemoMutationGuard's store boundary.
   *
   * @param {{
   *   key: unknown,
   *   limit: unknown,
   *   expiresAt: unknown
   * }} request
   */
  async consume(request) {
    if (
      request === null ||
      typeof request !== 'object'
    ) {
      throw demoRedisFailure();
    }

    const {
      key,
      limit,
      expiresAt
    } =
      /** @type {Record<string, unknown>} */ (
        request
      );

    if (
      !canonicalCounterKey(key) ||
      !Number.isSafeInteger(limit) ||
      /** @type {number} */ (
        limit
      ) <= 0 ||
      /** @type {number} */ (
        limit
      ) >= 999_999 ||
      !Number.isSafeInteger(
        expiresAt
      )
    ) {
      throw demoRedisFailure();
    }

    const now =
      demoRedisNow(this.#clock);

    const ttl =
      demoRedisTtl(
        /** @type {number} */ (
          expiresAt
        ),
        now
      );

    let used;

    try {
      used =
        await /** @type {any} */ (
          this.#transport
        ).eval(
          COUNTER_SCRIPT,
          [
            this.keyFor(
              /** @type {string} */ (
                key
              )
            )
          ],
          [
            String(limit),
            String(ttl)
          ]
        );
    } catch (error) {
      throw demoRedisFailure(error);
    }

    if (
      !Number.isSafeInteger(used) ||
      used < 1 ||
      used >= 1_000_000
    ) {
      throw demoRedisFailure();
    }

    const canonicalLimit =
      /** @type {number} */ (
        limit
      );

    if (
      used === canonicalLimit + 1
    ) {
      return Object.freeze({
        allowed: false,
        used: canonicalLimit,
        remaining: 0
      });
    }

    if (
      used > canonicalLimit
    ) {
      throw demoRedisFailure();
    }

    return Object.freeze({
      allowed: true,
      used,
      remaining:
        canonicalLimit - used
    });
  }
}
