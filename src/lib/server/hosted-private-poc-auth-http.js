import {
  HOSTED_PRIVATE_POC_AUTH_RESULTS
} from './hosted-private-poc-runtime.js';
import {
  getHostedPrivatePocRuntime
} from './hosted-private-poc-http.js';
import {
  setHostedSessionCookie
} from './hosted-session-cookie.js';
import {
  STUDIO_RUNTIME_MODES
} from '../studio-runtime.js';

export const HOSTED_PRIVATE_POC_AUTH_HTTP_OUTCOMES =
  Object.freeze({
    NOT_FOUND: 'not-found',
    AUTHENTICATION_FAILED: 'authentication-failed',
    FORBIDDEN: 'forbidden',
    REDIRECT: 'redirect'
  });

/**
 * @param {'not-found' | 'authentication-failed' | 'forbidden' | 'redirect'} outcome
 * @param {string | null} [location]
 */
function result(outcome, location = null) {
  return Object.freeze({
    outcome,
    location
  });
}

/**
 * @param {{
 *   runtimeMode:
 *     'visitor' | 'local' | 'hosted' | 'demo' | 'invalid',
 *   returnTo?: unknown,
 *   runtimeResolver?: typeof getHostedPrivatePocRuntime
 * }} input
 */
export async function beginHostedPrivatePocLogin({
  runtimeMode,
  returnTo = undefined,
  runtimeResolver = getHostedPrivatePocRuntime
}) {
  if (runtimeMode !== STUDIO_RUNTIME_MODES.HOSTED) {
    return result(
      HOSTED_PRIVATE_POC_AUTH_HTTP_OUTCOMES.NOT_FOUND
    );
  }

  let runtime;

  try {
    runtime = runtimeResolver(runtimeMode);
  } catch {
    return result(
      HOSTED_PRIVATE_POC_AUTH_HTTP_OUTCOMES.NOT_FOUND
    );
  }

  if (runtime === null) {
    return result(
      HOSTED_PRIVATE_POC_AUTH_HTTP_OUTCOMES.NOT_FOUND
    );
  }

  try {
    const begun =
      await runtime.beginAuthentication(returnTo);

    return result(
      HOSTED_PRIVATE_POC_AUTH_HTTP_OUTCOMES.REDIRECT,
      begun.authorizationUrl
    );
  } catch {
    return result(
      HOSTED_PRIVATE_POC_AUTH_HTTP_OUTCOMES
        .AUTHENTICATION_FAILED
    );
  }
}

/**
 * @param {{
 *   runtimeMode:
 *     'visitor' | 'local' | 'hosted' | 'demo' | 'invalid',
 *   callback: {
 *     state?: unknown,
 *     code?: unknown,
 *     error?: unknown
 *   },
 *   cookies: unknown,
 *   runtimeResolver?: typeof getHostedPrivatePocRuntime
 * }} input
 */
export async function completeHostedPrivatePocCallback({
  runtimeMode,
  callback,
  cookies,
  runtimeResolver = getHostedPrivatePocRuntime
}) {
  if (runtimeMode !== STUDIO_RUNTIME_MODES.HOSTED) {
    return result(
      HOSTED_PRIVATE_POC_AUTH_HTTP_OUTCOMES.NOT_FOUND
    );
  }

  let runtime;

  try {
    runtime = runtimeResolver(runtimeMode);
  } catch {
    return result(
      HOSTED_PRIVATE_POC_AUTH_HTTP_OUTCOMES.NOT_FOUND
    );
  }

  if (runtime === null) {
    return result(
      HOSTED_PRIVATE_POC_AUTH_HTTP_OUTCOMES.NOT_FOUND
    );
  }

  let completed;

  try {
    completed =
      await runtime.completeAuthentication(callback);
  } catch {
    return result(
      HOSTED_PRIVATE_POC_AUTH_HTTP_OUTCOMES
        .AUTHENTICATION_FAILED
    );
  }

  if (
    completed.result ===
    HOSTED_PRIVATE_POC_AUTH_RESULTS.FORBIDDEN
  ) {
    return result(
      HOSTED_PRIVATE_POC_AUTH_HTTP_OUTCOMES.FORBIDDEN
    );
  }

  if (
    completed.result !==
      HOSTED_PRIVATE_POC_AUTH_RESULTS.AUTHORIZED ||
    typeof completed.sessionId !== 'string' ||
    typeof completed.returnTo !== 'string'
  ) {
    return result(
      HOSTED_PRIVATE_POC_AUTH_HTTP_OUTCOMES
        .AUTHENTICATION_FAILED
    );
  }

  try {
    setHostedSessionCookie(
      cookies,
      completed.sessionId
    );
  } catch {
    /*
     * Never retain newly-created server-side authority when the
     * browser transport could not be established.
     */
    try {
      await runtime.invalidateSession(
        completed.sessionId
      );
    } catch {
      // Cleanup failure must not turn this callback into success.
    }

    return result(
      HOSTED_PRIVATE_POC_AUTH_HTTP_OUTCOMES
        .AUTHENTICATION_FAILED
    );
  }

  return result(
    HOSTED_PRIVATE_POC_AUTH_HTTP_OUTCOMES.REDIRECT,
    completed.returnTo
  );
}
