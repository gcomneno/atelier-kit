import {
  isCanonicalHostedOAuthSecret,
  normalizeHostedOAuthReturnTo
} from './hosted-github-oauth.js';
import {
  HostedOAuthTransactionStoreConflictError
} from './hosted-oauth-transaction-store.js';
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

/** @param {any} record */
function snapshot(record) {
  return Object.freeze({
    state: record.state,
    pkceVerifier: record.pkceVerifier,
    returnTo: record.returnTo,
    createdAt: record.createdAt,
    expiresAt: record.expiresAt
  });
}

/** @param {unknown} value */
function validTransaction(value) {
  if (!isPlainExactObject(value, [
    'state', 'pkceVerifier', 'returnTo', 'createdAt', 'expiresAt'
  ])) {
    return false;
  }

  const record = /** @type {Record<string, unknown>} */ (value);
  const createdAt = record.createdAt;
  const expiresAt = record.expiresAt;
  if (
    !isCanonicalHostedOAuthSecret(record.state) ||
    !isCanonicalHostedOAuthSecret(record.pkceVerifier) ||
    typeof createdAt !== 'number' || !Number.isSafeInteger(createdAt) || createdAt < 0 ||
    typeof expiresAt !== 'number' || !Number.isSafeInteger(expiresAt) || expiresAt <= createdAt
  ) {
    return false;
  }

  try {
    return normalizeHostedOAuthReturnTo(record.returnTo) === record.returnTo;
  } catch {
    return false;
  }
}

/**
 * Redis-backed, one-time Hosted OAuth transaction store.  The injected
 * transport has no ability to enumerate Redis or accept arbitrary commands.
 */
export class HostedRedisOAuthTransactionStore {
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

  /** @param {string} state */
  keyFor(state) {
    return hostedRedisStateKey(this.#namespace, 'oauth', state);
  }

  /** @param {any} record */
  async create(record) {
    if (!validTransaction(record)) {
      throw hostedRedisFailure();
    }

    const canonical = snapshot(record);
    const ttl = hostedRedisTtl(canonical.expiresAt, hostedRedisNow(this.#clock));
    const key = this.keyFor(canonical.state);
    let created;

    try {
      created = await /** @type {any} */ (this.#transport).setIfAbsent(
        key,
        serializeHostedRedisEnvelope(canonical),
        ttl
      );
    } catch (error) {
      throw hostedRedisFailure(error);
    }

    if (!isRedisBoolean(created)) {
      throw hostedRedisFailure();
    }
    if (!created) {
      throw new HostedOAuthTransactionStoreConflictError();
    }

    return snapshot(canonical);
  }

  /** @param {string} state */
  async read(state) {
    if (!isCanonicalHostedOAuthSecret(state)) return null;
    const key = this.keyFor(state);
    let value;
    try {
      value = await /** @type {any} */ (this.#transport).get(key);
    } catch (error) {
      throw hostedRedisFailure(error);
    }

    return this.#decodeActive(value, state);
  }

  /** @param {string} state */
  async consume(state) {
    if (!isCanonicalHostedOAuthSecret(state)) return null;
    const key = this.keyFor(state);
    let value;
    try {
      value = await /** @type {any} */ (this.#transport).getDel(key);
    } catch (error) {
      throw hostedRedisFailure(error);
    }

    return this.#decodeActive(value, state);
  }

  /** @param {string} state */
  async delete(state) {
    if (!isCanonicalHostedOAuthSecret(state)) return false;
    try {
      const deleted = await /** @type {any} */ (this.#transport).del(this.keyFor(state));
      if (!isRedisBoolean(deleted)) throw hostedRedisFailure();
      return deleted;
    } catch (error) {
      throw hostedRedisFailure(error);
    }
  }

  /** @param {unknown} value @param {string} expectedState */
  #decodeActive(value, expectedState) {
    const record = parseHostedRedisEnvelope(value);
    if (!validTransaction(record) || record.state !== expectedState) return null;

    const now = hostedRedisNow(this.#clock);
    if (now >= record.expiresAt || now < record.createdAt) return null;
    return snapshot(record);
  }
}
