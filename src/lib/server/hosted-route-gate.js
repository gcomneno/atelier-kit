import {
  assertHostedAuthorizationConfig,
  isHostedSessionIdentityAuthorized
} from './hosted-authorization.js';
import {
  canonicalGitHubSubject,
  HOSTED_IDENTITY_PROVIDERS
} from './hosted-identity.js';
import {
  STUDIO_RUNTIME_MODES
} from '../studio-runtime.js';
import {
  isCanonicalHostedCsrfToken
} from './hosted-session.js';
import {
  HOSTED_SECURITY_EVENT_REASONS,
  HOSTED_SECURITY_EVENT_TYPES,
  NOOP_HOSTED_SECURITY_EVENT_RECORDER
} from './hosted-security-events.js';

/**
 * @typedef {{
 *   resolve(sessionId: unknown): Promise<any>,
 *   touch(sessionId: unknown): Promise<any>,
 *   rotate(sessionId: unknown): Promise<any>
 * }} HostedSessionLifecycleBoundary
 */

const TRUSTED_HOSTED_REQUEST_CONTEXTS = new WeakSet();
const TRUSTED_HOSTED_REQUEST_CSRF_TOKENS = new WeakMap();

export const HOSTED_ROUTE_GATE_OUTCOMES = Object.freeze({
  NOT_FOUND: 'not-found',
  LOCAL: 'local',
  AUTHENTICATE: 'authenticate',
  FORBIDDEN: 'forbidden',
  ALLOWED: 'allowed'
});

export class HostedRouteGateConfigurationError extends Error {
  /**
   * @param {string} message
   */
  constructor(message) {
    super(message);
    this.name = 'HostedRouteGateConfigurationError';
    this.code = 'HOSTED_ROUTE_GATE_CONFIGURATION_INVALID';
  }
}

export class HostedRequestContextTrustError extends Error {
  /**
   * @param {string} [message]
   */
  constructor(message = 'Trusted Hosted request context is required.') {
    super(message);
    this.name = 'HostedRequestContextTrustError';
    this.code = 'HOSTED_REQUEST_CONTEXT_UNTRUSTED';
  }
}

/**
 * @param {unknown} value
 * @returns {boolean}
 */
export function isTrustedHostedRequestContext(value) {
  return (
    value !== null &&
    typeof value === 'object' &&
    TRUSTED_HOSTED_REQUEST_CONTEXTS.has(value)
  );
}

/**
 * @param {unknown} value
 */
export function requireTrustedHostedRequestContext(value) {
  if (!isTrustedHostedRequestContext(value)) {
    throw new HostedRequestContextTrustError();
  }

  return value;
}

/**
 * Server-only capability accessor.
 *
 * The synchronizer token is associated privately with a genuinely trusted
 * context and never becomes part of the context's enumerable public shape.
 *
 * @param {unknown} value
 * @returns {string}
 */
export function getTrustedHostedRequestCsrfToken(value) {
  const context = /** @type {object} */ (
    requireTrustedHostedRequestContext(value)
  );
  const csrfToken = TRUSTED_HOSTED_REQUEST_CSRF_TOKENS.get(context);

  if (!isCanonicalHostedCsrfToken(csrfToken)) {
    throw new HostedRequestContextTrustError(
      'Trusted Hosted request CSRF capability is unavailable.'
    );
  }

  return csrfToken;
}

/**
 * Private issuance primitive.
 *
 * No exported API can mint a trusted context directly. Context issuance occurs
 * only after HostedRouteGate has validated the session and current policy.
 *
 * @param {unknown} input
 */
