import {
  parseHostedAuthorizationConfig
} from './hosted-authorization.js';
import {
  parseHostedGitHubOAuthConfig
} from './hosted-github-oauth.js';
import {
  parseHostedOriginConfig
} from './hosted-origin.js';
import {
  normalizeHostedRedisNamespace
} from './hosted-redis-state.js';
import {
  STUDIO_RUNTIME_MODES
} from '../studio-runtime.js';

const ENABLE_ENV =
  'ATELIER_STUDIO_PRIVATE_POC';
const STATE_TOPOLOGY_ENV =
  'ATELIER_STUDIO_PRIVATE_POC_STATE_TOPOLOGY';
const REDIS_URL_ENV =
  'ATELIER_STUDIO_STATE_REDIS_REST_URL';
const REDIS_TOKEN_ENV =
  'ATELIER_STUDIO_STATE_REDIS_REST_TOKEN';
const REDIS_NAMESPACE_ENV =
  'ATELIER_STUDIO_STATE_NAMESPACE';

const REDIS_ENVIRONMENTS = Object.freeze([
  REDIS_URL_ENV,
  REDIS_TOKEN_ENV,
  REDIS_NAMESPACE_ENV
]);

export const HOSTED_PRIVATE_POC_STATE_TOPOLOGIES =
  Object.freeze({
    SINGLE_PROCESS: 'single-process',
    PERSISTENT_REDIS: 'persistent-redis'
  });

export class HostedPrivatePocConfigurationError
  extends Error {
  constructor() {
    super(
      'Hosted private PoC configuration is invalid.'
    );
    this.name =
      'HostedPrivatePocConfigurationError';
    this.code =
      'HOSTED_PRIVATE_POC_CONFIGURATION_INVALID';
  }
}

/**
 * Redis endpoints are origin-only canonical HTTPS URLs. Keeping the string
 * canonical avoids multiple configuration spellings for the same authority.
 *
 * @param {unknown} value
 */
function parseHostedRedisUrl(value) {
  if (typeof value !== 'string' || value.length === 0) {
    throw new HostedPrivatePocConfigurationError();
  }

  let url;
  try {
    url = new URL(value);
  } catch {
    throw new HostedPrivatePocConfigurationError();
  }

  if (
    url.protocol !== 'https:' ||
    url.username !== '' ||
    url.password !== '' ||
    url.pathname !== '/' ||
    url.search !== '' ||
    url.hash !== '' ||
    url.origin !== value
  ) {
    throw new HostedPrivatePocConfigurationError();
  }

  return value;
}

/** @param {Record<string, unknown>} environment */
function resolveHostedRedisConfig(environment) {
  const url = parseHostedRedisUrl(environment[REDIS_URL_ENV]);
  const token = environment[REDIS_TOKEN_ENV];

  if (typeof token !== 'string' || token.trim().length === 0) {
    throw new HostedPrivatePocConfigurationError();
  }

  let namespace;
  try {
    namespace = normalizeHostedRedisNamespace(
      environment[REDIS_NAMESPACE_ENV]
    );
  } catch {
    throw new HostedPrivatePocConfigurationError();
  }

  return Object.freeze({ url, token, namespace });
}

/** @param {Record<string, unknown>} environment */
function hasHostedRedisSettings(environment) {
  return REDIS_ENVIRONMENTS.some(
    (name) => environment[name] !== undefined
  );
}

/**
 * Resolve the live private-PoC configuration.
 *
 * Outside Hosted runtime this boundary is deliberately inert:
 * visitor and Local Studio do not require Hosted credentials.
 *
 * Hosted mode alone is also insufficient. The PoC requires
 * explicit activation plus a supported state topology.
 *
 * @param {'visitor' | 'local' | 'hosted' | 'demo' | 'invalid'} runtimeMode
 * @param {unknown} environment
 */
export function resolveHostedPrivatePocConfig(
  runtimeMode,
  environment
) {
  if (runtimeMode !== STUDIO_RUNTIME_MODES.HOSTED) {
    return null;
  }

  if (
    environment === null ||
    typeof environment !== 'object' ||
    Array.isArray(environment)
  ) {
    throw new HostedPrivatePocConfigurationError();
  }

  const record =
    /** @type {Record<string, unknown>} */ (
      environment
    );

  const enablement = record[ENABLE_ENV];

  if (
    enablement === undefined ||
    enablement === '0'
  ) {
    return null;
  }

  if (enablement !== '1') {
    throw new HostedPrivatePocConfigurationError();
  }

  const stateTopology = record[STATE_TOPOLOGY_ENV];

  if (
    stateTopology !==
      HOSTED_PRIVATE_POC_STATE_TOPOLOGIES.SINGLE_PROCESS &&
    stateTopology !==
      HOSTED_PRIVATE_POC_STATE_TOPOLOGIES.PERSISTENT_REDIS
  ) {
    throw new HostedPrivatePocConfigurationError();
  }

  try {
    const origin =
      parseHostedOriginConfig(environment);
    const oauth =
      parseHostedGitHubOAuthConfig(environment);
    const authorization =
      parseHostedAuthorizationConfig(environment);

    const callbackOrigin =
      new URL(oauth.callbackUrl).origin;

    if (callbackOrigin !== origin.origin) {
      throw new HostedPrivatePocConfigurationError();
    }

    if (
      stateTopology ===
      HOSTED_PRIVATE_POC_STATE_TOPOLOGIES.SINGLE_PROCESS
    ) {
      if (hasHostedRedisSettings(record)) {
        throw new HostedPrivatePocConfigurationError();
      }

      return Object.freeze({
        stateTopology,
        origin,
        oauth,
        authorization
      });
    }

    return Object.freeze({
      stateTopology,
      origin,
      oauth,
      authorization,
      redis: resolveHostedRedisConfig(record)
    });
  } catch (error) {
    if (
      error instanceof
      HostedPrivatePocConfigurationError
    ) {
      throw error;
    }

    throw new HostedPrivatePocConfigurationError();
  }
}
