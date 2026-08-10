import {
  authorizeHostedIdentity
} from './hosted-authorization.js';
import {
  GitHubOAuthTransport,
  HostedGitHubOAuthProvider
} from './hosted-github-oauth.js';
import {
  InMemoryHostedOAuthTransactionStore
} from './hosted-oauth-transaction-store.js';
import {
  HostedRedisOAuthTransactionStore
} from './hosted-redis-oauth-transaction-store.js';
import {
  HostedRedisSessionStore
} from './hosted-redis-session-store.js';
import {
  HostedRouteGate
} from './hosted-route-gate.js';
import {
  HostedMutationGuard
} from './hosted-mutation-guard.js';
import {
  NOOP_HOSTED_SECURITY_EVENT_RECORDER
} from './hosted-security-events.js';
import {
  HostedSessionLifecycle
} from './hosted-session.js';
import {
  InMemoryHostedSessionStore
} from './hosted-session-store.js';
import {
  resolveHostedPrivatePocConfig
} from './hosted-private-poc-config.js';
import {
  HostedUpstashRedisTransport
} from './hosted-upstash-redis-transport.js';

export const HOSTED_PRIVATE_POC_AUTH_RESULTS =
  Object.freeze({
    AUTHORIZED: 'authorized',
    FORBIDDEN: 'forbidden'
  });

export class HostedPrivatePocRuntimeConfigurationError
  extends Error {
  constructor() {
    super(
      'Hosted private PoC runtime configuration is invalid.'
    );
    this.name =
      'HostedPrivatePocRuntimeConfigurationError';
    this.code =
      'HOSTED_PRIVATE_POC_RUNTIME_CONFIGURATION_INVALID';
  }
}

/**
 * @param {unknown} recorder
 */
function assertSecurityEventRecorder(recorder) {
  if (
    recorder === null ||
    typeof recorder !== 'object' ||
    typeof /** @type {Record<string, unknown>} */ (
      recorder
    ).record !== 'function'
  ) {
    throw new HostedPrivatePocRuntimeConfigurationError();
  }
}

/**
 * Private Hosted composition root.
 *
 * Store instances are owned by this runtime and are intentionally not exposed.
 */
export class HostedPrivatePocRuntime {
  #oauthProvider;
  #sessionLifecycle;
  #routeGate;
  #mutationGuard;
  #authorizationConfig;

  /**
   * @param {{
   *   oauthProvider: HostedGitHubOAuthProvider,
   *   sessionLifecycle: HostedSessionLifecycle,
   *   routeGate: HostedRouteGate,
   *   mutationGuard: HostedMutationGuard,
   *   authorizationConfig: unknown
   * }} dependencies
   */
  constructor({
    oauthProvider,
    sessionLifecycle,
    routeGate,
    mutationGuard,
    authorizationConfig
  }) {
    if (
      !(oauthProvider instanceof HostedGitHubOAuthProvider) ||
      !(sessionLifecycle instanceof HostedSessionLifecycle) ||
      !(routeGate instanceof HostedRouteGate) ||
      !(mutationGuard instanceof HostedMutationGuard)
    ) {
      throw new HostedPrivatePocRuntimeConfigurationError();
    }

    this.#oauthProvider = oauthProvider;
    this.#sessionLifecycle = sessionLifecycle;
    this.#routeGate = routeGate;
    this.#mutationGuard = mutationGuard;
    this.#authorizationConfig = authorizationConfig;

    Object.freeze(this);
  }

  /**
   * @param {unknown} [returnTo]
   */
  async beginAuthentication(returnTo = undefined) {
    return await this.#oauthProvider.begin(returnTo);
  }

  /**
   * Complete OAuth, re-apply deployment authorization, and create
   * one fresh opaque server-side session only when authorized.
   *
   * @param {{
   *   state?: unknown,
   *   code?: unknown,
   *   error?: unknown
   * }} input
   */
  async completeAuthentication(input) {
    const completed =
      await this.#oauthProvider.complete(input);

    const authorized =
      authorizeHostedIdentity(
        completed.identity,
        this.#authorizationConfig
      );

    if (authorized === null) {
      return Object.freeze({
        result:
          HOSTED_PRIVATE_POC_AUTH_RESULTS.FORBIDDEN,
        returnTo: completed.returnTo,
        sessionId: null
      });
    }

    const session =
      await this.#sessionLifecycle.create(authorized);

    return Object.freeze({
      result:
        HOSTED_PRIVATE_POC_AUTH_RESULTS.AUTHORIZED,
      returnTo: completed.returnTo,
      sessionId: session.sessionId
    });
  }

