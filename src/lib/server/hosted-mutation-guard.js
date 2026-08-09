import { timingSafeEqual } from 'node:crypto';
import {
  STUDIO_RUNTIME_MODES
} from '../studio-runtime.js';
import {
  getTrustedHostedRequestCsrfToken,
  isTrustedHostedRequestContext
} from './hosted-request-context.js';
import {
  parseHostedOriginConfig
} from './hosted-origin.js';
import {
  isCanonicalHostedCsrfToken
} from './hosted-session.js';
import {
  HOSTED_SECURITY_EVENT_TYPES,
  NOOP_HOSTED_SECURITY_EVENT_RECORDER
} from './hosted-security-events.js';

const SUPPORTED_MUTATION_METHODS =
  /** @type {ReadonlySet<string>} */ (
    new Set(['POST', 'PUT', 'PATCH', 'DELETE'])
  );

export const HOSTED_MUTATION_GUARD_OUTCOMES = Object.freeze({
  NOT_FOUND: 'not-found',
  FORBIDDEN: 'forbidden',
  METHOD_NOT_ALLOWED: 'method-not-allowed',
  ALLOWED: 'allowed'
});

export class HostedMutationGuardConfigurationError extends Error {
  /**
   * @param {string} message
   */
  constructor(message) {
    super(message);
    this.name = 'HostedMutationGuardConfigurationError';
    this.code = 'HOSTED_MUTATION_GUARD_CONFIGURATION_INVALID';
  }
}

/**
 * @param {string} expected
 * @param {string} presented
 */
function csrfTokensEqual(expected, presented) {
  if (
    !isCanonicalHostedCsrfToken(expected) ||
    !isCanonicalHostedCsrfToken(presented)
  ) {
    return false;
  }

  const expectedBytes = Buffer.from(expected, 'base64url');
  const presentedBytes = Buffer.from(presented, 'base64url');

  return (
    expectedBytes.length === presentedBytes.length &&
    timingSafeEqual(expectedBytes, presentedBytes)
  );
}

/**
 * @param {string} outcome
 */
function outcome(outcome) {
  return Object.freeze({ outcome });
}

/**
 * @param {unknown} recorder
 */
function assertSecurityEventRecorder(recorder) {
  if (
    recorder === null ||
    typeof recorder !== 'object' ||
    typeof /** @type {Record<string, unknown>} */ (recorder)
      .record !== 'function'
  ) {
    throw new HostedMutationGuardConfigurationError(
      'Hosted security event recorder does not implement the required boundary.'
    );
  }
}

export class HostedMutationGuard {
  #originConfig;

  /** @type {{ record(type: unknown, reason?: unknown): unknown }} */
  #securityEventRecorder;

  /**
   * @param {{
   *   environment?: unknown,
   *   securityEventRecorder?: unknown
   * }} [options]
   */
  constructor(options = {}) {
    const securityEventRecorder =
      options.securityEventRecorder === undefined
        ? NOOP_HOSTED_SECURITY_EVENT_RECORDER
        : options.securityEventRecorder;

    assertSecurityEventRecorder(securityEventRecorder);

    try {
      this.#originConfig =
        parseHostedOriginConfig(options.environment);
    } catch {
      throw new HostedMutationGuardConfigurationError(
        'Hosted mutation origin configuration is invalid.'
      );
    }

    this.#securityEventRecorder =
      /** @type {{ record(type: unknown, reason?: unknown): unknown }} */ (
        securityEventRecorder
      );
  }

  /**
   * @param {string} type
   */
  #recordSecurityEvent(type) {
    try {
      this.#securityEventRecorder.record(type);
    } catch {
      // Operational logging cannot alter mutation authority.
    }
  }

  /**
   * @param {string} type
   */
  #forbidWithSecurityEvent(type) {
    this.#recordSecurityEvent(type);

    return outcome(
      HOSTED_MUTATION_GUARD_OUTCOMES.FORBIDDEN
    );
  }

  /**
   * Enforce the ADR 0009 Hosted mutation-integrity sequence.
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
  evaluate(request = {}) {
    const {
      runtimeMode,
      trustedContext,
      host,
      origin,
      method,
      csrfToken
    } = request;

    if (runtimeMode !== STUDIO_RUNTIME_MODES.HOSTED) {
      return outcome(HOSTED_MUTATION_GUARD_OUTCOMES.NOT_FOUND);
    }

    if (!isTrustedHostedRequestContext(trustedContext)) {
      return outcome(HOSTED_MUTATION_GUARD_OUTCOMES.FORBIDDEN);
    }

    if (
      typeof host !== 'string' ||
      host !== this.#originConfig.host
    ) {
      return this.#forbidWithSecurityEvent(
        HOSTED_SECURITY_EVENT_TYPES.HOST_REJECTED
      );
    }

    if (
      typeof origin !== 'string' ||
      origin !== this.#originConfig.origin
    ) {
      return this.#forbidWithSecurityEvent(
        HOSTED_SECURITY_EVENT_TYPES.ORIGIN_REJECTED
      );
    }

    if (
      typeof method !== 'string' ||
      !SUPPORTED_MUTATION_METHODS.has(method)
    ) {
      return outcome(
        HOSTED_MUTATION_GUARD_OUTCOMES.METHOD_NOT_ALLOWED
      );
    }

    if (!isCanonicalHostedCsrfToken(csrfToken)) {
      return this.#forbidWithSecurityEvent(
        HOSTED_SECURITY_EVENT_TYPES.CSRF_REJECTED
      );
    }

    let expectedCsrfToken;

    try {
      expectedCsrfToken =
        getTrustedHostedRequestCsrfToken(trustedContext);
    } catch {
      return this.#forbidWithSecurityEvent(
        HOSTED_SECURITY_EVENT_TYPES.CSRF_REJECTED
      );
    }

    if (!csrfTokensEqual(expectedCsrfToken, csrfToken)) {
      return this.#forbidWithSecurityEvent(
        HOSTED_SECURITY_EVENT_TYPES.CSRF_REJECTED
      );
    }

    return outcome(HOSTED_MUTATION_GUARD_OUTCOMES.ALLOWED);
  }
}
