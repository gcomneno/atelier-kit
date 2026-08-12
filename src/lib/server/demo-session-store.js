export class DemoSessionStoreConflictError extends Error {
  constructor() {
    super('Demo session store collision.');
    this.name = 'DemoSessionStoreConflictError';
    this.code = 'DEMO_SESSION_STORE_CONFLICT';
  }
}

export class DemoSessionStoreInvariantError extends Error {
  /** @param {string} message */
  constructor(message) {
    super(message);
    this.name = 'DemoSessionStoreInvariantError';
    this.code = 'DEMO_SESSION_STORE_INVARIANT';
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
 * @param {any} left
 * @param {any} right
 */
function same(left, right) {
  return (
    left.sessionId === right.sessionId &&
    left.csrfToken === right.csrfToken &&
    left.createdAt === right.createdAt &&
    left.rotatedAt === right.rotatedAt &&
    left.expiresAt === right.expiresAt &&
    left.lastSeenAt === right.lastSeenAt
  );
}

/**
 * @param {any} expected
 * @param {any} next
 * @param {boolean} rotation
 */
function assertTransition(expected, next, rotation) {
  if ((expected.sessionId === next.sessionId) !== !rotation) {
    throw new DemoSessionStoreInvariantError(
      rotation
        ? 'Demo session rotation requires a new lookup credential.'
        : 'Demo session update cannot change its lookup credential.'
    );
  }

  if (
    expected.csrfToken !== next.csrfToken ||
    expected.createdAt !== next.createdAt ||
    expected.expiresAt !== next.expiresAt ||
    next.rotatedAt < expected.rotatedAt ||
    next.lastSeenAt < expected.lastSeenAt ||
    next.lastSeenAt < next.rotatedAt
  ) {
    throw new DemoSessionStoreInvariantError(
      'Demo session transition violates lifecycle invariants.'
    );
  }
}

export class InMemoryDemoSessionStore {
  #records = new Map();

  /** @param {string} sessionId */
  async read(sessionId) {
    const record = this.#records.get(sessionId);
    return record ? snapshot(record) : null;
  }

  /** @param {any} record */
  async create(record) {
    const next = snapshot(record);

    if (this.#records.has(next.sessionId)) {
      throw new DemoSessionStoreConflictError();
    }

    this.#records.set(next.sessionId, next);
    return snapshot(next);
  }

  /**
   * @param {string} sessionId
   * @param {any} expectedRecord
   * @param {any} record
   */
  async update(sessionId, expectedRecord, record) {
    const current = this.#records.get(sessionId);
    if (!current) return null;

    const expected = snapshot(expectedRecord);
    const next = snapshot(record);

    assertTransition(expected, next, false);

    if (!same(current, expected)) return null;

    this.#records.set(sessionId, next);
    return snapshot(next);
  }

  /**
   * @param {string} oldSessionId
   * @param {any} expectedRecord
   * @param {any} record
   */
  async replace(oldSessionId, expectedRecord, record) {
    const current = this.#records.get(oldSessionId);
    if (!current) return null;

    const expected = snapshot(expectedRecord);
    const next = snapshot(record);

    assertTransition(expected, next, true);

    if (!same(current, expected)) return null;

    if (this.#records.has(next.sessionId)) {
      throw new DemoSessionStoreConflictError();
    }

    this.#records.delete(oldSessionId);
    this.#records.set(next.sessionId, next);

    return snapshot(next);
  }

  /** @param {string} sessionId */
  async delete(sessionId) {
    return this.#records.delete(sessionId);
  }
}
