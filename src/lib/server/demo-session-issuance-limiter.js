import {
  createHmac
} from 'node:crypto';
import {
  isCanonicalDemoCsrfToken
} from './demo-session.js';

export const DEMO_SESSION_ISSUANCE_OUTCOMES =
  Object.freeze({
    ALLOWED: 'allowed',
    SUBJECT_EXHAUSTED:
      'subject-exhausted',
    GLOBAL_EXHAUSTED:
      'global-exhausted',
    UNAVAILABLE: 'unavailable'
  });

export class DemoSessionIssuanceConfigurationError
  extends Error {
  constructor() {
    super(
      'Demo session issuance limiter configuration is invalid.'
    );
    this.name =
      'DemoSessionIssuanceConfigurationError';
    this.code =
      'DEMO_SESSION_ISSUANCE_CONFIGURATION_INVALID';
  }
}

/** @param {unknown} store */
function assertStore(store) {
  if (
    store === null ||
    typeof store !== 'object' ||
    typeof /** @type {Record<string, unknown>} */ (
      store
    ).consume !== 'function'
  ) {
    throw new DemoSessionIssuanceConfigurationError();
  }
}

/**
 * Derive a Redis-compatible 256-bit opaque counter key.
 *
 * The raw subject is never used as Redis key material.
 *
 * @param {Buffer} secret
 * @param {string} domain
 * @param {string} value
 */
function deriveKey(
  secret,
  domain,
  value
) {
  return createHmac(
    'sha256',
    secret
  )
    .update(domain, 'utf8')
    .update('\0', 'utf8')
    .update(value, 'utf8')
    .digest('base64url');
}

/**
 * @param {number} now
 * @param {number} windowMs
 */
function windowExpiry(
  now,
  windowMs
) {
  const start =
    Math.floor(now / windowMs) *
    windowMs;

  const expiresAt =
    start + windowMs;

  if (
    !Number.isSafeInteger(expiresAt) ||
    expiresAt <= now
  ) {
    throw new DemoSessionIssuanceConfigurationError();
  }

  return expiresAt;
}

export class DemoSessionIssuanceLimiter {
  #store;
  #clock;
  #secret;
  #windowMs;
  #subjectLimit;
  #globalLimit;

  /**
   * @param {{
   *   store: unknown,
   *   clock?: () => number,
   *   secret: unknown,
   *   windowMs: unknown,
   *   subjectLimit: unknown,
   *   globalLimit: unknown
   * }} options
   */
  constructor({
    store,
    clock = Date.now,
    secret,
    windowMs,
    subjectLimit,
    globalLimit
  }) {
    assertStore(store);

    if (
      !isCanonicalDemoCsrfToken(
        secret
      ) ||
      !Number.isSafeInteger(
        windowMs
      ) ||
      /** @type {number} */ (
        windowMs
      ) <= 0 ||
      !Number.isSafeInteger(
        subjectLimit
      ) ||
      /** @type {number} */ (
        subjectLimit
      ) <= 0 ||
      !Number.isSafeInteger(
        globalLimit
      ) ||
      /** @type {number} */ (
        globalLimit
      ) <= 0 ||
      /** @type {number} */ (
        subjectLimit
      ) >
        /** @type {number} */ (
          globalLimit
        ) ||
      typeof clock !== 'function'
    ) {
      throw new DemoSessionIssuanceConfigurationError();
    }

    this.#store = store;
    this.#clock = clock;
    this.#secret =
      Buffer.from(
        /** @type {string} */ (
          secret
        ),
        'base64url'
      );
    this.#windowMs =
      /** @type {number} */ (
        windowMs
      );
    this.#subjectLimit =
      /** @type {number} */ (
        subjectLimit
      );
    this.#globalLimit =
      /** @type {number} */ (
        globalLimit
      );
  }

  /** @param {unknown} subject */
  async evaluate(subject) {
    if (
      typeof subject !== 'string' ||
      subject.length === 0 ||
      subject.length > 512
    ) {
      return Object.freeze({
        outcome:
          DEMO_SESSION_ISSUANCE_OUTCOMES
            .UNAVAILABLE
      });
    }

    let now;

    try {
      now = this.#clock();
    } catch {
      return Object.freeze({
        outcome:
          DEMO_SESSION_ISSUANCE_OUTCOMES
            .UNAVAILABLE
      });
    }

    if (
      !Number.isSafeInteger(now) ||
      now < 0
    ) {
      return Object.freeze({
        outcome:
          DEMO_SESSION_ISSUANCE_OUTCOMES
            .UNAVAILABLE
      });
    }

    let expiresAt;

    try {
      expiresAt =
        windowExpiry(
          now,
          this.#windowMs
        );
    } catch {
      return Object.freeze({
        outcome:
          DEMO_SESSION_ISSUANCE_OUTCOMES
            .UNAVAILABLE
      });
    }

    const subjectKey =
      deriveKey(
        this.#secret,
        'demo-issuance-subject-v1',
        subject
      );

    const globalKey =
      deriveKey(
        this.#secret,
        'demo-issuance-global-v1',
        'deployment'
      );

    /*
     * Subject budget is checked first so one exhausted subject cannot continue
     * burning the deployment-wide budget.
     */
    let subjectBudget;

    try {
      subjectBudget =
        await /** @type {any} */ (
          this.#store
        ).consume({
          key: subjectKey,
          limit:
            this.#subjectLimit,
          expiresAt
        });
    } catch {
      return Object.freeze({
        outcome:
          DEMO_SESSION_ISSUANCE_OUTCOMES
            .UNAVAILABLE
      });
    }

    if (
      subjectBudget === null ||
      typeof subjectBudget !==
        'object' ||
      typeof subjectBudget.allowed !==
        'boolean'
    ) {
      return Object.freeze({
        outcome:
          DEMO_SESSION_ISSUANCE_OUTCOMES
            .UNAVAILABLE
      });
    }

    if (!subjectBudget.allowed) {
      return Object.freeze({
        outcome:
          DEMO_SESSION_ISSUANCE_OUTCOMES
            .SUBJECT_EXHAUSTED
      });
    }

    let globalBudget;

    try {
      globalBudget =
        await /** @type {any} */ (
          this.#store
        ).consume({
          key: globalKey,
          limit:
            this.#globalLimit,
          expiresAt
        });
    } catch {
      return Object.freeze({
        outcome:
          DEMO_SESSION_ISSUANCE_OUTCOMES
            .UNAVAILABLE
      });
    }

    if (
      globalBudget === null ||
      typeof globalBudget !==
        'object' ||
      typeof globalBudget.allowed !==
        'boolean'
    ) {
      return Object.freeze({
        outcome:
          DEMO_SESSION_ISSUANCE_OUTCOMES
            .UNAVAILABLE
      });
    }

    if (!globalBudget.allowed) {
      return Object.freeze({
        outcome:
          DEMO_SESSION_ISSUANCE_OUTCOMES
            .GLOBAL_EXHAUSTED
      });
    }

    return Object.freeze({
      outcome:
        DEMO_SESSION_ISSUANCE_OUTCOMES
          .ALLOWED,
      expiresAt
    });
  }
}
