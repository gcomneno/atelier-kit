export class DemoMutationBudgetStoreConfigurationError extends Error {
  /** @param {string} message */
  constructor(message) {
    super(message);
    this.name =
      'DemoMutationBudgetStoreConfigurationError';
    this.code =
      'DEMO_MUTATION_BUDGET_STORE_CONFIGURATION_INVALID';
  }
}

/**
 * @param {unknown} value
 */
function assertKey(value) {
  if (
    typeof value !== 'string' ||
    !/^[A-Za-z0-9_-]{43}$/.test(value)
  ) {
    throw new DemoMutationBudgetStoreConfigurationError(
      'Demo mutation budget key is invalid.'
    );
  }
}

/**
 * In-memory atomic contract used by tests and non-distributed execution.
 *
 * A deployment adapter can implement the same consume() boundary using a
 * persistent atomic primitive without changing mutation policy.
 */
export class InMemoryDemoMutationBudgetStore {
  #records = new Map();

  /**
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
      throw new DemoMutationBudgetStoreConfigurationError(
        'Demo mutation budget request is invalid.'
      );
    }

    const {
      key,
      limit,
      expiresAt
    } = /** @type {Record<string, unknown>} */ (
      request
    );

    assertKey(key);

    if (
      !Number.isSafeInteger(limit) ||
      /** @type {number} */ (limit) <= 0 ||
      !Number.isSafeInteger(expiresAt) ||
      /** @type {number} */ (expiresAt) < 0
    ) {
      throw new DemoMutationBudgetStoreConfigurationError(
        'Demo mutation budget request is invalid.'
      );
    }

    const canonicalLimit =
      /** @type {number} */ (limit);
    const canonicalExpiry =
      /** @type {number} */ (expiresAt);

    const current = this.#records.get(key);

    if (
      current &&
      current.expiresAt !== canonicalExpiry
    ) {
      throw new DemoMutationBudgetStoreConfigurationError(
        'Demo mutation budget lifetime changed unexpectedly.'
      );
    }

    const used = current?.used ?? 0;

    if (used >= canonicalLimit) {
      return Object.freeze({
        allowed: false,
        used,
        remaining: 0
      });
    }

    const nextUsed = used + 1;

    this.#records.set(
      key,
      Object.freeze({
        used: nextUsed,
        expiresAt: canonicalExpiry
      })
    );

    return Object.freeze({
      allowed: true,
      used: nextUsed,
      remaining: canonicalLimit - nextUsed
    });
  }
}
