export const HOSTED_IDENTITY_PROVIDERS = Object.freeze({
  GITHUB: 'github'
});

const GITHUB_SUBJECT_PATTERN = /^[1-9][0-9]*$/;
const AUTHENTICATED_IDENTITY_FIELDS = new Set([
  'provider',
  'subject',
  'login',
  'displayName',
  'avatarUrl'
]);

export class HostedIdentityValidationError extends Error {
  /**
   * @param {string} message
   */
  constructor(message) {
    super(message);
    this.name = 'HostedIdentityValidationError';
    this.code = 'HOSTED_IDENTITY_INVALID';
  }
}

/**
 * @param {unknown} subject
 * @returns {string}
 */
export function canonicalGitHubSubject(subject) {
  if (
    typeof subject !== 'string' ||
    !GITHUB_SUBJECT_PATTERN.test(subject)
  ) {
    throw new HostedIdentityValidationError(
      'GitHub identity subject must be a canonical positive decimal string.'
    );
  }

  return subject;
}

/**
 * @param {string} field
 * @param {unknown} value
 * @param {boolean} required
 * @returns {string | undefined}
 */
function validateIdentityMetadata(field, value, required) {
  if (value === undefined) {
    if (required) {
      throw new HostedIdentityValidationError(
        `Authenticated identity ${field} is required.`
      );
    }

    return undefined;
  }

  if (
    typeof value !== 'string' ||
    value.length === 0 ||
    value !== value.trim() ||
    /[\u0000-\u001f\u007f]/.test(value)
  ) {
    throw new HostedIdentityValidationError(
      `Authenticated identity ${field} is invalid.`
    );
  }

  return value;
}

/**
 * Construct the canonical server-side identity produced by a future verified
 * authentication provider.
 *
 * This function validates representation only. It does not authenticate the
 * caller or verify identity data with GitHub.
 *
 * @param {unknown} input
 * @returns {Readonly<{
 *   provider: 'github',
 *   subject: string,
 *   login: string,
 *   displayName?: string,
 *   avatarUrl?: string
 * }>}
 */
export function createAuthenticatedIdentity(input) {
  if (
    input === null ||
    typeof input !== 'object' ||
    Array.isArray(input)
  ) {
    throw new HostedIdentityValidationError(
      'Authenticated identity must be an object.'
    );
  }

  const record = /** @type {Record<string, unknown>} */ (input);

  for (const field of Object.keys(record)) {
    if (!AUTHENTICATED_IDENTITY_FIELDS.has(field)) {
      throw new HostedIdentityValidationError(
        'Authenticated identity contains unsupported fields.'
      );
    }
  }

  if (record.provider !== HOSTED_IDENTITY_PROVIDERS.GITHUB) {
    throw new HostedIdentityValidationError(
      'Authenticated identity provider is unsupported.'
    );
  }

  const subject = canonicalGitHubSubject(record.subject);
  const login = validateIdentityMetadata('login', record.login, true);
  const displayName = validateIdentityMetadata(
    'displayName',
    record.displayName,
    false
  );
  const avatarUrl = validateIdentityMetadata(
    'avatarUrl',
    record.avatarUrl,
    false
  );

  /** @type {{
   *   provider: 'github',
   *   subject: string,
   *   login: string,
   *   displayName?: string,
   *   avatarUrl?: string
   * }}
   */
  const identity = {
    provider: HOSTED_IDENTITY_PROVIDERS.GITHUB,
    subject,
    login: /** @type {string} */ (login)
  };

  if (displayName !== undefined) {
    identity.displayName = displayName;
  }

  if (avatarUrl !== undefined) {
    identity.avatarUrl = avatarUrl;
  }

  return Object.freeze(identity);
}
