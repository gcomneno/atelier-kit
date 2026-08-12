import {
  parseDemoOriginConfig
} from './demo-origin.js';
import {
  resolveDemoIssuanceSubject
} from './demo-issuance-subject.js';
import {
  getDemoPublicRuntime
} from './demo-public-http.js';
import {
  clearDemoSessionCookie,
  readDemoSessionCookie,
  setDemoSessionCookie
} from './demo-session-cookie.js';
import {
  DEMO_ROUTE_GATE_OUTCOMES
} from './demo-route-gate.js';
import {
  DEMO_SESSION_ISSUANCE_OUTCOMES
} from './demo-session-issuance-limiter.js';
import {
  isCanonicalDemoSessionId
} from './demo-session.js';
import {
  STUDIO_RUNTIME_MODES
} from '../studio-runtime.js';

export const DEMO_SESSION_BOOTSTRAP_OUTCOMES =
  Object.freeze({
    NOT_FOUND: 'not-found',
    FORBIDDEN: 'forbidden',
    METHOD_NOT_ALLOWED:
      'method-not-allowed',
    SUBJECT_EXHAUSTED:
      'subject-exhausted',
    GLOBAL_EXHAUSTED:
      'global-exhausted',
    UNAVAILABLE: 'unavailable',
    ALLOWED: 'allowed'
  });

export class DemoSessionBootstrapHttpError
  extends Error {
  constructor() {
    super(
      'Demo session bootstrap HTTP boundary failed.'
    );
    this.name =
      'DemoSessionBootstrapHttpError';
    this.code =
      'DEMO_SESSION_BOOTSTRAP_HTTP_ERROR';
  }
}

/** @param {string} value */
function result(value) {
  return Object.freeze({
    outcome: value
  });
}

/**
 * @param {unknown} event
 */
function assertEvent(event) {
  if (
    event === null ||
    typeof event !== 'object' ||
    Array.isArray(event)
  ) {
    throw new DemoSessionBootstrapHttpError();
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
    typeof record.cookies !== 'object'
  ) {
    throw new DemoSessionBootstrapHttpError();
  }

  const request =
    /** @type {Record<string, unknown>} */ (
      record.request
    );

  if (
    typeof request.method !== 'string' ||
    request.headers === null ||
    typeof request.headers !== 'object'
  ) {
    throw new DemoSessionBootstrapHttpError();
  }
}

/**
 * Public session issuance is admitted only on:
 *
 *   POST /demo/start
 *
 * Request integrity is checked before runtime/session authority is touched.
 *
 * @param {{
 *   event: unknown,
 *   runtimeMode: unknown,
 *   environment?: unknown,
 *   runtimeResolver?: (
 *     runtimeMode:
 *       'visitor' | 'local' | 'hosted' | 'demo' | 'invalid'
 *   ) => object | null,
 *   subjectResolver?: typeof resolveDemoIssuanceSubject
 * }} input
 */
