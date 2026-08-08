import {
  createHash,
  randomBytes
} from 'node:crypto';
import {
  createAuthenticatedIdentity,
  HostedIdentityValidationError
} from './hosted-identity.js';
import {
  HostedOAuthTransactionStoreConflictError
} from './hosted-oauth-transaction-store.js';

const GITHUB_AUTHORIZE_URL =
  'https://github.com/login/oauth/authorize';
const GITHUB_TOKEN_URL =
  'https://github.com/login/oauth/access_token';
const GITHUB_USER_URL =
  'https://api.github.com/user';
const GITHUB_API_VERSION = '2026-03-10';

const CLIENT_ID_ENV = 'ATELIER_STUDIO_GITHUB_CLIENT_ID';
const CLIENT_SECRET_ENV = 'ATELIER_STUDIO_GITHUB_CLIENT_SECRET';
const CALLBACK_URL_ENV = 'ATELIER_STUDIO_GITHUB_CALLBACK_URL';

const OAUTH_SECRET_BYTES = 32;
const OAUTH_SECRET_LENGTH = 43;
const OAUTH_SECRET_PATTERN = /^[A-Za-z0-9_-]{43}$/;
const MAX_TRANSACTION_ALLOCATION_ATTEMPTS = 4;

/**
 * @typedef {{
 *   ok: boolean,
 *   json(): Promise<unknown>
 * }} GitHubOAuthFetchResponse
 */

/**
 * @typedef {{
 *   method: 'GET' | 'POST',
 *   headers: Record<string, string>,
 *   body?: string
 * }} GitHubOAuthRequestOptions
 */

/**
 * @typedef {(
 *   url: string,
 *   options: GitHubOAuthRequestOptions
 * ) => Promise<GitHubOAuthFetchResponse>} GitHubOAuthFetch
 */

/**
 * @typedef {{
 *   create(record: any): any,
 *   consume(state: string): any,
 *   delete(state: string): boolean
 * }} HostedOAuthTransactionStore
 */

export const DEFAULT_HOSTED_OAUTH_TRANSACTION_LIFETIME_MS =
  10 * 60 * 1000;

export class HostedGitHubOAuthConfigurationError extends Error {
  /**
   * @param {string} message
   */
  constructor(message) {
    super(message);
    this.name = 'HostedGitHubOAuthConfigurationError';
    this.code = 'HOSTED_GITHUB_OAUTH_CONFIGURATION_INVALID';
  }
}

export class HostedGitHubOAuthAuthenticationError extends Error {
  constructor() {
    super('GitHub authentication failed.');
    this.name = 'HostedGitHubOAuthAuthenticationError';
    this.code = 'HOSTED_GITHUB_OAUTH_AUTHENTICATION_FAILED';
  }
}

export class HostedGitHubOAuthProviderError extends Error {
  constructor() {
    super('GitHub OAuth provider request failed.');
    this.name = 'HostedGitHubOAuthProviderError';
    this.code = 'HOSTED_GITHUB_OAUTH_PROVIDER_FAILED';
  }
}

/**
 * @param {unknown} value
 * @param {string} label
 * @param {number} maxLength
 */
function requireSecretConfiguration(value, label, maxLength) {
  if (
    typeof value !== 'string' ||
    value.length === 0 ||
    value.length > maxLength ||
    value.trim() !== value ||
    /[\u0000-\u001f\u007f]/.test(value)
  ) {
    throw new HostedGitHubOAuthConfigurationError(
      `Hosted GitHub OAuth ${label} configuration is invalid.`
    );
  }

  return value;
}

/**
 * @param {unknown} value
 */
function normalizeCallbackUrl(value) {
  const raw = requireSecretConfiguration(
    value,
    'callback URL',
    2048
  );

  let url;

  try {
    url = new URL(raw);
  } catch {
    throw new HostedGitHubOAuthConfigurationError(
      'Hosted GitHub OAuth callback URL configuration is invalid.'
    );
  }

  if (
    url.protocol !== 'https:' ||
    url.username !== '' ||
    url.password !== '' ||
    url.pathname !== '/auth/github/callback' ||
    url.search !== '' ||
    url.hash !== ''
  ) {
    throw new HostedGitHubOAuthConfigurationError(
      'Hosted GitHub OAuth callback URL configuration is invalid.'
    );
  }

  return url.toString();
}

/**
 * @param {unknown} environment
 */
