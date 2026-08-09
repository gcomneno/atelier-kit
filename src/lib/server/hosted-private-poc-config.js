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
  STUDIO_RUNTIME_MODES
} from '../studio-runtime.js';

const ENABLE_ENV =
  'ATELIER_STUDIO_PRIVATE_POC';
const STATE_TOPOLOGY_ENV =
  'ATELIER_STUDIO_PRIVATE_POC_STATE_TOPOLOGY';

export const HOSTED_PRIVATE_POC_STATE_TOPOLOGIES =
  Object.freeze({
    SINGLE_PROCESS: 'single-process'
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
 * Resolve the live private-PoC configuration.
 *
 * Outside Hosted runtime this boundary is deliberately inert:
 * visitor and Local Studio do not require Hosted credentials.
 *
 * Hosted mode alone is also insufficient. The PoC requires
 * explicit activation plus a supported state topology.
 *
 * @param {'visitor' | 'local' | 'hosted' | 'invalid'} runtimeMode
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

  if (
    record[STATE_TOPOLOGY_ENV] !==
    HOSTED_PRIVATE_POC_STATE_TOPOLOGIES
      .SINGLE_PROCESS
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

    return Object.freeze({
      stateTopology:
        HOSTED_PRIVATE_POC_STATE_TOPOLOGIES
          .SINGLE_PROCESS,
      origin,
      oauth,
      authorization
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
