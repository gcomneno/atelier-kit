const CANONICAL_ORIGIN_ENV =
  'ATELIER_STUDIO_CANONICAL_ORIGIN';

export class HostedOriginConfigurationError extends Error {
  /**
   * @param {string} message
   */
  constructor(message) {
    super(message);
    this.name = 'HostedOriginConfigurationError';
    this.code = 'HOSTED_ORIGIN_CONFIGURATION_INVALID';
  }
}

/**
 * @param {unknown} environment
 */
export function parseHostedOriginConfig(environment) {
  if (
    environment === null ||
    typeof environment !== 'object' ||
    Array.isArray(environment)
  ) {
    throw new HostedOriginConfigurationError(
      'Hosted canonical origin configuration is invalid.'
    );
  }

  const record =
    /** @type {Record<string, unknown>} */ (environment);

  const configured = record[CANONICAL_ORIGIN_ENV];

  if (
    typeof configured !== 'string' ||
    configured.length === 0
  ) {
    throw new HostedOriginConfigurationError(
      'Hosted canonical origin is required.'
    );
  }

  let parsed;

  try {
    parsed = new URL(configured);
  } catch {
    throw new HostedOriginConfigurationError(
      'Hosted canonical origin must be a valid HTTPS origin.'
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
    throw new HostedOriginConfigurationError(
      'Hosted canonical origin must be an absolute HTTPS origin.'
    );
  }

  /*
   * Require the configured representation itself to be canonical.
   *
   * URL parsing is used for structural validation only. We deliberately do
   * not accept spellings that URL would normalize, such as uppercase hosts,
   * default :443 ports, trailing slashes or surrounding whitespace.
   */
  if (parsed.origin !== configured) {
    throw new HostedOriginConfigurationError(
      'Hosted canonical origin must use canonical representation.'
    );
  }

  return Object.freeze({
    origin: parsed.origin,
    host: parsed.host
  });
}