export function parseHostedGitHubOAuthConfig(environment) {
  if (
    environment === null ||
    typeof environment !== 'object' ||
    Array.isArray(environment)
  ) {
    throw new HostedGitHubOAuthConfigurationError(
      'Hosted GitHub OAuth configuration is invalid.'
    );
  }

  const record =
    /** @type {Record<string, unknown>} */ (environment);

  const clientId = requireSecretConfiguration(
    record[CLIENT_ID_ENV],
    'client ID',
    255
  );

  const clientSecret = requireSecretConfiguration(
    record[CLIENT_SECRET_ENV],
    'client secret',
    4096
  );

  const callbackUrl = normalizeCallbackUrl(
    record[CALLBACK_URL_ENV]
  );

  return Object.freeze({
    clientId,
    clientSecret,
    callbackUrl
  });
}

/**
 * Revalidates provider-ready configuration so callers cannot bypass the
 * server-side configuration boundary with a hand-crafted plain object.
 *
 * @param {unknown} config
 */
function normalizeHostedGitHubOAuthProviderConfig(config) {
  if (
    config === null ||
    typeof config !== 'object' ||
    Array.isArray(config)
  ) {
    throw new HostedGitHubOAuthConfigurationError(
      'Hosted GitHub OAuth provider configuration is invalid.'
    );
  }

  const record =
    /** @type {Record<string, unknown>} */ (config);

  return Object.freeze({
    clientId: requireSecretConfiguration(
      record.clientId,
      'client ID',
      255
    ),
    clientSecret: requireSecretConfiguration(
      record.clientSecret,
      'client secret',
      4096
    ),
    callbackUrl: normalizeCallbackUrl(
      record.callbackUrl
    )
  });
}

/**
 * @param {unknown} value
 */
export function normalizeHostedOAuthReturnTo(value) {
  if (
    value === undefined ||
    value === null ||
    value === ''
  ) {
    return '/studio';
  }

  if (
    typeof value !== 'string' ||
    value.trim() !== value ||
    value.length > 2048 ||
    /[\u0000-\u001f\u007f\\]/.test(value) ||
    value.includes('#') ||
    value.startsWith('//')
  ) {
    throw new HostedGitHubOAuthAuthenticationError();
  }

  if (
    value !== '/studio' &&
    !value.startsWith('/studio/') &&
    !value.startsWith('/studio?')
  ) {
    throw new HostedGitHubOAuthAuthenticationError();
  }

  let parsed;

  try {
    parsed = new URL(value, 'https://atelier.invalid');
  } catch {
    throw new HostedGitHubOAuthAuthenticationError();
  }

  if (
    parsed.origin !== 'https://atelier.invalid' ||
    parsed.username !== '' ||
    parsed.password !== '' ||
    (
      parsed.pathname !== '/studio' &&
      !parsed.pathname.startsWith('/studio/')
    )
  ) {
    throw new HostedGitHubOAuthAuthenticationError();
  }

  return `${parsed.pathname}${parsed.search}`;
}

export function generateHostedOAuthSecret() {
  return randomBytes(OAUTH_SECRET_BYTES).toString('base64url');
}

/**
 * @param {unknown} value
 */
export function isCanonicalHostedOAuthSecret(value) {
  if (
    typeof value !== 'string' ||
    value.length !== OAUTH_SECRET_LENGTH ||
    !OAUTH_SECRET_PATTERN.test(value)
  ) {
    return false;
  }

  try {
    const decoded = Buffer.from(value, 'base64url');

    return (
      decoded.length === OAUTH_SECRET_BYTES &&
      decoded.toString('base64url') === value
    );
  } catch {
    return false;
  }
}

/**
 * @param {unknown} verifier
 */
export function derivePkceS256Challenge(verifier) {
  if (!isCanonicalHostedOAuthSecret(verifier)) {
    throw new HostedGitHubOAuthAuthenticationError();
  }

  const canonicalVerifier =
    /** @type {string} */ (verifier);

  return createHash('sha256')
    .update(canonicalVerifier, 'ascii')
    .digest('base64url');
}

/**
 * @param {unknown} code
 */
function normalizeAuthorizationCode(code) {
  if (
    typeof code !== 'string' ||
    code.length === 0 ||
    code.length > 4096 ||
    code.trim() !== code ||
    /[\u0000-\u001f\u007f]/.test(code)
  ) {
    throw new HostedGitHubOAuthAuthenticationError();
  }

  return code;
}

/**
 * @param {unknown} response
 */
function assertFetchResponse(response) {
  if (
    response === null ||
    typeof response !== 'object' ||
    typeof /** @type {{ ok?: unknown }} */ (response).ok !==
      'boolean' ||
    typeof /** @type {{ json?: unknown }} */ (response).json !==
      'function'
  ) {
    throw new HostedGitHubOAuthProviderError();
  }
}

