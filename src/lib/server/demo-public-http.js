import {
  DEMO_ROUTE_GATE_OUTCOMES
} from './demo-route-gate.js';
import {
  isTrustedDemoRequestContext
} from './demo-request-context.js';
import {
  clearDemoSessionCookie,
  readDemoSessionCookie,
  setDemoSessionCookie
} from './demo-session-cookie.js';
import {
  STUDIO_RUNTIME_MODES
} from '../studio-runtime.js';
import {
  createDemoPublicRuntime,
  DemoPublicRuntime
} from './demo-public-runtime.js';

export const DEMO_PUBLIC_HTTP_OUTCOMES =
  Object.freeze({
    INERT: 'inert',
    SESSION_REQUIRED: 'session-required',
    ALLOWED: 'allowed'
  });

export class DemoPublicHttpError extends Error {
  constructor() {
    super('Demo public HTTP boundary failed.');
    this.name = 'DemoPublicHttpError';
    this.code = 'DEMO_PUBLIC_HTTP_ERROR';
  }
}

/**
 * Lazy process resolver.
 *
 * The runtime object may be process-local, but all mutable Demo authority is
 * stored in Redis. Inactive or incomplete configuration remains fail-closed.
 *
 * @param {{
 *   environment?: unknown,
 *   dependencies?: {
 *     clock?: () => number,
 *     sessionIdGenerator?: () => string,
 *     csrfTokenGenerator?: () => string,
 *     upstashClientFactory?: (options: object) => object
 *   }
 * }} [options]
 */
export function createDemoPublicRuntimeResolver({
  environment = process.env,
  dependencies = {}
} = {}) {
  let initialized = false;

  /** @type {DemoPublicRuntime | null} */
  let runtime = null;

  /**
   * @param {'visitor' | 'local' | 'hosted' | 'demo' | 'invalid'} runtimeMode
   */
  return function resolveRuntime(
    runtimeMode
  ) {
    if (
      runtimeMode !==
        STUDIO_RUNTIME_MODES.DEMO
    ) {
      return null;
    }

    if (!initialized) {
      const created =
        createDemoPublicRuntime(
          runtimeMode,
          environment,
          dependencies
        );

      if (
        created !== null &&
        !(created instanceof
          DemoPublicRuntime)
      ) {
        throw new DemoPublicHttpError();
      }

      runtime = created;
      initialized = true;
    }

    return runtime;
  };
}

const resolveProcessDemoPublicRuntime =
  createDemoPublicRuntimeResolver();

/**
 * Shared server composition root.
 *
 * This resolves persistent Demo authority only when explicitly configured.
 * Guest-session issuance is exposed exclusively by the separate bootstrap
 * boundary.
 *
 * @param {'visitor' | 'local' | 'hosted' | 'demo' | 'invalid'} runtimeMode
 */
export function getDemoPublicRuntime(
  runtimeMode
) {
  return resolveProcessDemoPublicRuntime(
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
    throw new DemoPublicHttpError();
  }

  const record =
    /** @type {Record<string, unknown>} */ (
      event
    );

  if (
    !(record.url instanceof URL) ||
    record.request === null ||
    typeof record.request !== 'object' ||
    record.cookies === null ||
    typeof record.cookies !== 'object' ||
    record.locals === null ||
    typeof record.locals !== 'object'
  ) {
    throw new DemoPublicHttpError();
  }

  if (
    typeof /** @type {{ method?: unknown }} */ (
      record.request
    ).method !== 'string'
  ) {
    throw new DemoPublicHttpError();
  }
}

/**
 * Slice 5 admits only the one Demo authoring route prepared so far.
 *
 * No `/studio` dashboard authority and no deeper Studio route receives Demo
 * context from this seam.
 *
 * @param {unknown} event
 */
export function isDemoPublicSocialAuthorizedRequest(
  event
) {
  assertHttpEvent(event);

  const http =
    /** @type {{
     *   url: URL,
     *   request: { method: string }
     * }} */ (event);

  return (
    http.url.pathname ===
      '/studio/site/social' &&
    (
      http.request.method === 'GET' ||
      http.request.method === 'POST'
    )
  );
}