  /**
   * Delegate every Hosted request decision to the canonical gate.
   *
   * @param {unknown} runtimeMode
   * @param {unknown} sessionId
   */
  async evaluateRequest(runtimeMode, sessionId) {
    return await this.#routeGate.evaluate(
      runtimeMode,
      sessionId
    );
  }

  /**
   * Delegate mutation-integrity decisions to the canonical
   * HostedMutationGuard.
   *
   * @param {{
   *   runtimeMode?: unknown,
   *   trustedContext?: unknown,
   *   host?: unknown,
   *   origin?: unknown,
   *   method?: unknown,
   *   csrfToken?: unknown
   * }} request
   */
  evaluateMutation(request) {
    return this.#mutationGuard.evaluate(request);
  }

  /**
   * @param {unknown} sessionId
   */
  async invalidateSession(sessionId) {
    return await this.#sessionLifecycle.invalidate(sessionId);
  }
}

/**
 * Construct the selected private Hosted state topology while retaining one
 * canonical OAuth, session, route-gate and mutation-guard composition path.
 *
 * Returns null when the private PoC is intentionally inactive.
 *
 * @param {'visitor' | 'local' | 'hosted' | 'invalid'} runtimeMode
 * @param {unknown} environment
 * @param {{
 *   transport?: {
 *     exchangeAuthorizationCode(input: any): Promise<string>,
 *     fetchAuthenticatedUser(accessToken: string): Promise<unknown>
 *   },
 *   clock?: () => number,
 *   oauthSecretGenerator?: () => string,
 *   sessionIdGenerator?: () => string,
 *   csrfTokenGenerator?: () => string,
 *   upstashClientFactory?: (options: object) => object,
 *   securityEventRecorder?: {
 *     record(type: unknown, reason?: unknown): boolean
 *   }
 * }} [dependencies]
 */
export function createHostedPrivatePocRuntime(
  runtimeMode,
  environment,
  dependencies = {}
) {
  if (
    dependencies === null ||
    typeof dependencies !== 'object' ||
    Array.isArray(dependencies)
  ) {
    throw new HostedPrivatePocRuntimeConfigurationError();
  }

  const config =
    resolveHostedPrivatePocConfig(
      runtimeMode,
      environment
    );

  if (config === null) {
    return null;
  }

  const {
    transport = new GitHubOAuthTransport(),
    clock = Date.now,
    oauthSecretGenerator,
    sessionIdGenerator,
    csrfTokenGenerator,
    upstashClientFactory,
    securityEventRecorder =
      NOOP_HOSTED_SECURITY_EVENT_RECORDER
  } = dependencies;

  assertSecurityEventRecorder(
    securityEventRecorder
  );

  let transactionStore;
  let sessionStore;

  if (config.stateTopology === 'single-process') {
    transactionStore = new InMemoryHostedOAuthTransactionStore();
    sessionStore = new InMemoryHostedSessionStore();
  } else {
    const transportOptions = {
      url: config.redis.url,
      token: config.redis.token
    };

    if (upstashClientFactory !== undefined) {
      Object.assign(transportOptions, {
        clientFactory: upstashClientFactory
      });
    }

    const redisTransport =
      new HostedUpstashRedisTransport(transportOptions);

    transactionStore = new HostedRedisOAuthTransactionStore({
      namespace: config.redis.namespace,
      transport: redisTransport,
      clock
    });
    sessionStore = new HostedRedisSessionStore({
      namespace: config.redis.namespace,
      transport: redisTransport,
      clock
    });
  }

  const oauthOptions = {
    config: config.oauth,
    transactionStore,
    transport,
    clock,
    securityEventRecorder
  };

  if (oauthSecretGenerator !== undefined) {
    Object.assign(oauthOptions, {
      secretGenerator: oauthSecretGenerator
    });
  }

  const oauthProvider =
    new HostedGitHubOAuthProvider(oauthOptions);

  const sessionOptions = {
    store: sessionStore,
    clock,
    securityEventRecorder
  };

  if (sessionIdGenerator !== undefined) {
    Object.assign(sessionOptions, {
      sessionIdGenerator
    });
  }

  if (csrfTokenGenerator !== undefined) {
    Object.assign(sessionOptions, {
      csrfTokenGenerator
    });
  }

  const sessionLifecycle =
    new HostedSessionLifecycle(sessionOptions);

  const routeGate =
    new HostedRouteGate({
      sessionLifecycle,
      authorizationConfig:
        config.authorization,
      securityEventRecorder
    });

  const mutationGuard =
    new HostedMutationGuard({
      environment,
      securityEventRecorder
    });

  return new HostedPrivatePocRuntime({
    oauthProvider,
    sessionLifecycle,
    routeGate,
    mutationGuard,
    authorizationConfig:
      config.authorization
  });
}
