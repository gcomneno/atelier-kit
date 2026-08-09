const HOSTED_SECURITY_EVENT_VERSION = 1;

const TRUSTED_HOSTED_SECURITY_EVENTS = new WeakSet();

export const HOSTED_SECURITY_EVENT_TYPES = Object.freeze({
  AUTHENTICATION_FAILED: 'authentication-failed',
  OAUTH_STATE_REJECTED: 'oauth-state-rejected',
  AUTHORIZATION_REJECTED: 'authorization-rejected',
  SESSION_REJECTED: 'session-rejected',
  SESSION_INVALIDATED: 'session-invalidated',
  HOST_REJECTED: 'host-rejected',
  ORIGIN_REJECTED: 'origin-rejected',
  CSRF_REJECTED: 'csrf-rejected'
});

export const HOSTED_SECURITY_EVENT_REASONS = Object.freeze({
  OAUTH_STATE_MALFORMED: 'oauth-state-malformed',
  OAUTH_STATE_UNKNOWN_OR_REPLAYED:
    'oauth-state-unknown-or-replayed',
  OAUTH_STATE_EXPIRED: 'oauth-state-expired',
  OAUTH_CALLBACK_REJECTED: 'oauth-callback-rejected',
  OAUTH_PROVIDER_FAILED: 'oauth-provider-failed',
  SESSION_INVALID: 'session-invalid',
  SESSION_EXPIRED: 'session-expired',
  SESSION_LOGOUT: 'session-logout',
  SESSION_EXPLICIT_INVALIDATION:
    'session-explicit-invalidation'
});

const EVENT_TYPES =
  /** @type {ReadonlySet<string>} */ (
    new Set(Object.values(HOSTED_SECURITY_EVENT_TYPES))
  );

const EVENT_REASONS =
  /** @type {Readonly<Record<string, ReadonlySet<string>>>} */ (
    Object.freeze({
  [HOSTED_SECURITY_EVENT_TYPES.AUTHENTICATION_FAILED]:
    new Set([
      HOSTED_SECURITY_EVENT_REASONS.OAUTH_CALLBACK_REJECTED,
      HOSTED_SECURITY_EVENT_REASONS.OAUTH_PROVIDER_FAILED
    ]),
  [HOSTED_SECURITY_EVENT_TYPES.OAUTH_STATE_REJECTED]:
    new Set([
      HOSTED_SECURITY_EVENT_REASONS.OAUTH_STATE_MALFORMED,
      HOSTED_SECURITY_EVENT_REASONS
        .OAUTH_STATE_UNKNOWN_OR_REPLAYED,
      HOSTED_SECURITY_EVENT_REASONS.OAUTH_STATE_EXPIRED
    ]),
  [HOSTED_SECURITY_EVENT_TYPES.AUTHORIZATION_REJECTED]:
    new Set(),
  [HOSTED_SECURITY_EVENT_TYPES.SESSION_REJECTED]:
    new Set([
      HOSTED_SECURITY_EVENT_REASONS.SESSION_INVALID,
      HOSTED_SECURITY_EVENT_REASONS.SESSION_EXPIRED
    ]),
  [HOSTED_SECURITY_EVENT_TYPES.SESSION_INVALIDATED]:
    new Set([
      HOSTED_SECURITY_EVENT_REASONS.SESSION_LOGOUT,
      HOSTED_SECURITY_EVENT_REASONS
        .SESSION_EXPLICIT_INVALIDATION
    ]),
  [HOSTED_SECURITY_EVENT_TYPES.HOST_REJECTED]:
    new Set(),
  [HOSTED_SECURITY_EVENT_TYPES.ORIGIN_REJECTED]:
    new Set(),
  [HOSTED_SECURITY_EVENT_TYPES.CSRF_REJECTED]:
    new Set()
  })
);

export class HostedSecurityEventConfigurationError extends Error {
  /**
   * @param {string} message
   */
  constructor(message) {
    super(message);
    this.name = 'HostedSecurityEventConfigurationError';
    this.code = 'HOSTED_SECURITY_EVENT_CONFIGURATION_INVALID';
  }
}

/**
 * @param {unknown} type
 * @param {unknown} reason
 */
function isValidEventSelection(type, reason) {
  if (
    typeof type !== 'string' ||
    !EVENT_TYPES.has(type)
  ) {
    return false;
  }

  if (reason === undefined) {
    return true;
  }

  if (typeof reason !== 'string') {
    return false;
  }

  return EVENT_REASONS[type].has(reason);
}

/**
 * Serialize only a genuine normalized security event.
 *
 * Arbitrary caller-owned objects are intentionally rejected so this helper
 * can never become a generic "JSON.stringify and hope redaction worked"
 * boundary.
 *
 * @param {unknown} value
 */
export function serializeHostedSecurityEvent(value) {
  if (
    value === null ||
    typeof value !== 'object' ||
    !TRUSTED_HOSTED_SECURITY_EVENTS.has(value)
  ) {
    throw new HostedSecurityEventConfigurationError(
      'Hosted security event serialization requires a trusted event.'
    );
  }

  return JSON.stringify(value);
}

export class HostedSecurityEventRecorder {
  #clock;
  #sink;

  /**
   * @param {{
   *   clock?: () => number,
   *   sink?: (event: Readonly<{
   *     version: number,
   *     type: string,
   *     occurredAt: number,
   *     reason?: string
   *   }>) => unknown
   * }} [options]
   */
  constructor({
    clock = Date.now,
    sink = () => {}
  } = {}) {
    if (typeof clock !== 'function') {
      throw new HostedSecurityEventConfigurationError(
        'Hosted security event clock must be callable.'
      );
    }

    if (typeof sink !== 'function') {
      throw new HostedSecurityEventConfigurationError(
        'Hosted security event sink must be callable.'
      );
    }

    this.#clock = clock;
    this.#sink = sink;
  }

  /**
   * Best-effort operational telemetry.
   *
   * Invalid event selections, invalid timestamps and sink failures are
   * deliberately contained. Security decisions must never depend on logging
   * succeeding.
   *
   * @param {unknown} type
   * @param {unknown} [reason]
   * @returns {boolean}
   */
  record(type, reason = undefined) {
    if (!isValidEventSelection(type, reason)) {
      return false;
    }

    let occurredAt;

    try {
      occurredAt = this.#clock();
    } catch {
      return false;
    }

    if (
      !Number.isSafeInteger(occurredAt) ||
      occurredAt < 0
    ) {
      return false;
    }

    const canonicalType = /** @type {string} */ (type);
    const canonicalReason =
      /** @type {string | undefined} */ (reason);

    const event = {
      version: HOSTED_SECURITY_EVENT_VERSION,
      type: canonicalType,
      occurredAt
    };

    if (canonicalReason !== undefined) {
      Object.assign(event, {
        reason: canonicalReason
      });
    }

    const normalizedEvent = Object.freeze(event);
    TRUSTED_HOSTED_SECURITY_EVENTS.add(normalizedEvent);

    try {
      this.#sink(normalizedEvent);
    } catch {
      return false;
    }

    return true;
  }
}

export const NOOP_HOSTED_SECURITY_EVENT_RECORDER =
  Object.freeze({
    /**
     * @param {unknown} _type
     * @param {unknown} [_reason]
     */
    record(_type, _reason = undefined) {
      return false;
    }
  });
