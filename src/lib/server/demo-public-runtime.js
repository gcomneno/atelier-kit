import {
  DemoMutationGuard
} from './demo-mutation-guard.js';
import {
  DemoRedisBoundedCounterStore
} from './demo-redis-bounded-counter-store.js';
import {
  DemoRedisSessionStore
} from './demo-redis-session-store.js';
import {
  DemoRouteGate
} from './demo-route-gate.js';
import {
  DemoSessionLifecycle
} from './demo-session.js';
import {
  DemoSessionIssuanceLimiter,
  DEMO_SESSION_ISSUANCE_OUTCOMES
} from './demo-session-issuance-limiter.js';
import {
  DemoUpstashRedisTransport
} from './demo-upstash-redis-transport.js';
import {
  resolveDemoPublicConfig
} from './demo-public-config.js';
import {
  STUDIO_RUNTIME_MODES
} from '../studio-runtime.js';

export class DemoPublicRuntimeConfigurationError
  extends Error {
  constructor() {
    super(
      'Public Demo runtime configuration is invalid.'
    );
    this.name =
      'DemoPublicRuntimeConfigurationError';
    this.code =
      'DEMO_PUBLIC_RUNTIME_CONFIGURATION_INVALID';
  }
}

/**
 * @param {unknown} value
 * @param {readonly string[]} methods
 */
function assertRuntimeBoundary(
  value,
  methods
) {
  if (
    value === null ||
    typeof value !== 'object' ||
    methods.some(
      (method) =>
        typeof /** @type {Record<string, unknown>} */ (
          value
        )[method] !== 'function'
    )
  ) {
    throw new DemoPublicRuntimeConfigurationError();
  }
}

export class DemoPublicRuntime {
  #sessionLifecycle;
  #routeGate;
  #mutationGuard;
  #issuanceLimiter;

  /**
   * @param {{
   *   sessionLifecycle: object,
   *   routeGate: object,
   *   mutationGuard: object,
   *   issuanceLimiter: object
   * }} options
   */
  constructor({
    sessionLifecycle,
    routeGate,
    mutationGuard,
    issuanceLimiter
  }) {
    assertRuntimeBoundary(
      sessionLifecycle,
      ['create', 'invalidate']
    );

    assertRuntimeBoundary(
      routeGate,
      ['evaluate']
    );

    assertRuntimeBoundary(
      mutationGuard,
      ['evaluate']
    );

    assertRuntimeBoundary(
      issuanceLimiter,
      ['evaluate']
    );

    this.#sessionLifecycle =
      sessionLifecycle;
    this.#routeGate =
      routeGate;
    this.#mutationGuard =
      mutationGuard;
    this.#issuanceLimiter =
      issuanceLimiter;
  }

  /**
   * Existing-session request admission.
   *
   * @param {unknown} runtimeMode
   * @param {unknown} sessionId
   */
  async evaluateRequest(
    runtimeMode,
    sessionId
  ) {
    return /** @type {any} */ (
      this.#routeGate
    ).evaluate(
      runtimeMode,
      sessionId
    );
  }

  /**
   * Integrity + mutation-budget admission.
   *
   * @param {unknown} request
   */
  async evaluateMutation(request) {
    return /** @type {any} */ (
      this.#mutationGuard
    ).evaluate(request);
  }

  /**
   * Retire a newly-created guest session when HTTP transport cannot safely
   * deliver its opaque lookup credential.
   *
   * @param {unknown} sessionId
   */
  async invalidateGuestSession(
    sessionId
  ) {
    try {
      return await /** @type {any} */ (
        this.#sessionLifecycle
      ).invalidate(sessionId);
    } catch {
      return false;
    }
  }

  /**
   * Server-side issuance boundary.
   *
   * HTTP bootstrap must first pass exact request integrity and derive an
   * issuance subject from the trusted deployment boundary.
   *
   * @param {unknown} issuanceSubject
   */
  async issueGuestSession(
    issuanceSubject
  ) {
    const admission =
      await /** @type {any} */ (
        this.#issuanceLimiter
      ).evaluate(
        issuanceSubject
      );

    if (
      admission === null ||
      typeof admission !== 'object' ||
      admission.outcome !==
        DEMO_SESSION_ISSUANCE_OUTCOMES
          .ALLOWED
    ) {
      return Object.freeze({
        outcome:
          admission?.outcome ??
          DEMO_SESSION_ISSUANCE_OUTCOMES
            .UNAVAILABLE,
        session: null
      });
    }

    try {
      const session =
        await /** @type {any} */ (
          this.#sessionLifecycle
        ).create();

      return Object.freeze({
        outcome:
          DEMO_SESSION_ISSUANCE_OUTCOMES
            .ALLOWED,
        session
      });
    } catch {
      return Object.freeze({
        outcome:
          DEMO_SESSION_ISSUANCE_OUTCOMES
            .UNAVAILABLE,
        session: null
      });
    }
  }
}

