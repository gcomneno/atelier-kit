import {
  HOSTED_ROUTE_GATE_OUTCOMES,
  isTrustedHostedRequestContext
} from './hosted-route-gate.js';
import {
  clearHostedSessionCookie,
  readHostedSessionCookie,
  setHostedSessionCookie
} from './hosted-session-cookie.js';
import {
  HostedPrivatePocRuntime,
  createHostedPrivatePocRuntime
} from './hosted-private-poc-runtime.js';
import {
  STUDIO_RUNTIME_MODES
} from '../studio-runtime.js';

export const HOSTED_PRIVATE_POC_HTTP_OUTCOMES =
  Object.freeze({
    INERT: 'inert',
    AUTHENTICATE: 'authenticate',
    FORBIDDEN: 'forbidden',
    ALLOWED: 'allowed'
  });

export class HostedPrivatePocHttpError extends Error {
  constructor() {
    super('Hosted private PoC HTTP boundary failed.');
    this.name = 'HostedPrivatePocHttpError';
    this.code = 'HOSTED_PRIVATE_POC_HTTP_ERROR';
  }
}

/**
 * Create one lazy runtime resolver.
 *
 * The active runtime is instantiated once and then retained for the lifetime
 * of this server process. For `single-process`, that instance owns the
 * in-memory state; `persistent-redis` authority remains in Redis.
 *
 * @param {{
 *   environment?: unknown,
 *   dependencies?: {
 *     transport?: {
 *       exchangeAuthorizationCode(input: any): Promise<string>,
 *       fetchAuthenticatedUser(accessToken: string): Promise<unknown>
 *     },
 *     clock?: () => number,
 *     oauthSecretGenerator?: () => string,
 *     sessionIdGenerator?: () => string,
 *     csrfTokenGenerator?: () => string,
 *     securityEventRecorder?: {
 *       record(type: unknown, reason?: unknown): boolean
 *     }
 *   }
 * }} [options]
 */
export function createHostedPrivatePocRuntimeResolver({
  environment = process.env,
  dependencies = {}
} = {}) {
  let initialized = false;

  /** @type {HostedPrivatePocRuntime | null} */
  let runtime = null;

  /**
   * @param {'visitor' | 'local' | 'hosted' | 'demo' | 'invalid'} runtimeMode
   */
  return function resolveRuntime(runtimeMode) {
    if (runtimeMode !== STUDIO_RUNTIME_MODES.HOSTED) {
      return null;
    }

    if (!initialized) {
      const created =
        createHostedPrivatePocRuntime(
          runtimeMode,
          environment,
          dependencies
        );

      if (
        created !== null &&
        !(created instanceof HostedPrivatePocRuntime)
      ) {
        throw new HostedPrivatePocHttpError();
      }

      runtime = created;
      initialized = true;
    }

    return runtime;
  };
}

const resolveProcessHostedPrivatePocRuntime =
  createHostedPrivatePocRuntimeResolver();

/**
 * Shared process-local composition root used by the hook and
 * future live `/auth/**` adapters.
 *
 * @param {'visitor' | 'local' | 'hosted' | 'demo' | 'invalid'} runtimeMode
 */
export function getHostedPrivatePocRuntime(
  runtimeMode
) {
  return resolveProcessHostedPrivatePocRuntime(
    runtimeMode
  );
}

/**
 * @param {unknown} event
 */
function assertHttpEvent(event) {
  if (
    event === null ||
    typeof event !== 'object' ||
    Array.isArray(event)
  ) {
    throw new HostedPrivatePocHttpError();
  }

  const record =
    /** @type {Record<string, unknown>} */ (event);

  if (
    !(record.url instanceof URL) ||
    record.request === null ||
    typeof record.request !== 'object' ||
    record.cookies === null ||
    typeof record.cookies !== 'object' ||
    record.locals === null ||
    typeof record.locals !== 'object'
  ) {
    throw new HostedPrivatePocHttpError();
  }

  const request =
    /** @type {Record<string, unknown>} */ (
      record.request
    );

  if (typeof request.method !== 'string') {
    throw new HostedPrivatePocHttpError();
  }
}

const HOSTED_PRIVATE_POC_READ_PATHS =
  /** @type {ReadonlySet<string>} */ (
    new Set([
      '/studio',
      '/studio/site/social',
      '/studio/site/hero'
    ])
  );

