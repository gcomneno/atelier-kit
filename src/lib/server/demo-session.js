import { randomBytes } from 'node:crypto';
import {
  DemoSessionStoreConflictError
} from './demo-session-store.js';

const SECRET_BYTES = 32;
const SECRET_LENGTH = 43;
const SECRET_PATTERN = /^[A-Za-z0-9_-]{43}$/;
const MAX_ID_ALLOCATION_ATTEMPTS = 4;

export const DEFAULT_DEMO_SESSION_POLICY = Object.freeze({
  absoluteLifetimeMs: 30 * 60 * 1000,
  idleTimeoutMs: 10 * 60 * 1000,
  rotationAgeMs: 5 * 60 * 1000
});

const POLICY_FIELDS = new Set([
  'absoluteLifetimeMs',
  'idleTimeoutMs',
  'rotationAgeMs'
]);

export class DemoSessionConfigurationError extends Error {
  /** @param {string} message */
  constructor(message) {
    super(message);
    this.name = 'DemoSessionConfigurationError';
    this.code = 'DEMO_SESSION_CONFIGURATION_INVALID';
  }
}

export class DemoSessionLifecycleError extends Error {
  /** @param {string} message */
  constructor(message) {
    super(message);
    this.name = 'DemoSessionLifecycleError';
    this.code = 'DEMO_SESSION_LIFECYCLE_ERROR';
  }
}

function generateSecret() {
  return randomBytes(SECRET_BYTES).toString('base64url');
}

export function generateDemoSessionId() {
  return generateSecret();
}

export function generateDemoCsrfToken() {
  return generateSecret();
}

/**
 * @param {unknown} value
 * @returns {value is string}
 */
function isCanonicalSecret(value) {
  if (
    typeof value !== 'string' ||
    value.length !== SECRET_LENGTH ||
    !SECRET_PATTERN.test(value)
  ) {
    return false;
  }

  try {
    const decoded = Buffer.from(value, 'base64url');
    return (
      decoded.length === SECRET_BYTES &&
      decoded.toString('base64url') === value
    );
  } catch {
    return false;
  }
}

/**
 * @param {unknown} value
 * @returns {value is string}
 */
export function isCanonicalDemoSessionId(value) {
  return isCanonicalSecret(value);
}

/**
 * @param {unknown} value
 * @returns {value is string}
 */
export function isCanonicalDemoCsrfToken(value) {
  return isCanonicalSecret(value);
}

/**
 * @param {unknown} value
 * @param {number} fallback
 */
function normalizeDuration(value, fallback) {
  const duration = value === undefined
    ? fallback
    : value;

  if (
    typeof duration !== 'number' ||
    !Number.isSafeInteger(duration) ||
    duration <= 0
  ) {
    throw new DemoSessionConfigurationError(
      'Demo session policy durations must be positive finite integers.'
    );
  }

  return duration;
}

/**
 * @param {unknown} input
 */
export function normalizeDemoSessionPolicy(input = {}) {
  if (
    input === null ||
    typeof input !== 'object' ||
    Array.isArray(input)
  ) {
    throw new DemoSessionConfigurationError(
      'Demo session policy must be an object.'
    );
  }

  const record = /** @type {Record<string, unknown>} */ (input);

  for (const field of Object.keys(record)) {
    if (!POLICY_FIELDS.has(field)) {
      throw new DemoSessionConfigurationError(
        'Demo session policy contains unsupported fields.'
      );
    }
  }

  const policy = {
    absoluteLifetimeMs: normalizeDuration(
      record.absoluteLifetimeMs,
      DEFAULT_DEMO_SESSION_POLICY.absoluteLifetimeMs
    ),
    idleTimeoutMs: normalizeDuration(
      record.idleTimeoutMs,
      DEFAULT_DEMO_SESSION_POLICY.idleTimeoutMs
    ),
    rotationAgeMs: normalizeDuration(
      record.rotationAgeMs,
      DEFAULT_DEMO_SESSION_POLICY.rotationAgeMs
    )
  };

  if (
    policy.idleTimeoutMs > policy.absoluteLifetimeMs ||
    policy.rotationAgeMs >= policy.absoluteLifetimeMs
  ) {
    throw new DemoSessionConfigurationError(
      'Demo session policy contains inconsistent durations.'
    );
  }

  return Object.freeze(policy);
}

