export class HostedOAuthTransactionStoreConflictError extends Error {
  constructor() {
    super('Hosted OAuth transaction store collision.');
    this.name = 'HostedOAuthTransactionStoreConflictError';
    this.code = 'HOSTED_OAUTH_TRANSACTION_STORE_CONFLICT';
  }
}

/**
 * @param {{
 *   state: string,
 *   pkceVerifier: string,
 *   returnTo: string,
 *   createdAt: number,
 *   expiresAt: number
 * }} record
 */
function snapshotTransaction(record) {
  return Object.freeze({
    state: record.state,
    pkceVerifier: record.pkceVerifier,
    returnTo: record.returnTo,
    createdAt: record.createdAt,
    expiresAt: record.expiresAt
  });
}

/**
 * One-time in-memory store for pre-session OAuth transactions.
 *
 * Production persistence remains intentionally unspecified.
 */
export class InMemoryHostedOAuthTransactionStore {
  #records = new Map();

  /**
   * @param {Parameters<typeof snapshotTransaction>[0]} record
   */
  create(record) {
    const snapshot = snapshotTransaction(record);

    if (this.#records.has(snapshot.state)) {
      throw new HostedOAuthTransactionStoreConflictError();
    }

    this.#records.set(snapshot.state, snapshot);

    return snapshotTransaction(snapshot);
  }

  /**
   * Read without consuming. Intended for diagnostics/tests, not callback use.
   *
   * @param {string} state
   */
  read(state) {
    const record = this.#records.get(state);

    return record
      ? snapshotTransaction(record)
      : null;
  }

  /**
   * Atomically consume one transaction.
   *
   * @param {string} state
   */
  consume(state) {
    const record = this.#records.get(state);

    if (!record) {
      return null;
    }

    this.#records.delete(state);

    return snapshotTransaction(record);
  }

  /**
   * @param {string} state
   */
  delete(state) {
    return this.#records.delete(state);
  }
}