/**
 * @param {unknown} runtimeMode
 * @param {unknown} environment
 * @param {{
 *   clock?: () => number,
 *   sessionIdGenerator?: () => string,
 *   csrfTokenGenerator?: () => string,
 *   upstashClientFactory?: (options: object) => object
 * }} [dependencies]
 */
export function createDemoPublicRuntime(
  runtimeMode,
  environment,
  dependencies = {}
) {
  if (
    dependencies === null ||
    typeof dependencies !== 'object' ||
    Array.isArray(dependencies)
  ) {
    throw new DemoPublicRuntimeConfigurationError();
  }

  const config =
    resolveDemoPublicConfig(
      runtimeMode,
      environment
    );

  if (config === null) {
    return null;
  }

  if (
    runtimeMode !==
      STUDIO_RUNTIME_MODES.DEMO
  ) {
    return null;
  }

  const {
    clock = Date.now,
    sessionIdGenerator,
    csrfTokenGenerator,
    upstashClientFactory
  } = dependencies;

  try {
    /** @type {{
     *   url: string,
     *   token: string,
     *   clientFactory?: (options: object) => object
     * }} */
    const transportOptions = {
      url: config.redis.url,
      token: config.redis.token
    };

    if (
      upstashClientFactory !==
        undefined
    ) {
      if (
        typeof upstashClientFactory !==
          'function'
      ) {
        throw new DemoPublicRuntimeConfigurationError();
      }

      transportOptions.clientFactory =
        upstashClientFactory;
    }

    const redisTransport =
      new DemoUpstashRedisTransport(
        transportOptions
      );

    const sessionStore =
      new DemoRedisSessionStore({
        namespace:
          config.redis.namespace,
        transport:
          redisTransport,
        clock
      });

    const mutationBudgetStore =
      new DemoRedisBoundedCounterStore({
        namespace:
          config.redis.namespace,
        kind: 'mutation',
        transport:
          redisTransport,
        clock
      });

    const issuanceStore =
      new DemoRedisBoundedCounterStore({
        namespace:
          config.redis.namespace,
        kind: 'issuance',
        transport:
          redisTransport,
        clock
      });

    /** @type {{
     *   store: object,
     *   clock: () => number,
     *   sessionIdGenerator?: () => string,
     *   csrfTokenGenerator?: () => string
     * }} */
    const lifecycleOptions = {
      store: sessionStore,
      clock
    };

    if (
      sessionIdGenerator !== undefined
    ) {
      lifecycleOptions
        .sessionIdGenerator =
          sessionIdGenerator;
    }

    if (
      csrfTokenGenerator !== undefined
    ) {
      lifecycleOptions
        .csrfTokenGenerator =
          csrfTokenGenerator;
    }

    const sessionLifecycle =
      new DemoSessionLifecycle(
        lifecycleOptions
      );

    const routeGate =
      new DemoRouteGate({
        sessionLifecycle
      });

    const mutationGuard =
      new DemoMutationGuard({
        environment,
        budgetStore:
          mutationBudgetStore
      });

    const issuanceLimiter =
      new DemoSessionIssuanceLimiter({
        store: issuanceStore,
        clock,
        secret:
          config.issuance.secret,
        windowMs:
          config.issuance.windowMs,
        subjectLimit:
          config.issuance.subjectLimit,
        globalLimit:
          config.issuance.globalLimit
      });

    return new DemoPublicRuntime({
      sessionLifecycle,
      routeGate,
      mutationGuard,
      issuanceLimiter
    });
  } catch (error) {
    if (
      error instanceof
        DemoPublicRuntimeConfigurationError
    ) {
      throw error;
    }

    throw new DemoPublicRuntimeConfigurationError();
  }
}