/**
 * Narrow transport for GitHub's token and authenticated-user endpoints.
 */
export class GitHubOAuthTransport {
  #fetch;

  /**
   * @param {{ fetchImpl?: GitHubOAuthFetch }} [options]
   */
  constructor({
    fetchImpl =
      /** @type {GitHubOAuthFetch} */ (fetch)
  } = {}) {
    if (typeof fetchImpl !== 'function') {
      throw new HostedGitHubOAuthConfigurationError(
        'Hosted GitHub OAuth transport is invalid.'
      );
    }

    this.#fetch = fetchImpl;
  }

  /**
   * @param {{
   *   config: Readonly<{
   *     clientId: string,
   *     clientSecret: string,
   *     callbackUrl: string
   *   }>,
   *   code: string,
   *   codeVerifier: string
   * }} input
   */
  async exchangeAuthorizationCode({
    config,
    code,
    codeVerifier
  }) {
    let response;

    try {
      response = await this.#fetch(GITHUB_TOKEN_URL, {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type':
            'application/x-www-form-urlencoded'
        },
        body: new URLSearchParams({
          client_id: config.clientId,
          client_secret: config.clientSecret,
          code,
          redirect_uri: config.callbackUrl,
          code_verifier: codeVerifier
        }).toString()
      });
    } catch {
      throw new HostedGitHubOAuthProviderError();
    }

    assertFetchResponse(response);

    if (!response.ok) {
      throw new HostedGitHubOAuthProviderError();
    }

    let payload;

    try {
      payload = await response.json();
    } catch {
      throw new HostedGitHubOAuthProviderError();
    }

    if (
      payload === null ||
      typeof payload !== 'object'
    ) {
      throw new HostedGitHubOAuthProviderError();
    }

    const record =
      /** @type {Record<string, unknown>} */ (payload);

    const accessToken = record.access_token;
    const tokenType = record.token_type;

    if (
      typeof accessToken !== 'string' ||
      accessToken.length === 0 ||
      accessToken.length > 8192 ||
      accessToken.trim() !== accessToken ||
      /[\u0000-\u001f\u007f]/.test(accessToken) ||
      typeof tokenType !== 'string' ||
      tokenType.toLowerCase() !== 'bearer'
    ) {
      throw new HostedGitHubOAuthProviderError();
    }

    return accessToken;
  }

  /**
   * @param {string} accessToken
   */
  async fetchAuthenticatedUser(accessToken) {
    let response;

    try {
      response = await this.#fetch(GITHUB_USER_URL, {
        method: 'GET',
        headers: {
          Accept: 'application/vnd.github+json',
          Authorization: `Bearer ${accessToken}`,
          'X-GitHub-Api-Version': GITHUB_API_VERSION
        }
      });
    } catch {
      throw new HostedGitHubOAuthProviderError();
    }

    assertFetchResponse(response);

    if (!response.ok) {
      throw new HostedGitHubOAuthProviderError();
    }

    try {
      return await response.json();
    } catch {
      throw new HostedGitHubOAuthProviderError();
    }
  }
}

/**
 * @param {unknown} store
 */
function assertTransactionStore(store) {
  if (
    store === null ||
    typeof store !== 'object'
  ) {
    throw new HostedGitHubOAuthConfigurationError(
      'Hosted OAuth transaction store is required.'
    );
  }

  for (const method of [
    'create',
    'consume',
    'delete'
  ]) {
    if (
      typeof /** @type {Record<string, unknown>} */ (store)[method] !==
      'function'
    ) {
      throw new HostedGitHubOAuthConfigurationError(
        'Hosted OAuth transaction store does not implement the required boundary.'
      );
    }
  }
}

/**
 * @param {unknown} transport
 */
function assertTransport(transport) {
  if (
    transport === null ||
    typeof transport !== 'object' ||
    typeof /** @type {Record<string, unknown>} */ (transport)
      .exchangeAuthorizationCode !== 'function' ||
    typeof /** @type {Record<string, unknown>} */ (transport)
      .fetchAuthenticatedUser !== 'function'
  ) {
    throw new HostedGitHubOAuthConfigurationError(
      'Hosted GitHub OAuth transport does not implement the required boundary.'
    );
  }
}

/**
 * @param {unknown} lifetime
 */
function normalizeTransactionLifetime(lifetime) {
  if (
    typeof lifetime !== 'number' ||
    !Number.isSafeInteger(lifetime) ||
    lifetime <= 0
  ) {
    throw new HostedGitHubOAuthConfigurationError(
      'Hosted OAuth transaction lifetime is invalid.'
    );
  }

  return lifetime;
}

