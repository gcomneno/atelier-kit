import { randomBytes } from 'node:crypto';
import {
  isAuthorizedHostedIdentity
} from './hosted-authorization.js';
import {
  canonicalGitHubSubject,
  HOSTED_IDENTITY_PROVIDERS
} from './hosted-identity.js';
import {
  HostedSessionStoreConflictError
} from './hosted-session-store.js';

const SESSION_ID_BYTES = 32;
const SESSION_ID_LENGTH = 43;
const SESSION_ID_PATTERN = /^[A-Za-z0-9_-]{43}$/;
const MAX_ID_ALLOCATION_ATTEMPTS = 4;

export const DEFAULT_HOSTED_SESSION_POLICY = Object.freeze({
  absoluteLifetimeMs: 8 * 60 * 60 * 1000,
  idleTimeoutMs: 2 * 60 * 60 * 1000,
  rotationAgeMs: 45 * 60 * 1000
});

const POLICY_FIELDS = Object.freeze([
  'absoluteLifetimeMs',
  'idleTimeoutMs',
  'rotationAgeMs'
]);

const POLICY_FIELD_SET =
  /** @type {ReadonlySet<string>} */ (new Set(POLICY_FIELDS));

export class HostedSessionConfigurationError extends Error {
  /**
   * @param {string} message
   */
  constructor(message) {
    super(message);
    this.name = 'HostedSessionConfigurationError';
    this.code = 'HOSTED_SESSION_CONFIGURATION_INVALID';
  }
}

export class HostedSessionLifecycleError extends Error {
  /**
   * @param {string} message
   */
  constructor(message) {
    super(message);
    this.name = 'HostedSessionLifecycleError';
    this.code = 'HOSTED_SESSION_LIFECYCLE_ERROR';
  }
}

/**
 * @returns {string}
 */
export function generateHostedSessionId() {
  return randomBytes(SESSION_ID_BYTES).toString('base64url');
}

/**
 * @param {unknown} value
 * @returns {value is string}
 */
export function isCanonicalHostedSessionId(value) {
  if (
    typeof value !== 'string' ||
    value.length !== SESSION_ID_LENGTH ||
    !SESSION_ID_PATTERN.test(value)
  ) {
    return false;
  }

  try {
    const decoded = Buffer.from(value, 'base64url');

    return (
      decoded.length === SESSION_ID_BYTES &&
      decoded.toString('base64url') === value
    );
  } catch {
    return false;
  }
}

/**
 * @param {unknown} value
 * @param {number} fallback
 * @returns {number}
 */
function normalizePolicyDuration(value, fallback) {
  const duration = value === undefined
    ? fallback
    : value;

  if (
    typeof duration !== 'number' ||
    !Number.isSafeInteger(duration) ||
    duration <= 0
  ) {
    throw new HostedSessionConfigurationError(
      'Hosted session policy durations must be positive finite integers.'
    );
  }

  return duration;
}

/**
 * @param {unknown} input
 */
export function normalizeHostedSessionPolicy(input = {}) {
  if (
    input === null ||
    typeof input !== 'object' ||
    Array.isArray(input)
  ) {
    throw new HostedSessionConfigurationError(
      'Hosted session policy must be an object.'
    );
  }

  const record = /** @type {Record<string, unknown>} */ (input);

  for (const field of Object.keys(record)) {
    if (!POLICY_FIELD_SET.has(field)) {
      throw new HostedSessionConfigurationError(
        'Hosted session policy contains unsupported fields.'
      );
    }
  }

  const policy = {
    absoluteLifetimeMs: normalizePolicyDuration(
      record.absoluteLifetimeMs,
      DEFAULT_HOSTED_SESSION_POLICY.absoluteLifetimeMs
    ),
    idleTimeoutMs: normalizePolicyDuration(
      record.idleTimeoutMs,
      DEFAULT_HOSTED_SESSION_POLICY.idleTimeoutMs
    ),
    rotationAgeMs: normalizePolicyDuration(
      record.rotationAgeMs,
      DEFAULT_HOSTED_SESSION_POLICY.rotationAgeMs
    )
  };

  if (policy.rotationAgeMs >= policy.absoluteLifetimeMs) {
    throw new HostedSessionConfigurationError(
      'Hosted session rotation age must be below the absolute lifetime.'
    );
  }

  return Object.freeze(policy);
}

