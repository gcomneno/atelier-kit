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
    createdAt: record.createdAt,
    rotatedAt: record.rotatedAt,
    expiresAt: record.expiresAt,
    lastSeenAt: record.lastSeenAt
  });
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
   * @returns {ReturnType<typeof snapshotSessionRecord> | null}
   */
  read(sessionId) {
    const record = this.#records.get(sessionId);

    return record
      ? snapshotSessionRecord(record)
      : null;
  }

  /**
   * @param {Parameters<typeof snapshotSessionRecord>[0]} record
   * @returns {ReturnType<typeof snapshotSessionRecord>}
   */
  create(record) {
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
   * @param {Parameters<typeof snapshotSessionRecord>[0]} record
   * @returns {ReturnType<typeof snapshotSessionRecord> | null}
   */
  update(sessionId, record) {
    if (!this.#records.has(sessionId)) {
      return null;
    }

    const snapshot = snapshotSessionRecord(record);

    if (snapshot.sessionId !== sessionId) {
      throw new HostedSessionStoreInvariantError(
        'Hosted session update cannot change its lookup credential.'
      );
    }

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
   * @param {Parameters<typeof snapshotSessionRecord>[0]} newRecord
   * @returns {ReturnType<typeof snapshotSessionRecord> | null}
   */
  replace(oldSessionId, newRecord) {
    if (!this.#records.has(oldSessionId)) {
      return null;
    }

    const snapshot = snapshotSessionRecord(newRecord);

    if (snapshot.sessionId === oldSessionId) {
      throw new HostedSessionStoreInvariantError(
        'Hosted session rotation requires a new lookup credential.'
      );
    }

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
   * @returns {boolean}
   */
  delete(sessionId) {
    return this.#records.delete(sessionId);
  }
}
