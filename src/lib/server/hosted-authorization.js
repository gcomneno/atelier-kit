import {
  canonicalGitHubSubject,
  createAuthenticatedIdentity,
  HostedIdentityValidationError,
  HOSTED_IDENTITY_PROVIDERS
} from './hosted-identity.js';

const AUTHORIZED_GITHUB_IDS_ENV = 'ATELIER_STUDIO_AUTHORIZED_GITHUB_IDS';
const BOOTSTRAP_GITHUB_LOGIN_ENV = 'ATELIER_STUDIO_BOOTSTRAP_GITHUB_LOGIN';
const AUTHORIZED_HOSTED_IDENTITY_TOKEN = Symbol('authorized-hosted-identity');
const AUTHORIZED_HOSTED_IDENTITIES = new WeakSet();

export class HostedAuthorizationConfigurationError extends Error {
  /**
   * @param {string} message
   */
  constructor(message) {
    super(message);
    this.name = 'HostedAuthorizationConfigurationError';
    this.code = 'HOSTED_AUTHORIZATION_CONFIGURATION_INVALID';
  }
}

export class AuthorizedHostedIdentity {
  /**
   * @param {Readonly<{
   *   provider: 'github',
   *   subject: string,
   *   login: string,
   *   displayName?: string,
   *   avatarUrl?: string
   * }>} identity
   * @param {symbol} token
   */
  constructor(identity, token) {
    if (token !== AUTHORIZED_HOSTED_IDENTITY_TOKEN) {
      throw new TypeError(
        'Authorized Hosted identities can only be created by the authorization policy.'
      );
    }

    this.identity = identity;
    AUTHORIZED_HOSTED_IDENTITIES.add(this);
    Object.freeze(this);
  }
}

/**
 * Verify that a value was actually produced by the centralized authorization
 * policy rather than merely matching its public object shape or prototype.
 *
 * @param {unknown} value
 * @returns {value is AuthorizedHostedIdentity}
 */
export function isAuthorizedHostedIdentity(value) {
  return (
    value !== null &&
    typeof value === 'object' &&
    AUTHORIZED_HOSTED_IDENTITIES.has(value)
  );
}

/**
 * @param {unknown} value
 * @returns {string | null}
 */
function parseBootstrapLogin(value) {
  if (value === undefined) {
    return null;
  }

  if (typeof value !== 'string') {
    throw new HostedAuthorizationConfigurationError(
      'Hosted authorization bootstrap login configuration is invalid.'
    );
  }

  const login = value.trim();

  if (login.length === 0) {
    return null;
  }

  if (
    login.length > 255 ||
    /[\u0000-\u001f\u007f]/.test(login)
  ) {
    throw new HostedAuthorizationConfigurationError(
      'Hosted authorization bootstrap login configuration is invalid.'
    );
  }

  return login;
}

/**
 * Parse the deployment-controlled Hosted authorization policy.
 *
 * GitHub logins may be retained as bootstrap metadata, but permanent
 * authorization authority consists only of canonical numeric GitHub subjects.
 *
 * @param {unknown} environment
 * @returns {Readonly<{
 *   allowedGitHubSubjects: readonly string[],
 *   bootstrapGitHubLogin: string | null
 * }>}
 */
export function parseHostedAuthorizationConfig(environment) {
  if (
    environment === null ||
    typeof environment !== 'object' ||
    Array.isArray(environment)
  ) {
    throw new HostedAuthorizationConfigurationError(
      'Hosted authorization configuration is invalid.'
    );
  }

  const record =
    /** @type {Record<string, string | undefined>} */ (environment);

  const rawAllowedSubjects = record[AUTHORIZED_GITHUB_IDS_ENV];

  if (
    typeof rawAllowedSubjects !== 'string' ||
    rawAllowedSubjects.trim().length === 0
  ) {
    throw new HostedAuthorizationConfigurationError(
      'Hosted authorization requires a non-empty GitHub subject allow-list.'
    );
  }

  /** @type {string[]} */
  const allowedGitHubSubjects = [];

  for (const rawCandidate of rawAllowedSubjects.split(',')) {
    const candidate = rawCandidate.trim();

    if (candidate.length === 0) {
      throw new HostedAuthorizationConfigurationError(
        'Hosted authorization GitHub subject allow-list is invalid.'
      );
    }

    try {
      canonicalGitHubSubject(candidate);
    } catch (error) {
      if (error instanceof HostedIdentityValidationError) {
        throw new HostedAuthorizationConfigurationError(
          'Hosted authorization GitHub subject allow-list is invalid.'
        );
      }

      throw error;
    }

    if (!allowedGitHubSubjects.includes(candidate)) {
      allowedGitHubSubjects.push(candidate);
    }
  }

  const bootstrapGitHubLogin = parseBootstrapLogin(
    record[BOOTSTRAP_GITHUB_LOGIN_ENV]
  );

  return Object.freeze({
    allowedGitHubSubjects: Object.freeze(allowedGitHubSubjects),
    bootstrapGitHubLogin
  });
}

/**
 * @param {unknown} config
 * @returns {asserts config is Readonly<{
 *   allowedGitHubSubjects: readonly string[],
 *   bootstrapGitHubLogin: string | null
 * }>}
 */
function assertHostedAuthorizationConfig(config) {
  if (
    config === null ||
    typeof config !== 'object' ||
    !Array.isArray(
      /** @type {{ allowedGitHubSubjects?: unknown }} */ (config)
        .allowedGitHubSubjects
    )
  ) {
    throw new HostedAuthorizationConfigurationError(
      'Hosted authorization policy configuration is invalid.'
    );
  }

  const allowedSubjects =
    /** @type {{ allowedGitHubSubjects: unknown[] }} */ (config)
      .allowedGitHubSubjects;

  if (allowedSubjects.length === 0) {
    throw new HostedAuthorizationConfigurationError(
      'Hosted authorization policy configuration is invalid.'
    );
  }

  for (const subject of allowedSubjects) {
    try {
      canonicalGitHubSubject(subject);
    } catch (error) {
      if (error instanceof HostedIdentityValidationError) {
        throw new HostedAuthorizationConfigurationError(
          'Hosted authorization policy configuration is invalid.'
        );
      }

      throw error;
    }
  }
}

/**
 * Apply the centralized Hosted Studio authorization policy.
 *
 * Routine identity denial returns null. Invalid deployment configuration is a
 * separate server-side configuration error.
 *
 * Bootstrap login metadata is intentionally not consulted here.
 *
 * @param {unknown} identity
 * @param {unknown} config
 * @returns {AuthorizedHostedIdentity | null}
 */
export function authorizeHostedIdentity(identity, config) {
  assertHostedAuthorizationConfig(config);

  let authenticatedIdentity;

  try {
    authenticatedIdentity = createAuthenticatedIdentity(identity);
  } catch (error) {
    if (error instanceof HostedIdentityValidationError) {
      return null;
    }

    throw error;
  }

  if (
    authenticatedIdentity.provider !== HOSTED_IDENTITY_PROVIDERS.GITHUB
  ) {
    return null;
  }

  const allowedSubjects =
    /** @type {{ allowedGitHubSubjects: readonly string[] }} */ (config)
      .allowedGitHubSubjects;

  if (!allowedSubjects.includes(authenticatedIdentity.subject)) {
    return null;
  }

  return new AuthorizedHostedIdentity(
    authenticatedIdentity,
    AUTHORIZED_HOSTED_IDENTITY_TOKEN
  );
}