/**
 * @param {unknown} user
 */
function authenticatedIdentityFromGitHubUser(user) {
  if (
    user === null ||
    typeof user !== 'object'
  ) {
    throw new HostedGitHubOAuthAuthenticationError();
  }

  const record =
    /** @type {Record<string, unknown>} */ (user);

  if (
    !Number.isSafeInteger(record.id) ||
    /** @type {number} */ (record.id) <= 0 ||
    typeof record.login !== 'string'
  ) {
    throw new HostedGitHubOAuthAuthenticationError();
  }

  const identity = {
    provider: 'github',
    subject: String(record.id),
    login: record.login
  };

  if (record.name !== null && record.name !== undefined) {
    if (typeof record.name !== 'string') {
      throw new HostedGitHubOAuthAuthenticationError();
    }

    Object.assign(identity, {
      displayName: record.name
    });
  }

  if (
    record.avatar_url !== null &&
    record.avatar_url !== undefined
  ) {
    if (typeof record.avatar_url !== 'string') {
      throw new HostedGitHubOAuthAuthenticationError();
    }

    Object.assign(identity, {
      avatarUrl: record.avatar_url
    });
  }

  try {
    return createAuthenticatedIdentity(identity);
  } catch (error) {
    if (error instanceof HostedIdentityValidationError) {
      throw new HostedGitHubOAuthAuthenticationError();
    }

    throw error;
  }
}

export class HostedGitHubOAuthProvider {
  #config;
  #transactionStore;
  #transport;
  #clock;
  #secretGenerator;
  #transactionLifetimeMs;

  /**
   * @param {{
   *   config?: Readonly<{
   *     clientId: string,
   *     clientSecret: string,
   *     callbackUrl: string
   *   }>,
   *   transactionStore?: {
   *     create(record: any): any,
   *     consume(state: string): any,
   *     delete(state: string): boolean
   *   },
   *   transport?: {
   *     exchangeAuthorizationCode(input: any): Promise<string>,
   *     fetchAuthenticatedUser(accessToken: string): Promise<unknown>
   *   },
   *   clock?: () => number,
   *   secretGenerator?: () => string,
   *   transactionLifetimeMs?: number
   * }} options
   */
  constructor(options = {}) {
    if (
      options === null ||
      typeof options !== 'object' ||
      Array.isArray(options)
    ) {
      throw new HostedGitHubOAuthConfigurationError(
        'Hosted GitHub OAuth provider configuration is invalid.'
      );
    }

    const {
      config,
      transactionStore,
      transport = new GitHubOAuthTransport(),
      clock = Date.now,
      secretGenerator = generateHostedOAuthSecret,
      transactionLifetimeMs =
        DEFAULT_HOSTED_OAUTH_TRANSACTION_LIFETIME_MS
    } = options;

    const normalizedConfig =
      normalizeHostedGitHubOAuthProviderConfig(config);

    assertTransactionStore(transactionStore);

    const normalizedTransactionStore =
      /** @type {HostedOAuthTransactionStore} */ (
        transactionStore
      );

    assertTransport(transport);

    if (typeof clock !== 'function') {
      throw new HostedGitHubOAuthConfigurationError(
        'Hosted GitHub OAuth clock must be callable.'
      );
    }

    if (typeof secretGenerator !== 'function') {
      throw new HostedGitHubOAuthConfigurationError(
        'Hosted OAuth secret generator must be callable.'
      );
    }

    this.#config = normalizedConfig;
    this.#transactionStore =
      normalizedTransactionStore;
    this.#transport = transport;
    this.#clock = clock;
    this.#secretGenerator = secretGenerator;
    this.#transactionLifetimeMs =
      normalizeTransactionLifetime(transactionLifetimeMs);
  }

  #now() {
    const now = this.#clock();

    if (
      !Number.isSafeInteger(now) ||
      now < 0
    ) {
      throw new HostedGitHubOAuthConfigurationError(
        'Hosted GitHub OAuth clock produced an invalid timestamp.'
      );
    }

