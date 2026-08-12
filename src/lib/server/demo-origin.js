const CANONICAL_ORIGIN_ENV =
  'ATELIER_DEMO_CANONICAL_ORIGIN';

export class DemoOriginConfigurationError extends Error {
  /** @param {string} message */
  constructor(message) {
    super(message);
    this.name = 'DemoOriginConfigurationError';
    this.code = 'DEMO_ORIGIN_CONFIGURATION_INVALID';
  }
}

/**
 * Parse the deployment-controlled public Demo origin.
 *
 * The configured spelling must itself be canonical. URL parsing is used only
 * for structural validation; spellings normalized by URL are rejected.
 *
 * @param {unknown} environment
 */
export function parseDemoOriginConfig(environment) {
  if (
    environment === null ||
    typeof environment !== 'object' ||
    Array.isArray(environment)
  ) {
    throw new DemoOriginConfigurationError(
      'Demo canonical origin configuration is invalid.'
    );
  }

  const record =
    /** @type {Record<string, unknown>} */ (environment);

  const configured = record[CANONICAL_ORIGIN_ENV];

  if (
    typeof configured !== 'string' ||
    configured.length === 0
  ) {
    throw new DemoOriginConfigurationError(
      'Demo canonical origin is required.'
    );
  }

  let parsed;

  try {
    parsed = new URL(configured);
  } catch {
    throw new DemoOriginConfigurationError(
      'Demo canonical origin must be a valid HTTPS origin.'
    );
  }

  if (
    parsed.protocol !== 'https:' ||
    parsed.username !== '' ||
    parsed.password !== '' ||
    parsed.hostname.includes('*') ||
    parsed.pathname !== '/' ||
    parsed.search !== '' ||
    parsed.hash !== ''
  ) {
    throw new DemoOriginConfigurationError(
      'Demo canonical origin must be an absolute HTTPS origin.'
    );
  }

  if (parsed.origin !== configured) {
    throw new DemoOriginConfigurationError(
      'Demo canonical origin must use canonical representation.'
    );
  }

  return Object.freeze({
    origin: parsed.origin,
    host: parsed.host
  });
}