/**
 * @param {unknown} store
 */
function assertStore(store) {
  if (
    store === null ||
    typeof store !== 'object'
  ) {
    throw new DemoSessionConfigurationError(
      'Demo session store is required.'
    );
  }

  for (const method of [
    'read',
    'create',
    'update',
    'replace',
    'delete'
  ]) {
    if (
      typeof /** @type {Record<string, unknown>} */ (
        store
      )[method] !== 'function'
    ) {
      throw new DemoSessionConfigurationError(
        'Demo session store does not implement the required boundary.'
      );
    }
  }
}

/**
 * @param {any} record
 */
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

/**
 * @param {any} session
 * @param {boolean} rotationDue
 */
function resolution(session, rotationDue) {
  return Object.freeze({
    session,
    rotationDue
  });
}

export class DemoSessionLifecycle {
  #store;
  #clock;
  #sessionIdGenerator;
  #csrfTokenGenerator;
  #policy;

  /**
   * @param {{
   *   store: any,
   *   clock?: () => number,
   *   sessionIdGenerator?: () => string,
   *   csrfTokenGenerator?: () => string,
   *   policy?: unknown
   * }} options
   */
  constructor({
    store,
    clock = Date.now,
    sessionIdGenerator = generateDemoSessionId,
    csrfTokenGenerator = generateDemoCsrfToken,
    policy = {}
  }) {
    assertStore(store);

    if (
      typeof clock !== 'function' ||
      typeof sessionIdGenerator !== 'function' ||
      typeof csrfTokenGenerator !== 'function'
    ) {
      throw new DemoSessionConfigurationError(
        'Demo session lifecycle dependencies must be callable.'
      );
    }

    this.#store = store;
    this.#clock = clock;
    this.#sessionIdGenerator = sessionIdGenerator;
    this.#csrfTokenGenerator = csrfTokenGenerator;
    this.#policy = normalizeDemoSessionPolicy(policy);
  }

  get policy() {
    return this.#policy;
  }

  #now() {
    const now = this.#clock();

    if (
      !Number.isSafeInteger(now) ||
      now < 0
    ) {
      throw new DemoSessionLifecycleError(
        'Demo session clock produced an invalid timestamp.'
      );
    }