    return now;
  }

  #nextSecret() {
    let secret;

    try {
      secret = this.#secretGenerator();
    } catch {
      throw new HostedGitHubOAuthConfigurationError(
        'Hosted OAuth secret generation failed.'
      );
    }

    if (!isCanonicalHostedOAuthSecret(secret)) {
      throw new HostedGitHubOAuthConfigurationError(
        'Hosted OAuth secret generation failed.'
      );
    }

    return secret;
  }

  /**
   * Begin a one-time OAuth transaction.
   *
   * @param {unknown} returnTo
   */
  begin(returnTo = undefined) {
    const normalizedReturnTo =
      normalizeHostedOAuthReturnTo(returnTo);
    const now = this.#now();
    const expiresAt =
      now + this.#transactionLifetimeMs;

    if (!Number.isSafeInteger(expiresAt)) {
      throw new HostedGitHubOAuthConfigurationError(
        'Hosted OAuth transaction expiry is invalid.'
      );
    }

    for (
      let attempt = 0;
      attempt < MAX_TRANSACTION_ALLOCATION_ATTEMPTS;
      attempt += 1
    ) {
      const state = this.#nextSecret();
      const pkceVerifier = this.#nextSecret();

      if (state === pkceVerifier) {
        continue;
      }

      const codeChallenge =
        derivePkceS256Challenge(pkceVerifier);

      try {
        this.#transactionStore.create({
          state,
          pkceVerifier,
          returnTo: normalizedReturnTo,
          createdAt: now,
          expiresAt
        });
      } catch (error) {
        if (
          error instanceof
          HostedOAuthTransactionStoreConflictError
        ) {
          continue;
        }

        throw error;
      }

      const authorizationUrl =
        new URL(GITHUB_AUTHORIZE_URL);

      authorizationUrl.searchParams.set(
        'client_id',
        this.#config.clientId
      );
      authorizationUrl.searchParams.set(
        'redirect_uri',
        this.#config.callbackUrl
      );
      authorizationUrl.searchParams.set('state', state);
      authorizationUrl.searchParams.set(
        'code_challenge',
        codeChallenge
      );
      authorizationUrl.searchParams.set(
        'code_challenge_method',
        'S256'
      );

      return Object.freeze({
        authorizationUrl: authorizationUrl.toString(),
        expiresAt
      });
    }

    throw new HostedGitHubOAuthConfigurationError(
      'Unable to allocate a unique Hosted OAuth transaction.'
    );
  }

  /**
   * Complete one OAuth callback.
   *
   * The state is consumed before the authorization code is trusted so callback
   * replay cannot reuse a transaction after any valid-state callback attempt.
   *
   * @param {{
   *   state?: unknown,
   *   code?: unknown,
   *   error?: unknown
   * }} input
   */
  async complete(input = {}) {
    if (
      input === null ||
      typeof input !== 'object' ||
      Array.isArray(input)
    ) {
      throw new HostedGitHubOAuthAuthenticationError();
    }

    const callback =
      /** @type {{
       *   state?: unknown,
       *   code?: unknown,
       *   error?: unknown
       * }} */ (input);

    const {
      state,
      code,
      error: providerError
    } = callback;

    if (!isCanonicalHostedOAuthSecret(state)) {
      throw new HostedGitHubOAuthAuthenticationError();
    }

    const canonicalState =
      /** @type {string} */ (state);

    const transaction =
      this.#transactionStore.consume(canonicalState);

    if (transaction === null) {
      throw new HostedGitHubOAuthAuthenticationError();
    }

    const now = this.#now();

    if (
      transaction === null ||
      typeof transaction !== 'object' ||
      transaction.state !== canonicalState ||
      !isCanonicalHostedOAuthSecret(
        transaction.pkceVerifier
      ) ||
      typeof transaction.returnTo !== 'string' ||
      !Number.isSafeInteger(transaction.createdAt) ||
      !Number.isSafeInteger(transaction.expiresAt) ||
      now < transaction.createdAt ||
      transaction.expiresAt !==
        transaction.createdAt +
          this.#transactionLifetimeMs ||
      now >= transaction.expiresAt
    ) {
      throw new HostedGitHubOAuthAuthenticationError();
    }

    if (providerError !== undefined) {
      throw new HostedGitHubOAuthAuthenticationError();
    }

    const normalizedCode =
      normalizeAuthorizationCode(code);

    let accessToken;
    let user;

    try {
      accessToken =
        await this.#transport.exchangeAuthorizationCode({
          config: this.#config,
          code: normalizedCode,
          codeVerifier: transaction.pkceVerifier
        });

      user =
        await this.#transport.fetchAuthenticatedUser(
          accessToken
        );
    } catch (error) {
      if (
        error instanceof HostedGitHubOAuthProviderError ||
        error instanceof HostedGitHubOAuthAuthenticationError
      ) {
        throw error;
      }

      throw new HostedGitHubOAuthProviderError();
    }

    const identity =
      authenticatedIdentityFromGitHubUser(user);

    return Object.freeze({
      identity,
      returnTo: transaction.returnTo
    });
  }
}
