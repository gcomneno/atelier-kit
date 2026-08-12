import {
  createHash,
  timingSafeEqual
} from 'node:crypto';
import {
  STUDIO_RUNTIME_MODES
} from '../studio-runtime.js';
import {
  getTrustedDemoRequestCsrfToken,
  isTrustedDemoRequestContext
} from './demo-request-context.js';
import {
  parseDemoOriginConfig
} from './demo-origin.js';
import {
  isCanonicalDemoCsrfToken
} from './demo-session.js';

const SUPPORTED_MUTATION_METHODS =
  /** @type {ReadonlySet<string>} */ (
    new Set(['POST', 'PUT', 'PATCH', 'DELETE'])
  );

export const DEFAULT_DEMO_MUTATION_LIMIT = 5;

export const DEMO_MUTATION_GUARD_OUTCOMES =
  Object.freeze({
    NOT_FOUND: 'not-found',
    FORBIDDEN: 'forbidden',
    METHOD_NOT_ALLOWED: 'method-not-allowed',
    BUDGET_EXHAUSTED: 'budget-exhausted',
    BUDGET_UNAVAILABLE: 'budget-unavailable',
    ALLOWED: 'allowed'
  });

export class DemoMutationGuardConfigurationError extends Error {
  /** @param {string} message */
  constructor(message) {
    super(message);
    this.name =
      'DemoMutationGuardConfigurationError';
    this.code =
      'DEMO_MUTATION_GUARD_CONFIGURATION_INVALID';
  }
}

/**
 * @param {string} expected
 * @param {string} presented
 */
function csrfTokensEqual(expected, presented) {
  if (
    !isCanonicalDemoCsrfToken(expected) ||
    !isCanonicalDemoCsrfToken(presented)
  ) {
    return false;
  }

  const expectedBytes =
    Buffer.from(expected, 'base64url');
  const presentedBytes =
    Buffer.from(presented, 'base64url');

  return (
    expectedBytes.length === presentedBytes.length &&
    timingSafeEqual(expectedBytes, presentedBytes)
  );
}

/**
 * Derive a stable, non-secret budget key from the server-side CSRF capability.
 *
 * The CSRF token remains stable across session-ID rotation, so this also
 * prevents rotation from resetting the mutation budget.
 *
 * @param {string} csrfToken
 */
function deriveBudgetKey(csrfToken) {
  return createHash('sha256')
    .update(Buffer.from(csrfToken, 'base64url'))
    .digest('base64url');
}

/**
 * @param {string} value
 * @param {number | undefined} [remaining]
 */
function outcome(value, remaining) {
  return Object.freeze(
    remaining === undefined
      ? { outcome: value }
      : { outcome: value, remaining }
  );
}

/**
 * @param {unknown} store
 */
function assertBudgetStore(store) {
  if (
    store === null ||
    typeof store !== 'object' ||
    typeof /** @type {Record<string, unknown>} */ (
      store
    ).consume !== 'function'
  ) {
    throw new DemoMutationGuardConfigurationError(
      'Demo mutation budget store does not implement the required boundary.'
    );
  }
}

export class DemoMutationGuard {
  #originConfig;
  #budgetStore;
  #mutationLimit;

  /**
   * @param {{
   *   environment?: unknown,
   *   budgetStore: unknown,
   *   mutationLimit?: unknown
   * }} options
   */
  constructor({
    environment,
    budgetStore,
    mutationLimit = DEFAULT_DEMO_MUTATION_LIMIT
  }) {
    assertBudgetStore(budgetStore);

    if (
      !Number.isSafeInteger(mutationLimit) ||
      /** @type {number} */ (mutationLimit) <= 0
    ) {
      throw new DemoMutationGuardConfigurationError(
        'Demo mutation limit must be a positive integer.'
      );
    }

    try {
      this.#originConfig =
        parseDemoOriginConfig(environment);
    } catch {
      throw new DemoMutationGuardConfigurationError(
        'Demo mutation origin configuration is invalid.'
      );
    }

    this.#budgetStore = budgetStore;
    this.#mutationLimit =
      /** @type {number} */ (mutationLimit);
  }