/**
 * @param {unknown} store
 */
function assertSessionStore(store) {
  if (
    store === null ||
    typeof store !== 'object'
  ) {
    throw new HostedSessionConfigurationError(
      'Hosted session store is required.'
    );
  }

  for (const method of ['read', 'create', 'update', 'replace', 'delete']) {
    if (
      typeof /** @type {Record<string, unknown>} */ (store)[method] !==
      'function'
    ) {
      throw new HostedSessionConfigurationError(
        'Hosted session store does not implement the required boundary.'
      );
    }
  }
}

/**
 * @param {{
 *   sessionId: string,
 *   identity: { provider: string, subject: string },
 *   authorization: string,
 *   createdAt: number,
 *   rotatedAt: number,
 *   expiresAt: number,
 *   lastSeenAt: number
 * }} record
 */
function snapshotSession(record) {
  return Object.freeze({
    sessionId: record.sessionId,
    identity: Object.freeze({
      provider: record.identity.provider,
      subject: record.identity.subject
    }),
    authorization: record.authorization,
    createdAt: record.createdAt,
    rotatedAt: record.rotatedAt,
    expiresAt: record.expiresAt,
    lastSeenAt: record.lastSeenAt
  });
}

/**
 * @param {ReturnType<typeof snapshotSession>} session
 * @param {boolean} rotationDue
 */
function resolution(session, rotationDue) {
  return Object.freeze({
    session,
    rotationDue
  });
}

export class HostedSessionLifecycle {
  #store;
  #clock;
  #sessionIdGenerator;
  #policy;

  /**
   * @param {{
   *   store: {
   *     read(sessionId: string): any,
   *     create(record: any): any,
   *     update(sessionId: string, record: any): any,
   *     replace(oldSessionId: string, record: any): any,
   *     delete(sessionId: string): boolean
   *   },
   *   clock?: () => number,
   *   sessionIdGenerator?: () => string,
   *   policy?: unknown
   * }} options
   */
  constructor({
    store,
    clock = Date.now,
    sessionIdGenerator = generateHostedSessionId,
    policy = {}
  }) {
    assertSessionStore(store);

    if (typeof clock !== 'function') {
      throw new HostedSessionConfigurationError(
        'Hosted session clock must be callable.'
      );
    }

    if (typeof sessionIdGenerator !== 'function') {
      throw new HostedSessionConfigurationError(
        'Hosted session ID generator must be callable.'
      );
    }

    this.#store = store;
    this.#clock = clock;
    this.#sessionIdGenerator = sessionIdGenerator;
    this.#policy = normalizeHostedSessionPolicy(policy);
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
      throw new HostedSessionLifecycleError(
        'Hosted session clock produced an invalid timestamp.'
      );
    }

