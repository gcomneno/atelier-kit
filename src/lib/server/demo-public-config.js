import {
  isCanonicalDemoCsrfToken
} from './demo-session.js';
import {
  parseDemoOriginConfig
} from './demo-origin.js';
import {
  normalizeDemoRedisNamespace
} from './demo-redis-state.js';
import {
  STUDIO_RUNTIME_MODES
} from '../studio-runtime.js';

const ENABLE_ENV =
  'ATELIER_DEMO_PUBLIC';

const REDIS_URL_ENV =
  'ATELIER_DEMO_STATE_REDIS_REST_URL';

const REDIS_TOKEN_ENV =
  'ATELIER_DEMO_STATE_REDIS_REST_TOKEN';

const REDIS_NAMESPACE_ENV =
  'ATELIER_DEMO_STATE_NAMESPACE';

const ISSUANCE_SECRET_ENV =
  'ATELIER_DEMO_ISSUANCE_SECRET';

export const DEFAULT_DEMO_ISSUANCE_POLICY =
  Object.freeze({
    windowMs: 60 * 60 * 1000,
    subjectLimit: 5,
    globalLimit: 60
  });

export class DemoPublicConfigurationError
  extends Error {
  constructor() {
    super(
      'Public Demo configuration is invalid.'
    );
    this.name =
      'DemoPublicConfigurationError';
    this.code =
      'DEMO_PUBLIC_CONFIGURATION_INVALID';
  }
}

/** @param {unknown} value */
function parseRedisUrl(value) {
  if (
    typeof value !== 'string' ||
    value.length === 0
  ) {
    throw new DemoPublicConfigurationError();
  }

  let url;

  try {
    url = new URL(value);
  } catch {
    throw new DemoPublicConfigurationError();
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
    throw new DemoPublicConfigurationError();
  }

  return value;
}

/**
 * Resolve only the state/security configuration owned by the public Demo.
 *
 * Repository sandbox credentials remain in demo-sandbox-target.js and are not
 * copied into this object.
 *
 * @param {unknown} runtimeMode
 * @param {unknown} environment
 */
export function resolveDemoPublicConfig(
  runtimeMode,
  environment
) {
  if (
    runtimeMode !==
      STUDIO_RUNTIME_MODES.DEMO
  ) {
    return null;
  }

  if (
    environment === null ||
    typeof environment !== 'object' ||
    Array.isArray(environment)
  ) {
    throw new DemoPublicConfigurationError();
  }

  const record =
    /** @type {Record<string, unknown>} */ (
      environment
    );

  const enablement =
    record[ENABLE_ENV];

  if (
    enablement === undefined ||
    enablement === '0'
  ) {
    return null;
  }

  if (enablement !== '1') {
    throw new DemoPublicConfigurationError();
  }

  try {
    const origin =
      parseDemoOriginConfig(record);

    const redisUrl =
      parseRedisUrl(
        record[REDIS_URL_ENV]
      );

    const redisToken =
      record[REDIS_TOKEN_ENV];

    if (
      typeof redisToken !== 'string' ||
      redisToken.trim().length === 0
    ) {
      throw new DemoPublicConfigurationError();
    }

    const namespace =
      normalizeDemoRedisNamespace(
        record[REDIS_NAMESPACE_ENV]
      );

    const issuanceSecret =
      record[ISSUANCE_SECRET_ENV];

    /*
     * Same canonical 256-bit representation as the other Demo capabilities,
     * while remaining an independent deployment secret.
     */
    if (
      !isCanonicalDemoCsrfToken(
        issuanceSecret
      )
    ) {
      throw new DemoPublicConfigurationError();
    }

    return Object.freeze({
      origin,
      redis: Object.freeze({
        url: redisUrl,
        token: redisToken,
        namespace
      }),
      issuance: Object.freeze({
        secret: issuanceSecret,
        ...DEFAULT_DEMO_ISSUANCE_POLICY
      })
    });
  } catch (error) {
    if (
      error instanceof
        DemoPublicConfigurationError
    ) {
      throw error;
    }

    throw new DemoPublicConfigurationError();
  }
}