  /**
   * Enforce request integrity before consuming public Demo mutation budget.
   *
   * @param {{
   *   runtimeMode?: unknown,
   *   trustedContext?: unknown,
   *   host?: unknown,
   *   origin?: unknown,
   *   method?: unknown,
   *   csrfToken?: unknown
   * }} [request]
   */
  async evaluate(request = {}) {
    const {
      runtimeMode,
      trustedContext,
      host,
      origin,
      method,
      csrfToken
    } = request;

    if (runtimeMode !== STUDIO_RUNTIME_MODES.DEMO) {
      return outcome(
        DEMO_MUTATION_GUARD_OUTCOMES.NOT_FOUND
      );
    }

    if (!isTrustedDemoRequestContext(trustedContext)) {
      return outcome(
        DEMO_MUTATION_GUARD_OUTCOMES.FORBIDDEN
      );
    }

    if (
      typeof host !== 'string' ||
      host !== this.#originConfig.host
    ) {
      return outcome(
        DEMO_MUTATION_GUARD_OUTCOMES.FORBIDDEN
      );
    }

    if (
      typeof origin !== 'string' ||
      origin !== this.#originConfig.origin
    ) {
      return outcome(
        DEMO_MUTATION_GUARD_OUTCOMES.FORBIDDEN
      );
    }

    if (
      typeof method !== 'string' ||
      !SUPPORTED_MUTATION_METHODS.has(method)
    ) {
      return outcome(
        DEMO_MUTATION_GUARD_OUTCOMES.METHOD_NOT_ALLOWED
      );
    }

    if (!isCanonicalDemoCsrfToken(csrfToken)) {
      return outcome(
        DEMO_MUTATION_GUARD_OUTCOMES.FORBIDDEN
      );
    }

    let expectedCsrfToken;

    try {
      expectedCsrfToken =
        getTrustedDemoRequestCsrfToken(
          trustedContext
        );
    } catch {
      return outcome(
        DEMO_MUTATION_GUARD_OUTCOMES.FORBIDDEN
      );
    }

    if (
      !csrfTokensEqual(
        expectedCsrfToken,
        csrfToken
      )
    ) {
      return outcome(
        DEMO_MUTATION_GUARD_OUTCOMES.FORBIDDEN
      );
    }

    const session =
      /** @type {{
       *   session?: {
       *     expiresAt?: unknown
       *   }
       * }} */ (
        trustedContext
      ).session;

    if (
      session === null ||
      typeof session !== 'object' ||
      !Number.isSafeInteger(
        /** @type {{ expiresAt?: unknown }} */ (
          session
        ).expiresAt
      )
    ) {
      return outcome(
        DEMO_MUTATION_GUARD_OUTCOMES.FORBIDDEN
      );
    }

    let budget;

    try {
      budget =
        await /** @type {{
         *   consume(request: {
         *     key: string,
         *     limit: number,
         *     expiresAt: number
         *   }): Promise<{
         *     allowed: boolean,
         *     remaining: number
         *   }>
         * }} */ (this.#budgetStore).consume({
          key: deriveBudgetKey(
            expectedCsrfToken
          ),
          limit: this.#mutationLimit,
          expiresAt:
            /** @type {{ expiresAt: number }} */ (
              session
            ).expiresAt
        });
    } catch {
      return outcome(
        DEMO_MUTATION_GUARD_OUTCOMES.BUDGET_UNAVAILABLE
      );
    }

    if (
      budget === null ||
      typeof budget !== 'object' ||
      typeof budget.allowed !== 'boolean' ||
      !Number.isSafeInteger(budget.remaining) ||
      budget.remaining < 0
    ) {
      return outcome(
        DEMO_MUTATION_GUARD_OUTCOMES.BUDGET_UNAVAILABLE
      );
    }

    if (!budget.allowed) {
      return outcome(
        DEMO_MUTATION_GUARD_OUTCOMES.BUDGET_EXHAUSTED,
        0
      );
    }

    return outcome(
      DEMO_MUTATION_GUARD_OUTCOMES.ALLOWED,
      budget.remaining
    );
  }
}
