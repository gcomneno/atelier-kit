import { createHash } from 'node:crypto';

const NAMESPACE_PATTERN =
  /^[a-z0-9](?:[a-z0-9_-]{1,61}[a-z0-9])?$/;

const ENVELOPE_VERSION = 1;

export class DemoRedisStateConfigurationError
  extends Error {
  constructor() {
    super('Demo Redis state configuration is invalid.');
    this.name =
      'DemoRedisStateConfigurationError';
    this.code =
      'DEMO_REDIS_STATE_CONFIGURATION_INVALID';
  }
}

export class DemoRedisStateStoreError
  extends Error {
  constructor() {
    super('Demo Redis state store failed.');
    this.name =
      'DemoRedisStateStoreError';
    this.code =
      'DEMO_REDIS_STATE_STORE_FAILED';
  }
}

/** @param {unknown} transport */
export function assertDemoRedisStateTransport(
  transport
) {
  if (
    transport === null ||
    typeof transport !== 'object'
  ) {
    throw new DemoRedisStateConfigurationError();
  }

  for (const method of [
    'setIfAbsent',
    'get',
    'del',
    'eval'
  ]) {
    if (
      typeof /** @type {Record<string, unknown>} */ (
        transport
      )[method] !== 'function'
    ) {
      throw new DemoRedisStateConfigurationError();
    }
  }
}

/** @param {unknown} namespace */
export function normalizeDemoRedisNamespace(
  namespace
) {
  if (
    typeof namespace !== 'string' ||
    !NAMESPACE_PATTERN.test(namespace) ||
    namespace.includes('__')
  ) {
    throw new DemoRedisStateConfigurationError();
  }

  return namespace;
}

/** @param {unknown} clock */
export function assertDemoRedisClock(clock) {
  if (typeof clock !== 'function') {
    throw new DemoRedisStateConfigurationError();
  }
}

/** @param {() => number} clock */
export function demoRedisNow(clock) {
  let now;

  try {
    now = clock();
  } catch {
    throw new DemoRedisStateStoreError();
  }

  if (
    !Number.isSafeInteger(now) ||
    now < 0
  ) {
    throw new DemoRedisStateStoreError();
  }

  return now;
}

/**
 * Browser credentials and abuse fingerprints never appear as Redis key
 * material. All opaque input is one-way digested first.
 *
 * @param {string} namespace
 * @param {'session' | 'mutation' | 'issuance'} kind
 * @param {string} opaqueId
 */
export function demoRedisStateKey(
  namespace,
  kind,
  opaqueId
) {
  if (
    ![
      'session',
      'mutation',
      'issuance'
    ].includes(kind) ||
    typeof opaqueId !== 'string' ||
    opaqueId.length === 0
  ) {
    throw new DemoRedisStateConfigurationError();
  }

  const digest =
    createHash('sha256')
      .update(opaqueId, 'utf8')
      .digest('base64url');

  return (
    `atelier:demo-state:v1:` +
    `${namespace}:${kind}:${digest}`
  );
}

/**
 * @param {number} expiresAt
 * @param {number} now
 */
export function demoRedisTtl(
  expiresAt,
  now
) {
  if (
    !Number.isSafeInteger(expiresAt) ||
    !Number.isSafeInteger(now)
  ) {
    throw new DemoRedisStateStoreError();
  }

  const ttl =
    expiresAt - now;

  if (
    !Number.isSafeInteger(ttl) ||
    ttl <= 0
  ) {
    throw new DemoRedisStateStoreError();
  }

  return ttl;
}

/** @param {unknown} record */
export function serializeDemoRedisEnvelope(
  record
) {
  return JSON.stringify({
    v: ENVELOPE_VERSION,
    record
  });
}

/** @param {unknown} value */
export function parseDemoRedisEnvelope(value) {
  if (
    typeof value !== 'string' ||
    value.length === 0 ||
    value.length > 16_384
  ) {
    return null;
  }

  let parsed;

  try {
    parsed = JSON.parse(value);
  } catch {
    return null;
  }

  if (
    !isPlainExactObject(
      parsed,
      ['v', 'record']
    ) ||
    parsed.v !== ENVELOPE_VERSION
  ) {
    return null;
  }

  return parsed.record;
}

/**
 * @param {unknown} value
 * @param {readonly string[]} fields
 */
export function isPlainExactObject(
  value,
  fields
) {
  if (
    value === null ||
    typeof value !== 'object' ||
    Array.isArray(value) ||
    Object.getPrototypeOf(value) !==
      Object.prototype
  ) {
    return false;
  }

  const keys =
    Object.keys(value);

  return (
    keys.length === fields.length &&
    keys.every(
      (key) => fields.includes(key)
    )
  );
}

/** @param {unknown} [error] */
export function demoRedisFailure(
  error = undefined
) {
  if (
    error instanceof
      DemoRedisStateStoreError
  ) {
    return error;
  }

  return new DemoRedisStateStoreError();
}

/** @param {unknown} result */
export function isDemoRedisBoolean(result) {
  return (
    result === true ||
    result === false
  );
}