/**
 * Apply only request-to-trusted-context transport.
 *
 * The runtime resolver is injectable for contract tests. The default resolver
 * initializes only when persistent Demo state and session-issuance
 * configuration are complete.
 *
 * @param {{
 *   event: unknown,
 *   runtimeMode:
 *     'visitor' | 'local' | 'hosted' | 'demo' | 'invalid',
 *   runtimeResolver?: (
 *     runtimeMode:
 *       'visitor' | 'local' | 'hosted' | 'demo' | 'invalid'
 *   ) => {
 *     evaluateRequest(
 *       runtimeMode: unknown,
 *       sessionId: unknown
 *     ): Promise<{
 *       outcome: unknown,
 *       context?: unknown,
 *       sessionTransport?: unknown
 *     }>
 *   } | null
 * }} input
 */
export async function applyDemoPublicSocialAuthorizedRequest({
  event,
  runtimeMode,
  runtimeResolver = getDemoPublicRuntime
}) {
  assertHttpEvent(event);

  if (
    runtimeMode !== STUDIO_RUNTIME_MODES.DEMO ||
    !isDemoPublicSocialAuthorizedRequest(
      event
    )
  ) {
    return DEMO_PUBLIC_HTTP_OUTCOMES.INERT;
  }

  if (typeof runtimeResolver !== 'function') {
    throw new DemoPublicHttpError();
  }

  const runtime =
    runtimeResolver(runtimeMode);

  /*
   * Disabled/incomplete Demo configuration remains inert.
   */
  if (runtime === null) {
    return DEMO_PUBLIC_HTTP_OUTCOMES.INERT;
  }

  if (
    typeof runtime !== 'object' ||
    typeof runtime.evaluateRequest !==
      'function'
  ) {
    throw new DemoPublicHttpError();
  }

  const http =
    /** @type {{
     *   cookies: unknown,
     *   locals: Record<string, unknown>
     * }} */ (event);

  const presentedSessionId =
    readDemoSessionCookie(http.cookies);

  const decision =
    await runtime.evaluateRequest(
      runtimeMode,
      presentedSessionId
    );

  if (
    decision === null ||
    typeof decision !== 'object'
  ) {
    throw new DemoPublicHttpError();
  }

  if (
    decision.outcome ===
    DEMO_ROUTE_GATE_OUTCOMES.SESSION_REQUIRED
  ) {
    if (presentedSessionId !== undefined) {
      clearDemoSessionCookie(
        http.cookies
      );
    }

    return DEMO_PUBLIC_HTTP_OUTCOMES
      .SESSION_REQUIRED;
  }

  if (
    decision.outcome ===
    DEMO_ROUTE_GATE_OUTCOMES.NOT_FOUND
  ) {
    return DEMO_PUBLIC_HTTP_OUTCOMES.INERT;
  }

  if (
    decision.outcome !==
      DEMO_ROUTE_GATE_OUTCOMES.ALLOWED ||
    !isTrustedDemoRequestContext(
      decision.context
    )
  ) {
    throw new DemoPublicHttpError();
  }

  if (decision.sessionTransport !== null) {
    if (
      typeof decision.sessionTransport !==
        'object'
    ) {
      throw new DemoPublicHttpError();
    }

    const sessionTransport =
      /** @type {Record<string, unknown>} */ (
        decision.sessionTransport
      );

    if (
      typeof sessionTransport
        .replaceSessionId !== 'string'
    ) {
      throw new DemoPublicHttpError();
    }

    setDemoSessionCookie(
      http.cookies,
      sessionTransport.replaceSessionId
    );
  }

  /*
   * Assign authority only after transport succeeds.
   */
  http.locals.demoStudio =
    decision.context;

  return DEMO_PUBLIC_HTTP_OUTCOMES.ALLOWED;
}
