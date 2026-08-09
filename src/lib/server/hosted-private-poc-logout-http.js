import {
  HOSTED_MUTATION_GUARD_OUTCOMES
} from './hosted-mutation-guard.js';
import {
  getHostedPrivatePocRuntime
} from './hosted-private-poc-http.js';
import {
  clearHostedSessionCookie,
  readHostedSessionCookie,
  setHostedSessionCookie
} from './hosted-session-cookie.js';
import {
  HOSTED_ROUTE_GATE_OUTCOMES,
  isTrustedHostedRequestContext
} from './hosted-route-gate.js';
import {
  STUDIO_RUNTIME_MODES
} from '../studio-runtime.js';

export const HOSTED_PRIVATE_POC_LOGOUT_OUTCOMES =
  Object.freeze({
    NOT_FOUND: 'not-found',
    FORBIDDEN: 'forbidden',
    METHOD_NOT_ALLOWED: 'method-not-allowed',
    LOGGED_OUT: 'logged-out'
  });

/**
 * @param {'not-found' | 'forbidden' | 'method-not-allowed' | 'logged-out'} value
 */
function outcome(value) {
  return Object.freeze({
    outcome: value
  });
}

/**
 * Execute the complete logout security sequence in one server-side
 * boundary.
 *
 * Session resolution and current authorization happen first through
 * HostedRouteGate. If the lifecycle rotates the session, the browser
 * transport is updated before mutation-integrity evaluation so a
 * rejected logout does not strand the operator on a retired session
 * credential.
 *
 * Only after HostedMutationGuard returns allowed is server-side
 * session invalidation performed.
 *
 * @param {{
 *   runtimeMode:
 *     'visitor' | 'local' | 'hosted' | 'invalid',
 *   cookies: unknown,
 *   host?: unknown,
 *   origin?: unknown,
 *   method?: unknown,
 *   csrfToken?: unknown,
 *   runtimeResolver?: typeof getHostedPrivatePocRuntime
 * }} input
 */
export function performHostedPrivatePocLogout({
  runtimeMode,
  cookies,
  host,
  origin,
  method,
  csrfToken,
  runtimeResolver = getHostedPrivatePocRuntime
}) {
  if (runtimeMode !== STUDIO_RUNTIME_MODES.HOSTED) {
    return outcome(
      HOSTED_PRIVATE_POC_LOGOUT_OUTCOMES.NOT_FOUND
    );
  }

  let runtime;

  try {
    runtime = runtimeResolver(runtimeMode);
  } catch {
    return outcome(
      HOSTED_PRIVATE_POC_LOGOUT_OUTCOMES.NOT_FOUND
    );
  }

  if (runtime === null) {
    return outcome(
      HOSTED_PRIVATE_POC_LOGOUT_OUTCOMES.NOT_FOUND
    );
  }

  let presentedSessionId;

  try {
    presentedSessionId =
      readHostedSessionCookie(cookies);
  } catch {
    return outcome(
      HOSTED_PRIVATE_POC_LOGOUT_OUTCOMES.FORBIDDEN
    );
  }

  const routeDecision =
    runtime.evaluateRequest(
      runtimeMode,
      presentedSessionId
    );

  if (
    routeDecision.outcome !==
      HOSTED_ROUTE_GATE_OUTCOMES.ALLOWED ||
    !isTrustedHostedRequestContext(
      routeDecision.context
    )
  ) {
    if (
      routeDecision.outcome ===
        HOSTED_ROUTE_GATE_OUTCOMES.AUTHENTICATE &&
      presentedSessionId !== undefined
    ) {
      try {
        clearHostedSessionCookie(cookies);
      } catch {
        // Clearing failure cannot create logout authority.
      }
    }

    return outcome(
      HOSTED_PRIVATE_POC_LOGOUT_OUTCOMES.FORBIDDEN
    );
  }

  let effectiveSessionId =
    presentedSessionId;

  if (routeDecision.sessionTransport !== null) {
    if (
      typeof routeDecision.sessionTransport !==
        'object' ||
      typeof routeDecision.sessionTransport
        .replaceSessionId !== 'string'
    ) {
      return outcome(
        HOSTED_PRIVATE_POC_LOGOUT_OUTCOMES.FORBIDDEN
      );
    }

    effectiveSessionId =
      routeDecision.sessionTransport
        .replaceSessionId;

    try {
      setHostedSessionCookie(
        cookies,
        effectiveSessionId
      );
    } catch {
      /*
       * The old credential has already been retired by lifecycle
       * rotation. Fail closed by invalidating the replacement rather
       * than leaving unreachable server-side authority behind.
       */
      try {
        runtime.invalidateSession(
          effectiveSessionId
        );
      } catch {
        // Cleanup failure cannot create mutation authority.
      }

      return outcome(
        HOSTED_PRIVATE_POC_LOGOUT_OUTCOMES.FORBIDDEN
      );
    }
  }

  const mutationDecision =
    runtime.evaluateMutation({
      runtimeMode,
      trustedContext:
        routeDecision.context,
      host,
      origin,
      method,
      csrfToken
    });

  if (
    mutationDecision.outcome ===
    HOSTED_MUTATION_GUARD_OUTCOMES
      .METHOD_NOT_ALLOWED
  ) {
    return outcome(
      HOSTED_PRIVATE_POC_LOGOUT_OUTCOMES
        .METHOD_NOT_ALLOWED
    );
  }

  if (
    mutationDecision.outcome !==
      HOSTED_MUTATION_GUARD_OUTCOMES.ALLOWED
  ) {
    return outcome(
      HOSTED_PRIVATE_POC_LOGOUT_OUTCOMES.FORBIDDEN
    );
  }

  if (typeof effectiveSessionId === 'string') {
    runtime.invalidateSession(
      effectiveSessionId
    );
  }

  try {
    clearHostedSessionCookie(cookies);
  } catch {
    /*
     * Server-side authority is already gone. Cookie clearing failure
     * cannot restore it; the next request will fail session lookup.
     */
  }

  return outcome(
    HOSTED_PRIVATE_POC_LOGOUT_OUTCOMES.LOGGED_OUT
  );
}
