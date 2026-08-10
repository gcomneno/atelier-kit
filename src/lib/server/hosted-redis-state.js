import { createHash } from 'node:crypto';

const NAMESPACE_PATTERN = /^[a-z0-9](?:[a-z0-9_-]{1,61}[a-z0-9])?$/;
const ENVELOPE_VERSION = 1;

export class HostedRedisStateConfigurationError extends Error {
  constructor() {
    super('Hosted Redis state configuration is invalid.');
    this.name = 'HostedRedisStateConfigurationError';
    this.code = 'HOSTED_REDIS_STATE_CONFIGURATION_INVALID';
  }
}

/** A deliberately non-diagnostic failure for an unavailable state service. */
export class HostedRedisStateStoreError extends Error {
  constructor() {
    super('Hosted Redis state store failed.');
    this.name = 'HostedRedisStateStoreError';
    this.code = 'HOSTED_REDIS_STATE_STORE_FAILED';
  }
}

/**
 * The adapter boundary is intentionally smaller than a Redis client.  In
 * particular, stores cannot issue scans, arbitrary commands, or diagnostics
 * containing keys/values.
 *
 * @param {unknown} transport
 */
export function assertHostedRedisStateTransport(transport) {
  if (transport === null || typeof transport !== 'object') {
    throw new HostedRedisStateConfigurationError();
  }

  for (const method of ['setIfAbsent', 'get', 'getDel', 'del', 'eval']) {
    if (typeof /** @type {Record<string, unknown>} */ (transport)[method] !== 'function') {
      throw new HostedRedisStateConfigurationError();
    }
  }
}

/** @param {unknown} namespace */
export function normalizeHostedRedisNamespace(namespace) {
  if (
    typeof namespace !== 'string' ||
    !NAMESPACE_PATTERN.test(namespace) ||
    namespace.includes('__')
  ) {
    throw new HostedRedisStateConfigurationError();
  }

  return namespace;
}

/** @param {unknown} clock */
export function assertHostedRedisClock(clock) {
  if (typeof clock !== 'function') {
    throw new HostedRedisStateConfigurationError();
  }
}

/** @param {() => number} clock */
export function hostedRedisNow(clock) {
  let now;

  try {
    now = clock();
  } catch {
    throw new HostedRedisStateStoreError();
  }

  if (!Number.isSafeInteger(now) || now < 0) {
    throw new HostedRedisStateStoreError();
  }

  return now;
}

/**
 * Redis key suffixes use a one-way digest.  This prevents opaque browser
 * credentials from becoming key material that an adapter might report.
 *
 * @param {string} namespace
 * @param {'oauth' | 'session'} kind
 * @param {string} opaqueId
 */
export function hostedRedisStateKey(namespace, kind, opaqueId) {
  const digest = createHash('sha256').update(opaqueId, 'utf8').digest('base64url');

  return `atelier:hosted-state:v1:${namespace}:${kind}:${digest}`;
}

/** @param {number} expiresAt @param {number} now */
export function hostedRedisTtl(expiresAt, now) {
  if (!Number.isSafeInteger(expiresAt) || !Number.isSafeInteger(now)) {
    throw new HostedRedisStateStoreError();
  }

  const ttl = expiresAt - now;

  if (!Number.isSafeInteger(ttl) || ttl <= 0) {
    throw new HostedRedisStateStoreError();
  }

  return ttl;
}

/** @param {unknown} record */
export function serializeHostedRedisEnvelope(record) {
  return JSON.stringify({ v: ENVELOPE_VERSION, record });
}

/**
 * Parses only JSON objects with exactly the envelope fields we own.  JSON
 * parsing creates ordinary data, and later validators accept only own plain
 * fields before it can become authority.
 *
 * @param {unknown} value
 */
export function parseHostedRedisEnvelope(value) {
  if (typeof value !== 'string' || value.length === 0 || value.length > 16_384) {
    return null;
  }

  let parsed;
  try {
    parsed = JSON.parse(value);
  } catch {
    return null;
  }

  if (!isPlainExactObject(parsed, ['v', 'record']) || parsed.v !== ENVELOPE_VERSION) {
    return null;
  }

  return parsed.record;
}

/** @param {unknown} value @param {readonly string[]} fields */
export function isPlainExactObject(value, fields) {
  if (
    value === null ||
    typeof value !== 'object' ||
    Array.isArray(value) ||
    Object.getPrototypeOf(value) !== Object.prototype
  ) {
    return false;
  }

  const keys = Object.keys(value);
  return keys.length === fields.length &&
    keys.every((key) => fields.includes(key));
}

/** @param {unknown} [error] */
export function hostedRedisFailure(error = undefined) {
  if (error instanceof HostedRedisStateStoreError) {
    return error;
  }

  return new HostedRedisStateStoreError();
}

/** @param {unknown} result */
export function isRedisBoolean(result) {
  return result === true || result === false;
}