    return now;
  }

  #nextSessionId() {
    let value;

    try {
      value = this.#sessionIdGenerator();
    } catch {
      throw new DemoSessionLifecycleError(
        'Demo session identifier generation failed.'
      );
    }

    if (!isCanonicalDemoSessionId(value)) {
      throw new DemoSessionLifecycleError(
        'Demo session identifier generation failed.'
      );
    }

    return value;
  }

  #nextCsrfToken() {
    let value;

    try {
      value = this.#csrfTokenGenerator();
    } catch {
      throw new DemoSessionLifecycleError(
        'Demo CSRF token generation failed.'
      );
    }

    if (!isCanonicalDemoCsrfToken(value)) {
      throw new DemoSessionLifecycleError(
        'Demo CSRF token generation failed.'
      );
    }

    return value;
  }

  /**
   * @param {any} record
   * @param {string} expectedSessionId
   */
  #isStoredRecordValid(record, expectedSessionId) {
    if (
      record === null ||
      typeof record !== 'object' ||
      record.sessionId !== expectedSessionId ||
      !isCanonicalDemoSessionId(record.sessionId) ||
      !isCanonicalDemoCsrfToken(record.csrfToken) ||
      record.csrfToken === record.sessionId
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
        !Number.isSafeInteger(record[field]) ||
        record[field] < 0
      ) {
        return false;
      }
    }

    if (
      record.createdAt > record.rotatedAt ||
      record.rotatedAt > record.lastSeenAt ||
      record.lastSeenAt > record.expiresAt
    ) {
      return false;
    }

    return (
      record.expiresAt ===
      record.createdAt + this.#policy.absoluteLifetimeMs
    );
  }

  /**
   * @param {string} sessionId
   * @param {number} now
   */
  async #activeRecord(sessionId, now) {
    if (!isCanonicalDemoSessionId(sessionId)) {
      return null;
    }

    const record = await this.#store.read(sessionId);

    if (record === null) {
      return null;
    }

    if (!this.#isStoredRecordValid(record, sessionId)) {
      await this.#store.delete(sessionId);
      return null;
    }

    if (
      now < record.createdAt ||
      now < record.rotatedAt ||
      now < record.lastSeenAt ||
      now >= record.expiresAt ||
      now - record.lastSeenAt >= this.#policy.idleTimeoutMs
    ) {
      await this.#store.delete(sessionId);
      return null;
    }

    return record;
  }

  async create() {
    const now = this.#now();
    const expiresAt =
      now + this.#policy.absoluteLifetimeMs;

    if (!Number.isSafeInteger(expiresAt)) {
      throw new DemoSessionLifecycleError(
        'Demo session expiry could not be represented safely.'
      );
    }

    const csrfToken = this.#nextCsrfToken();

    for (
      let attempt = 0;
      attempt < MAX_ID_ALLOCATION_ATTEMPTS;
      attempt += 1
    ) {
      const sessionId = this.#nextSessionId();

      if (sessionId === csrfToken) {
        continue;
      }

      try {
        return snapshot(await this.#store.create({
          sessionId,
          csrfToken,
          createdAt: now,
          rotatedAt: now,
          expiresAt,
          lastSeenAt: now
        }));
      } catch (error) {
        if (error instanceof DemoSessionStoreConflictError) {
          continue;
        }

        throw error;
      }
    }

    throw new DemoSessionLifecycleError(
      'Unable to allocate a unique Demo session identifier.'
    );
  }

  /** @param {unknown} sessionId */
  async resolve(sessionId) {
    if (!isCanonicalDemoSessionId(sessionId)) {
      return null;
    }

    const now = this.#now();
    const record = await this.#activeRecord(sessionId, now);

    if (record === null) {
      return null;
    }

    return resolution(
      snapshot(record),
      now - record.rotatedAt >= this.#policy.rotationAgeMs
    );
  }

  /** @param {unknown} sessionId */
  async touch(sessionId) {
    if (!isCanonicalDemoSessionId(sessionId)) {
      return null;
    }

    const now = this.#now();
    const record = await this.#activeRecord(sessionId, now);

    if (record === null) {
      return null;
    }

    const touched = await this.#store.update(
      sessionId,
      record,
      {
        ...record,
        lastSeenAt: now
      }
    );

    if (touched === null) {
      return null;
    }

    return resolution(
      snapshot(touched),
      now - touched.rotatedAt >= this.#policy.rotationAgeMs
    );
  }

  /** @param {unknown} sessionId */
  async rotate(sessionId) {
    if (!isCanonicalDemoSessionId(sessionId)) {
      return null;
    }

    const now = this.#now();
    const record = await this.#activeRecord(sessionId, now);

    if (record === null) {
      return null;
    }

    for (
      let attempt = 0;
      attempt < MAX_ID_ALLOCATION_ATTEMPTS;
      attempt += 1
    ) {
      const nextSessionId = this.#nextSessionId();

      if (
        nextSessionId === sessionId ||
        nextSessionId === record.csrfToken
      ) {
        continue;
      }

      try {
        const rotated = await this.#store.replace(
          sessionId,
          record,
          {
            ...record,
            sessionId: nextSessionId,
            rotatedAt: now,
            lastSeenAt: now
          }
        );

        return rotated === null
          ? null
          : snapshot(rotated);
      } catch (error) {
        if (error instanceof DemoSessionStoreConflictError) {
          continue;
        }

        throw error;
      }
    }

    throw new DemoSessionLifecycleError(
      'Unable to rotate Demo session identifier.'
    );
  }

  /** @param {unknown} sessionId */
  async invalidate(sessionId) {
    if (!isCanonicalDemoSessionId(sessionId)) {
      return false;
    }

    return this.#store.delete(sessionId);
  }
}