    return now;
  }

  #nextSessionId() {
    let candidate;

    try {
      candidate = this.#sessionIdGenerator();
    } catch {
      throw new HostedSessionLifecycleError(
        'Hosted session identifier generation failed.'
      );
    }

    if (!isCanonicalHostedSessionId(candidate)) {
      throw new HostedSessionLifecycleError(
        'Hosted session identifier generation failed.'
      );
    }

    return candidate;
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
      !isCanonicalHostedSessionId(record.sessionId) ||
      record.authorization !== 'authorized' ||
      record.identity === null ||
      typeof record.identity !== 'object' ||
      record.identity.provider !== HOSTED_IDENTITY_PROVIDERS.GITHUB
    ) {
      return false;
    }

    try {
      canonicalGitHubSubject(record.identity.subject);
    } catch {
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
  #activeRecord(sessionId, now) {
    if (!isCanonicalHostedSessionId(sessionId)) {
      return null;
    }

    const record = this.#store.read(sessionId);

    if (record === null) {
      return null;
    }

    if (!this.#isStoredRecordValid(record, sessionId)) {
      this.#store.delete(sessionId);
      return null;
    }

    if (
      now < record.createdAt ||
      now < record.rotatedAt ||
      now < record.lastSeenAt ||
      now >= record.expiresAt ||
      now - record.lastSeenAt >= this.#policy.idleTimeoutMs
    ) {
      this.#store.delete(sessionId);
      return null;
    }

    return record;
  }

  /**
   * Create a server-side session only from the trusted authorization result
   * produced by the centralized Hosted authorization policy.
   *
   * @param {unknown} authorizedIdentity
   */
  create(authorizedIdentity) {
    if (!isAuthorizedHostedIdentity(authorizedIdentity)) {
      throw new HostedSessionLifecycleError(
        'Hosted session creation requires trusted authorization context.'
      );
    }

    const now = this.#now();
    const expiresAt = now + this.#policy.absoluteLifetimeMs;

    if (!Number.isSafeInteger(expiresAt)) {
      throw new HostedSessionLifecycleError(
        'Hosted session expiry could not be represented safely.'
      );
    }

    const baseRecord = {
      identity: {
        provider: authorizedIdentity.identity.provider,
        subject: authorizedIdentity.identity.subject
      },
      authorization: 'authorized',
      createdAt: now,
      rotatedAt: now,
      expiresAt,
      lastSeenAt: now
    };

    for (
      let attempt = 0;
      attempt < MAX_ID_ALLOCATION_ATTEMPTS;
      attempt += 1
    ) {
      const sessionId = this.#nextSessionId();

      try {
        const created = this.#store.create({
          sessionId,
          ...baseRecord
        });

        return snapshotSession(created);
      } catch (error) {
        if (error instanceof HostedSessionStoreConflictError) {
          continue;
        }

        throw error;
      }
    }

    throw new HostedSessionLifecycleError(
      'Unable to allocate a unique Hosted session identifier.'
    );
  }

  /**
   * Resolve a valid active session without changing activity state.
   *
   * @param {unknown} sessionId
   */
  resolve(sessionId) {
    if (!isCanonicalHostedSessionId(sessionId)) {
      return null;
    }

    const now = this.#now();
    const record = this.#activeRecord(sessionId, now);

    if (record === null) {
      return null;
    }

    return resolution(
      snapshotSession(record),
      now - record.rotatedAt >= this.#policy.rotationAgeMs
    );
  }

  /**
   * Record successful server-side activity without extending absolute expiry.
   *
   * @param {unknown} sessionId
   */
  touch(sessionId) {
    if (!isCanonicalHostedSessionId(sessionId)) {
      return null;
    }

    const now = this.#now();
    const record = this.#activeRecord(sessionId, now);

    if (record === null) {
      return null;
    }

    const touched = this.#store.update(sessionId, {
      ...record,
      lastSeenAt: Math.max(record.lastSeenAt, now)
    });

    if (touched === null) {
      return null;
    }

    return resolution(
      snapshotSession(touched),
      now - touched.rotatedAt >= this.#policy.rotationAgeMs
    );
  }

  /**
   * Replace a valid session ID while preserving the original absolute lifetime.
   *
   * Rotation is explicit and may be requested before the periodic threshold,
   * which supports the future post-authentication rotation requirement.
   *
   * @param {unknown} sessionId
   */
  rotate(sessionId) {
    if (!isCanonicalHostedSessionId(sessionId)) {
      return null;
    }

    const now = this.#now();
    const record = this.#activeRecord(sessionId, now);

    if (record === null) {
      return null;
    }

    for (
      let attempt = 0;
      attempt < MAX_ID_ALLOCATION_ATTEMPTS;
      attempt += 1
    ) {
      const replacementId = this.#nextSessionId();

      if (replacementId === sessionId) {
        continue;
      }

      try {
        const replacement = this.#store.replace(sessionId, {
          ...record,
          sessionId: replacementId,
          rotatedAt: Math.max(record.rotatedAt, now),
          lastSeenAt: Math.max(record.lastSeenAt, now)
        });

        if (replacement === null) {
          return null;
        }

        return snapshotSession(replacement);
      } catch (error) {
        if (error instanceof HostedSessionStoreConflictError) {
          continue;
        }

        throw error;
      }
    }

    throw new HostedSessionLifecycleError(
      'Unable to allocate a unique Hosted session identifier.'
    );
  }

  /**
   * Idempotent server-side invalidation primitive for future logout wiring.
   *
   * @param {unknown} sessionId
   */
  invalidate(sessionId) {
    if (!isCanonicalHostedSessionId(sessionId)) {
      return false;
    }

    return this.#store.delete(sessionId);
  }
}