/**
 * The private Hosted PoC admits only explicitly enumerated request shapes:
 *
 * - GET /studio
 * - GET /studio/site/social
 * - POST /studio/site/social
 * - GET /studio/site/hero
 * - POST /studio/site/hero
 *
 * No other deeper Studio path or mutation method receives trusted
 * Hosted request context.
 *
 * @param {unknown} event
 */
export function isHostedPrivatePocStudioAuthorizedRequest(
  event
) {
  assertHttpEvent(event);

  const record =
    /** @type {{
     *   url: URL,
     *   request: { method: string }
     * }} */ (event);

  if (
    record.request.method === 'GET' &&
    HOSTED_PRIVATE_POC_READ_PATHS.has(
      record.url.pathname
    )
  ) {
    return true;
  }

  return (
    (
      record.url.pathname ===
        '/studio/site/social' ||
      record.url.pathname ===
        '/studio/site/hero'
    ) &&
    record.request.method === 'POST'
  );
}

/**
 * Apply only the request-to-authority transport seam.
 *
 * No redirects or route responses are produced here. Route loaders
 * remain responsible for browser-facing authenticate/forbidden
 * semantics in the later live-route slice.
 *
 * @param {{
 *   event: unknown,
 *   runtimeMode:
 *     'visitor' | 'local' | 'hosted' | 'demo' | 'invalid',
 *   runtimeResolver?: (
 *     runtimeMode:
 *       'visitor' | 'local' | 'hosted' | 'demo' | 'invalid'
 *   ) => HostedPrivatePocRuntime | null
 * }} input
 */
export async function applyHostedPrivatePocStudioAuthorizedRequest({
  event,
  runtimeMode,
  runtimeResolver =
    getHostedPrivatePocRuntime
}) {
  assertHttpEvent(event);

  if (
    runtimeMode !== STUDIO_RUNTIME_MODES.HOSTED ||
    !isHostedPrivatePocStudioAuthorizedRequest(event)
  ) {
    return HOSTED_PRIVATE_POC_HTTP_OUTCOMES.INERT;
  }

  if (typeof runtimeResolver !== 'function') {
    throw new HostedPrivatePocHttpError();
  }

  const runtime = runtimeResolver(runtimeMode);

  if (runtime === null) {
    return HOSTED_PRIVATE_POC_HTTP_OUTCOMES.INERT;
  }

  if (!(runtime instanceof HostedPrivatePocRuntime)) {
    throw new HostedPrivatePocHttpError();
  }

  const httpEvent =
    /** @type {{
     *   cookies: unknown,
     *   locals: Record<string, unknown>
     * }} */ (event);

  const presentedSessionId =
    readHostedSessionCookie(httpEvent.cookies);

  const decision =
    await runtime.evaluateRequest(
      runtimeMode,
      presentedSessionId
    );

  if (
    decision === null ||
    typeof decision !== 'object'
  ) {
    throw new HostedPrivatePocHttpError();
  }

  if (
    decision.outcome ===
    HOSTED_ROUTE_GATE_OUTCOMES.AUTHENTICATE
  ) {
    if (presentedSessionId !== undefined) {
      clearHostedSessionCookie(
        httpEvent.cookies
      );
    }

    return HOSTED_PRIVATE_POC_HTTP_OUTCOMES
      .AUTHENTICATE;
  }

  if (
    decision.outcome ===
    HOSTED_ROUTE_GATE_OUTCOMES.FORBIDDEN
  ) {
    return HOSTED_PRIVATE_POC_HTTP_OUTCOMES
      .FORBIDDEN;
  }

  if (
    decision.outcome !==
      HOSTED_ROUTE_GATE_OUTCOMES.ALLOWED ||
    !isTrustedHostedRequestContext(
      decision.context
    )
  ) {
    throw new HostedPrivatePocHttpError();
  }

  if (decision.sessionTransport !== null) {
    if (
      typeof decision.sessionTransport !==
        'object' ||
      typeof decision.sessionTransport
        .replaceSessionId !== 'string'
    ) {
      throw new HostedPrivatePocHttpError();
    }

    setHostedSessionCookie(
      httpEvent.cookies,
      decision.sessionTransport.replaceSessionId
    );
  }

  /*
   * Assign only after every required transport operation succeeds.
   * A cookie-adapter failure must never leave a partially admitted
   * request carrying trusted authority.
   */
  httpEvent.locals.hostedStudio =
    decision.context;

  return HOSTED_PRIVATE_POC_HTTP_OUTCOMES.ALLOWED;
}
