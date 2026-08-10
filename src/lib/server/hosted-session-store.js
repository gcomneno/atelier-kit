export class HostedSessionStoreConflictError extends Error {
  constructor() {
    super('Hosted session store collision.');
    this.name = 'HostedSessionStoreConflictError';
    this.code = 'HOSTED_SESSION_STORE_CONFLICT';
  }
}

export class HostedSessionStoreInvariantError extends Error {
  /**
   * @param {string} message
   */
  constructor(message) {
    super(message);
    this.name = 'HostedSessionStoreInvariantError';
    this.code = 'HOSTED_SESSION_STORE_INVARIANT';
  }
}

/**
 * Return an immutable copy so callers can neither mutate store-owned state nor
 * retain a mutable object that later becomes store state.
 *
 * @param {{
 *   sessionId: string,
 *   identity: { provider: string, subject: string },
 *   authorization: string,
 *   csrfToken: string,
 *   createdAt: number,
 *   rotatedAt: number,
 *   expiresAt: number,
 *   lastSeenAt: number
 * }} record
 */
function snapshotSessionRecord(record) {
  const identity = Object.freeze({
    provider: record.identity.provider,
    subject: record.identity.subject
  });

  return Object.freeze({
    sessionId: record.sessionId,
    identity,
    authorization: record.authorization,
    csrfToken: record.csrfToken,
    createdAt: record.createdAt,
    rotatedAt: record.rotatedAt,
    expiresAt: record.expiresAt,
    lastSeenAt: record.lastSeenAt
  });
}

/** @param {any} left @param {any} right */
function sameSessionRecord(left, right) {
  return left.sessionId === right.sessionId &&
    left.identity.provider === right.identity.provider &&
    left.identity.subject === right.identity.subject &&
    left.authorization === right.authorization &&
    left.csrfToken === right.csrfToken &&
    left.createdAt === right.createdAt &&
    left.rotatedAt === right.rotatedAt &&
    left.expiresAt === right.expiresAt &&
    left.lastSeenAt === right.lastSeenAt;
}

/** @param {any} expected @param {any} next @param {boolean} rotation */
function assertTransition(expected, next, rotation) {
  if ((expected.sessionId === next.sessionId) !== !rotation) {
    throw new HostedSessionStoreInvariantError(
      rotation
        ? 'Hosted session rotation requires a new lookup credential.'
        : 'Hosted session update cannot change its lookup credential.'
    );
  }

  if (
    expected.identity.provider !== next.identity.provider ||
    expected.identity.subject !== next.identity.subject ||
    expected.authorization !== next.authorization ||
    expected.csrfToken !== next.csrfToken ||
    expected.createdAt !== next.createdAt ||
    expected.expiresAt !== next.expiresAt ||
    next.rotatedAt < expected.rotatedAt ||
    next.lastSeenAt < expected.lastSeenAt ||
    next.lastSeenAt < next.rotatedAt
  ) {
    throw new HostedSessionStoreInvariantError(
      'Hosted session transition violates lifecycle invariants.'
    );
  }
}

/**
 * In-memory implementation of the Hosted session-store boundary.
 *
 * It is suitable for tests and local development of the lifecycle contract.
 * Production persistence remains deliberately unspecified by ADR 0009.
 */
export class InMemoryHostedSessionStore {
  #records = new Map();

  /**
   * @param {string} sessionId
   * @returns {Promise<ReturnType<typeof snapshotSessionRecord> | null>}
   */
  async read(sessionId) {
    const record = this.#records.get(sessionId);

    return record
      ? snapshotSessionRecord(record)
      : null;
  }

  /**
   * @param {Parameters<typeof snapshotSessionRecord>[0]} record
   * @returns {Promise<ReturnType<typeof snapshotSessionRecord>>}
   */
  async create(record) {
    const snapshot = snapshotSessionRecord(record);

    if (this.#records.has(snapshot.sessionId)) {
      throw new HostedSessionStoreConflictError();
    }

    this.#records.set(snapshot.sessionId, snapshot);

    return snapshotSessionRecord(snapshot);
  }

  /**
   * Update one existing session without changing its lookup credential.
   *
   * @param {string} sessionId
   * @param {Parameters<typeof snapshotSessionRecord>[0]} expectedRecord
   * @param {Parameters<typeof snapshotSessionRecord>[0]} record
   * @returns {Promise<ReturnType<typeof snapshotSessionRecord> | null>}
   */
  async update(sessionId, expectedRecord, record) {
    const current = this.#records.get(sessionId);
    if (!current) {
      return null;
    }

    const expected = snapshotSessionRecord(expectedRecord);
    const snapshot = snapshotSessionRecord(record);

    assertTransition(expected, snapshot, false);
    if (!sameSessionRecord(current, expected)) return null;

    this.#records.set(sessionId, snapshot);

    return snapshotSessionRecord(snapshot);
  }

  /**
   * Atomically replace an existing lookup credential with a new record.
   *
   * The synchronous Map operations form one indivisible store operation for
   * this in-memory adapter. Persistent adapters must preserve the same
   * all-or-nothing semantic.
   *
   * @param {string} oldSessionId
   * @param {Parameters<typeof snapshotSessionRecord>[0]} expectedRecord
   * @param {Parameters<typeof snapshotSessionRecord>[0]} newRecord
   * @returns {Promise<ReturnType<typeof snapshotSessionRecord> | null>}
   */
  async replace(oldSessionId, expectedRecord, newRecord) {
    const current = this.#records.get(oldSessionId);
    if (!current) {
      return null;
    }

    const expected = snapshotSessionRecord(expectedRecord);
    const snapshot = snapshotSessionRecord(newRecord);

    assertTransition(expected, snapshot, true);
    if (!sameSessionRecord(current, expected)) return null;

    if (this.#records.has(snapshot.sessionId)) {
      throw new HostedSessionStoreConflictError();
    }

    this.#records.delete(oldSessionId);
    this.#records.set(snapshot.sessionId, snapshot);

    return snapshotSessionRecord(snapshot);
  }

  /**
   * Idempotent invalidation primitive.
   *
   * @param {string} sessionId
   * @returns {Promise<boolean>}
   */
  async delete(sessionId) {
    return this.#records.delete(sessionId);
  }
}
