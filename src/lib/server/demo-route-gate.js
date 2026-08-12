import {
  STUDIO_RUNTIME_MODES
} from '../studio-runtime.js';
import {
  isCanonicalDemoCsrfToken
} from './demo-session.js';

const TRUSTED_DEMO_REQUEST_CONTEXTS = new WeakSet();
const TRUSTED_DEMO_REQUEST_CSRF_TOKENS = new WeakMap();

export const DEMO_ROUTE_GATE_OUTCOMES = Object.freeze({
  NOT_FOUND: 'not-found',
  SESSION_REQUIRED: 'session-required',
  ALLOWED: 'allowed'
});

export class DemoRouteGateConfigurationError extends Error {
  /** @param {string} message */
  constructor(message) {
    super(message);
    this.name = 'DemoRouteGateConfigurationError';
    this.code = 'DEMO_ROUTE_GATE_CONFIGURATION_INVALID';
  }
}

export class DemoRequestContextTrustError extends Error {
  constructor(message = 'Trusted Demo request context is required.') {
    super(message);
    this.name = 'DemoRequestContextTrustError';
    this.code = 'DEMO_REQUEST_CONTEXT_UNTRUSTED';
  }
}

/**
 * @param {unknown} value
 * @returns {value is object}
 */
export function isTrustedDemoRequestContext(value) {
  return (
    value !== null &&
    typeof value === 'object' &&
    TRUSTED_DEMO_REQUEST_CONTEXTS.has(value)
  );
}

/**
 * @param {unknown} value
 * @returns {object}
 */
export function requireTrustedDemoRequestContext(value) {
  if (!isTrustedDemoRequestContext(value)) {
    throw new DemoRequestContextTrustError();
  }

  return value;
}

/**
 * @param {unknown} value
 * @returns {string}
 */
export function getTrustedDemoRequestCsrfToken(value) {
  const context = requireTrustedDemoRequestContext(value);
  const csrfToken =
    TRUSTED_DEMO_REQUEST_CSRF_TOKENS.get(context);

  if (!isCanonicalDemoCsrfToken(csrfToken)) {
    throw new DemoRequestContextTrustError(
      'Trusted Demo request CSRF capability is unavailable.'
    );
  }

  return csrfToken;
}

/**
 * @param {any} session
 */
function issueTrustedDemoRequestContext(session) {
  if (
    session === null ||
    typeof session !== 'object' ||
    !isCanonicalDemoCsrfToken(session.csrfToken)
  ) {
    throw new DemoRequestContextTrustError(
      'Demo request context session is invalid.'
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
      session[field] < 0
    ) {
      throw new DemoRequestContextTrustError(
        'Demo request context session metadata is invalid.'
      );
    }
  }

  if (
    session.createdAt > session.rotatedAt ||
    session.rotatedAt > session.lastSeenAt ||
    session.lastSeenAt > session.expiresAt
  ) {
    throw new DemoRequestContextTrustError(
      'Demo request context session metadata is invalid.'
    );
  }

  const context = Object.freeze({
    runtime: STUDIO_RUNTIME_MODES.DEMO,
    session: Object.freeze({
      createdAt: session.createdAt,
      rotatedAt: session.rotatedAt,
      expiresAt: session.expiresAt,
      lastSeenAt: session.lastSeenAt
    })
  });

  TRUSTED_DEMO_REQUEST_CONTEXTS.add(context);
  TRUSTED_DEMO_REQUEST_CSRF_TOKENS.set(
    context,
    session.csrfToken
  );

  return context;
}

/**
 * @param {unknown} lifecycle
 */
/**
 * A lifecycle implementation is trusted only to perform persistence mechanics.
 * The route gate independently verifies that request authority cannot change
 * between resolve, activity recording and credential rotation.
 *
 * @param {unknown} expected
 * @param {unknown} actual
 * @returns {boolean}
 */
function hasSameDemoSessionAuthority(expected, actual) {
  if (
    expected === null ||
    typeof expected !== 'object' ||
    actual === null ||
    typeof actual !== 'object'
  ) {
    return false;
  }

  const left =
    /** @type {Record<string, unknown>} */ (expected);
  const right =
    /** @type {Record<string, unknown>} */ (actual);

  return (
    isCanonicalDemoCsrfToken(left.csrfToken) &&
    isCanonicalDemoCsrfToken(right.csrfToken) &&
    left.csrfToken === right.csrfToken &&
    left.createdAt === right.createdAt &&
    left.expiresAt === right.expiresAt
  );
}

/**
 * @param {unknown} lifecycle
 */
function assertLifecycle(lifecycle) {
  if (
    lifecycle === null ||
    typeof lifecycle !== 'object'
  ) {
    throw new DemoRouteGateConfigurationError(
      'Demo session lifecycle is required.'
    );
  }

  for (const method of ['resolve', 'touch', 'rotate']) {
    if (
      typeof /** @type {Record<string, unknown>} */ (
        lifecycle
      )[method] !== 'function'
    ) {
      throw new DemoRouteGateConfigurationError(
        'Demo session lifecycle boundary is invalid.'
      );
    }
  }
}

/**
 * @param {'not-found' | 'session-required' | 'allowed'} outcome
 * @param {any} [context]
 * @param {{ replaceSessionId: string } | null} [sessionTransport]
 */
function result(
  outcome,
  context = null,
  sessionTransport = null
) {
  return Object.freeze({
    outcome,
    context,
    sessionTransport
  });
}

export class DemoRouteGate {
  #sessionLifecycle;

  /**
   * @param {{ sessionLifecycle: any }} options
   */
  constructor({ sessionLifecycle }) {
    assertLifecycle(sessionLifecycle);
    this.#sessionLifecycle = sessionLifecycle;
  }

  /**
   * @param {unknown} runtimeMode
   * @param {unknown} sessionId
   */
  async evaluate(runtimeMode, sessionId) {
    if (runtimeMode !== STUDIO_RUNTIME_MODES.DEMO) {
      return result(
        DEMO_ROUTE_GATE_OUTCOMES.NOT_FOUND
      );
    }

    const resolved =
      await this.#sessionLifecycle.resolve(sessionId);

    if (
      resolved === null ||
      !isCanonicalDemoCsrfToken(
        resolved.session?.csrfToken
      )
    ) {
      return result(
        DEMO_ROUTE_GATE_OUTCOMES.SESSION_REQUIRED
      );
    }

    const touched =
      await this.#sessionLifecycle.touch(sessionId);

    if (
      touched === null ||
      !hasSameDemoSessionAuthority(
        resolved.session,
        touched.session
      )
    ) {
      return result(
        DEMO_ROUTE_GATE_OUTCOMES.SESSION_REQUIRED
      );
    }

    let effectiveSession = touched.session;
    let sessionTransport = null;

    if (touched.rotationDue) {
      const rotated =
        await this.#sessionLifecycle.rotate(sessionId);

      if (
        rotated === null ||
        !hasSameDemoSessionAuthority(
          resolved.session,
          rotated
        )
      ) {
        return result(
          DEMO_ROUTE_GATE_OUTCOMES.SESSION_REQUIRED
        );
      }

      effectiveSession = rotated;
      sessionTransport = Object.freeze({
        replaceSessionId: rotated.sessionId
      });
    }

    const context =
      issueTrustedDemoRequestContext(effectiveSession);

    return result(
      DEMO_ROUTE_GATE_OUTCOMES.ALLOWED,
      context,
      sessionTransport
    );
  }
}