export async function applyDemoSessionBootstrapRequest({
  event,
  runtimeMode,
  environment = process.env,
  runtimeResolver =
    getDemoPublicRuntime,
  subjectResolver =
    resolveDemoIssuanceSubject
}) {
  assertEvent(event);

  const http =
    /** @type {{
     *   url: URL,
     *   request: {
     *     method: string,
     *     headers: {
     *       get(name: string): string | null
     *     }
     *   },
     *   cookies: unknown
     * }} */ (event);

  if (
    runtimeMode !==
      STUDIO_RUNTIME_MODES.DEMO ||
    http.url.pathname !==
      '/demo/start'
  ) {
    return result(
      DEMO_SESSION_BOOTSTRAP_OUTCOMES
        .NOT_FOUND
    );
  }

  let originConfig;

  try {
    originConfig =
      parseDemoOriginConfig(
        environment
      );
  } catch {
    return result(
      DEMO_SESSION_BOOTSTRAP_OUTCOMES
        .NOT_FOUND
    );
  }

  const host =
    http.request.headers.get(
      'host'
    );

  const origin =
    http.request.headers.get(
      'origin'
    );

  if (
    host !== originConfig.host ||
    origin !== originConfig.origin
  ) {
    return result(
      DEMO_SESSION_BOOTSTRAP_OUTCOMES
        .FORBIDDEN
    );
  }

  if (
    http.request.method !== 'POST'
  ) {
    return result(
      DEMO_SESSION_BOOTSTRAP_OUTCOMES
        .METHOD_NOT_ALLOWED
    );
  }

  if (
    typeof runtimeResolver !==
      'function' ||
    typeof subjectResolver !==
      'function'
  ) {
    throw new DemoSessionBootstrapHttpError();
  }

  const runtime =
    runtimeResolver(
      /** @type {'demo'} */ (
        runtimeMode
      )
    );

  if (runtime === null) {
    return result(
      DEMO_SESSION_BOOTSTRAP_OUTCOMES
        .NOT_FOUND
    );
  }

  if (
    typeof runtime !== 'object' ||
    typeof /** @type {Record<string, unknown>} */ (
      runtime
    ).issueGuestSession !== 'function' ||
    typeof /** @type {Record<string, unknown>} */ (
      runtime
    ).invalidateGuestSession !== 'function'
  ) {
    throw new DemoSessionBootstrapHttpError();
  }

  /*
   * A browser that already owns valid Demo authority must not mint another
   * guest session merely because Try Studio was pressed again.
   *
   * Existing-session admission happens only after exact bootstrap
   * Host/Origin/method checks, but before trusted-subject derivation and
   * issuance-budget consumption.
   */
  let presentedSessionId;

  try {
    presentedSessionId =
      readDemoSessionCookie(
        http.cookies
      );
  } catch {
    return result(
      DEMO_SESSION_BOOTSTRAP_OUTCOMES
        .UNAVAILABLE
    );
  }

  if (presentedSessionId !== undefined) {
    if (
      typeof /** @type {Record<string, unknown>} */ (
        runtime
      ).evaluateRequest !== 'function'
    ) {
      return result(
        DEMO_SESSION_BOOTSTRAP_OUTCOMES
          .UNAVAILABLE
      );
    }

    let existing;

    try {
      existing =
        await /** @type {any} */ (
          runtime
        ).evaluateRequest(
          runtimeMode,
          presentedSessionId
        );
    } catch {
      return result(
        DEMO_SESSION_BOOTSTRAP_OUTCOMES
          .UNAVAILABLE
      );
    }

    if (
      existing === null ||
      typeof existing !== 'object'
    ) {
      return result(
        DEMO_SESSION_BOOTSTRAP_OUTCOMES
          .UNAVAILABLE
      );
    }

    if (
      existing.outcome ===
        DEMO_ROUTE_GATE_OUTCOMES.ALLOWED
    ) {
      if (
        existing.sessionTransport !==
          null
      ) {
        if (
          typeof existing.sessionTransport !==
            'object' ||
          !isCanonicalDemoSessionId(
            existing.sessionTransport
              .replaceSessionId
          )
        ) {
          return result(
            DEMO_SESSION_BOOTSTRAP_OUTCOMES
              .UNAVAILABLE
          );
        }

        const replacementSessionId =
          existing.sessionTransport
            .replaceSessionId;

        try {
          setDemoSessionCookie(
            http.cookies,
            replacementSessionId
          );
        } catch {
          /*
           * Rotation has already retired the old lookup credential. If the
           * replacement cannot reach the browser, retire it too.
           */
          await /** @type {any} */ (
            runtime
          ).invalidateGuestSession(
            replacementSessionId
          );

          return result(
            DEMO_SESSION_BOOTSTRAP_OUTCOMES
              .UNAVAILABLE
          );
        }
      }

      return result(
        DEMO_SESSION_BOOTSTRAP_OUTCOMES
          .ALLOWED
      );
    }

    if (
      existing.outcome !==
        DEMO_ROUTE_GATE_OUTCOMES
          .SESSION_REQUIRED
    ) {
      return result(
        DEMO_SESSION_BOOTSTRAP_OUTCOMES
          .UNAVAILABLE
      );
    }

    /*
     * The presented lookup credential is stale/expired. Clear browser
     * transport before attempting to create replacement authority.
     */
    try {
      clearDemoSessionCookie(
        http.cookies
      );
    } catch {
      return result(
        DEMO_SESSION_BOOTSTRAP_OUTCOMES
          .UNAVAILABLE
      );
    }
  }

  let issuanceSubject;

  try {
    issuanceSubject =
      subjectResolver({
        environment,
        headers:
          http.request.headers
      });
  } catch {
    return result(
      DEMO_SESSION_BOOTSTRAP_OUTCOMES
        .UNAVAILABLE
    );
  }

  if (
    typeof issuanceSubject !==
      'string' ||
    issuanceSubject.length === 0
  ) {
    return result(
      DEMO_SESSION_BOOTSTRAP_OUTCOMES
        .UNAVAILABLE
    );
  }

  let issued;

  try {
    issued =
      await /** @type {any} */ (
        runtime
      ).issueGuestSession(
        issuanceSubject
      );
  } catch {
    return result(
      DEMO_SESSION_BOOTSTRAP_OUTCOMES
        .UNAVAILABLE
    );
  }

  if (
    issued === null ||
    typeof issued !== 'object'
  ) {
    return result(
      DEMO_SESSION_BOOTSTRAP_OUTCOMES
        .UNAVAILABLE
    );
  }

  if (
    issued.outcome ===
      DEMO_SESSION_ISSUANCE_OUTCOMES
        .SUBJECT_EXHAUSTED
  ) {
    return result(
      DEMO_SESSION_BOOTSTRAP_OUTCOMES
        .SUBJECT_EXHAUSTED
    );
  }

  if (
    issued.outcome ===
      DEMO_SESSION_ISSUANCE_OUTCOMES
        .GLOBAL_EXHAUSTED
  ) {
    return result(
      DEMO_SESSION_BOOTSTRAP_OUTCOMES
        .GLOBAL_EXHAUSTED
    );
  }

  if (
    issued.outcome !==
      DEMO_SESSION_ISSUANCE_OUTCOMES
        .ALLOWED ||
    issued.session === null ||
    typeof issued.session !==
      'object' ||
    !isCanonicalDemoSessionId(
      issued.session.sessionId
    )
  ) {
    return result(
      DEMO_SESSION_BOOTSTRAP_OUTCOMES
        .UNAVAILABLE
    );
  }

  const sessionId =
    issued.session.sessionId;

  try {
    setDemoSessionCookie(
      http.cookies,
      sessionId
    );
  } catch {
    /*
     * Never retain server-side guest authority whose opaque credential failed
     * to reach the browser.
     */
    await /** @type {any} */ (
      runtime
    ).invalidateGuestSession(
      sessionId
    );

    return result(
      DEMO_SESSION_BOOTSTRAP_OUTCOMES
        .UNAVAILABLE
    );
  }

  return result(
    DEMO_SESSION_BOOTSTRAP_OUTCOMES
      .ALLOWED
  );
}