function issueTrustedHostedRequestContext(input) {
  if (
    input === null ||
    typeof input !== 'object' ||
    Array.isArray(input)
  ) {
    throw new HostedRequestContextTrustError(
      'Hosted request context input is invalid.'
    );
  }

  const record = /** @type {Record<string, unknown>} */ (input);

  if (
    record.identity === null ||
    typeof record.identity !== 'object' ||
    Array.isArray(record.identity) ||
    record.session === null ||
    typeof record.session !== 'object' ||
    Array.isArray(record.session)
  ) {
    throw new HostedRequestContextTrustError(
      'Hosted request context input is invalid.'
    );
  }

  const identity =
    /** @type {Record<string, unknown>} */ (record.identity);
  const session =
    /** @type {Record<string, unknown>} */ (record.session);

  if (!isCanonicalHostedCsrfToken(record.csrfToken)) {
    throw new HostedRequestContextTrustError(
      'Hosted request context CSRF capability is invalid.'
    );
  }

  const csrfToken = record.csrfToken;

  if (identity.provider !== HOSTED_IDENTITY_PROVIDERS.GITHUB) {
    throw new HostedRequestContextTrustError(
      'Hosted request context identity is invalid.'
    );
  }

  let subject;

  try {
    subject = canonicalGitHubSubject(identity.subject);
  } catch {
    throw new HostedRequestContextTrustError(
      'Hosted request context identity is invalid.'
    );
  }

  for (const field of [
    'createdAt',
    'rotatedAt',
    'expiresAt',
    'lastSeenAt'
  ]) {
    if (
      !Number.isSafeInteger(session[field]) ||
      /** @type {number} */ (session[field]) < 0
    ) {
      throw new HostedRequestContextTrustError(
        'Hosted request context session metadata is invalid.'
      );
    }
  }

  const createdAt = /** @type {number} */ (session.createdAt);
  const rotatedAt = /** @type {number} */ (session.rotatedAt);
  const expiresAt = /** @type {number} */ (session.expiresAt);
  const lastSeenAt = /** @type {number} */ (session.lastSeenAt);

  if (
    createdAt > rotatedAt ||
    rotatedAt > lastSeenAt ||
    lastSeenAt > expiresAt
  ) {
    throw new HostedRequestContextTrustError(
      'Hosted request context session metadata is invalid.'
    );
  }

  const context = Object.freeze({
    runtime: 'hosted',
    identity: Object.freeze({
      provider: HOSTED_IDENTITY_PROVIDERS.GITHUB,
      subject
    }),
    session: Object.freeze({
      createdAt,
      rotatedAt,
      expiresAt,
      lastSeenAt
    })
  });

  TRUSTED_HOSTED_REQUEST_CONTEXTS.add(context);
  TRUSTED_HOSTED_REQUEST_CSRF_TOKENS.set(context, csrfToken);

  return context;
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
    throw new HostedRouteGateConfigurationError(
      'Hosted security event recorder does not implement the required boundary.'
    );
  }
}

/**
 * @param {unknown} lifecycle
 * @returns {asserts lifecycle is HostedSessionLifecycleBoundary}
 */
function assertSessionLifecycle(lifecycle) {
  if (
    lifecycle === null ||
    typeof lifecycle !== 'object'
  ) {
    throw new HostedRouteGateConfigurationError(
      'Hosted session lifecycle is required.'
    );
  }

  for (const method of ['resolve', 'touch', 'rotate']) {
    if (
      typeof /** @type {Record<string, unknown>} */ (lifecycle)[method] !==
      'function'
    ) {
      throw new HostedRouteGateConfigurationError(
        'Hosted session lifecycle boundary is invalid.'
      );
    }
  }
}

/**
 * @param {string} outcome
 */
function simpleOutcome(outcome) {
  return Object.freeze({
    outcome,
    context: null,
    sessionTransport: null
  });
}

/**
 * @param {any} session
 */
function publicSessionMetadata(session) {
  return {
    createdAt: session.createdAt,
    rotatedAt: session.rotatedAt,
    expiresAt: session.expiresAt,
    lastSeenAt: session.lastSeenAt
  };
}

/**
 * @param {any} first
 * @param {any} second
 * @returns {boolean}
 */
function hasSameSessionAuthority(first, second) {
  return (
    first !== null &&
    typeof first === 'object' &&
    second !== null &&
    typeof second === 'object' &&
    first.identity !== null &&
    typeof first.identity === 'object' &&
    second.identity !== null &&
    typeof second.identity === 'object' &&
    first.identity.provider === second.identity.provider &&
    first.identity.subject === second.identity.subject &&
    isCanonicalHostedCsrfToken(first.csrfToken) &&
    second.csrfToken === first.csrfToken
  );
}

export class HostedRouteGate {
  /** @type {HostedSessionLifecycleBoundary} */
  #sessionLifecycle;

  /** @type {unknown} */
  #authorizationConfig;

  /** @type {any} */
  #securityEventRecorder;

  /**
   * @param {{
   *   sessionLifecycle?: unknown,
   *   authorizationConfig?: unknown,
   *   securityEventRecorder?: unknown
   * }} [options]
   */
  constructor(options = {}) {
    const {
      sessionLifecycle,
      authorizationConfig,
      securityEventRecorder =
        NOOP_HOSTED_SECURITY_EVENT_RECORDER
    } = options;

    assertSessionLifecycle(sessionLifecycle);
    assertHostedAuthorizationConfig(authorizationConfig);
    assertSecurityEventRecorder(securityEventRecorder);

    this.#sessionLifecycle = sessionLifecycle;
    this.#authorizationConfig = authorizationConfig;
    this.#securityEventRecorder = securityEventRecorder;
  }

  /**
   * @param {string} type
   * @param {string} [reason]
   */
  #recordSecurityEvent(type, reason = undefined) {
    try {
      this.#securityEventRecorder.record(type, reason);
    } catch {
      // Logging is best-effort and cannot affect route authority.
    }
  }

  /**
   * @param {unknown} sessionId
   */
  #recordSessionRejectionIfPresented(sessionId) {
    if (sessionId === undefined || sessionId === null) {
      return;
    }

    this.#recordSecurityEvent(
      HOSTED_SECURITY_EVENT_TYPES.SESSION_REJECTED,
      HOSTED_SECURITY_EVENT_REASONS.SESSION_INVALID
    );
  }

  /**
   * @param {unknown} runtimeMode
   * @param {unknown} [sessionId]
   */
  async evaluate(runtimeMode, sessionId) {
    if (runtimeMode === STUDIO_RUNTIME_MODES.LOCAL) {
      return simpleOutcome(HOSTED_ROUTE_GATE_OUTCOMES.LOCAL);
    }

    if (runtimeMode !== STUDIO_RUNTIME_MODES.HOSTED) {
      return simpleOutcome(HOSTED_ROUTE_GATE_OUTCOMES.NOT_FOUND);
    }

    const resolved = await this.#sessionLifecycle.resolve(sessionId);

    if (resolved === null) {
      this.#recordSessionRejectionIfPresented(sessionId);
      return simpleOutcome(HOSTED_ROUTE_GATE_OUTCOMES.AUTHENTICATE);
    }

    if (!isCanonicalHostedCsrfToken(resolved.session.csrfToken)) {
      this.#recordSessionRejectionIfPresented(sessionId);
      return simpleOutcome(HOSTED_ROUTE_GATE_OUTCOMES.AUTHENTICATE);
    }

    if (
      !isHostedSessionIdentityAuthorized(
        resolved.session.identity,
        this.#authorizationConfig
      )
    ) {
      this.#recordSecurityEvent(
        HOSTED_SECURITY_EVENT_TYPES.AUTHORIZATION_REJECTED
      );

      return simpleOutcome(HOSTED_ROUTE_GATE_OUTCOMES.FORBIDDEN);
    }

    const touched = await this.#sessionLifecycle.touch(sessionId);

    if (
      touched === null ||
      !hasSameSessionAuthority(resolved.session, touched.session)
    ) {
      this.#recordSessionRejectionIfPresented(sessionId);
      return simpleOutcome(HOSTED_ROUTE_GATE_OUTCOMES.AUTHENTICATE);
    }

    let effectiveSession = touched.session;
    let sessionTransport = null;

    if (touched.rotationDue) {
      const rotated = await this.#sessionLifecycle.rotate(sessionId);

      if (
        rotated === null ||
        !hasSameSessionAuthority(resolved.session, rotated)
      ) {
        this.#recordSessionRejectionIfPresented(sessionId);
        return simpleOutcome(HOSTED_ROUTE_GATE_OUTCOMES.AUTHENTICATE);
      }

      effectiveSession = rotated;
      sessionTransport = Object.freeze({
        replaceSessionId: rotated.sessionId
      });
    }

    const context = issueTrustedHostedRequestContext({
      identity: effectiveSession.identity,
      session: publicSessionMetadata(effectiveSession),
      csrfToken: effectiveSession.csrfToken
    });

    return Object.freeze({
      outcome: HOSTED_ROUTE_GATE_OUTCOMES.ALLOWED,
      context,
      sessionTransport
    });
  }
}

/**
 * @param {unknown} runtimeMode
 * @returns {boolean}
 */
export function isHostedAuthenticationRouteEligible(runtimeMode) {
  return runtimeMode === STUDIO_RUNTIME_MODES.HOSTED;
}
