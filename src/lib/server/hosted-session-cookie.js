import {
  isCanonicalHostedSessionId
} from './hosted-session.js';

export const HOSTED_SESSION_COOKIE_NAME =
  '__Host-atelier_studio_session';

export const HOSTED_SESSION_COOKIE_OPTIONS =
  Object.freeze({
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    path: '/'
  });

export class HostedSessionCookieError extends Error {
  constructor() {
    super('Hosted session cookie operation failed.');
    this.name = 'HostedSessionCookieError';
    this.code = 'HOSTED_SESSION_COOKIE_ERROR';
  }
}

/**
 * @param {unknown} cookies
 * @param {'get' | 'set' | 'delete'} method
 */
function requireCookieMethod(cookies, method) {
  if (
    cookies === null ||
    typeof cookies !== 'object' ||
    typeof /** @type {Record<string, unknown>} */ (
      cookies
    )[method] !== 'function'
  ) {
    throw new HostedSessionCookieError();
  }
}

/**
 * Read the opaque credential exactly as presented.
 *
 * Canonical validation remains owned by the session/route gate so
 * malformed presented credentials can follow the normal rejection
 * path and be cleared by the HTTP adapter.
 *
 * @param {unknown} cookies
 * @returns {string | undefined}
 */
export function readHostedSessionCookie(cookies) {
  requireCookieMethod(cookies, 'get');

  const value =
    /** @type {{ get(name: string): unknown }} */ (
      cookies
    ).get(HOSTED_SESSION_COOKIE_NAME);

  if (
    value !== undefined &&
    typeof value !== 'string'
  ) {
    throw new HostedSessionCookieError();
  }

  return /** @type {string | undefined} */ (value);
}

/**
 * @param {unknown} cookies
 * @param {unknown} sessionId
 */
export function setHostedSessionCookie(
  cookies,
  sessionId
) {
  requireCookieMethod(cookies, 'set');

  if (!isCanonicalHostedSessionId(sessionId)) {
    throw new HostedSessionCookieError();
  }

  /** @type {{
   *   set(
   *     name: string,
   *     value: string,
   *     options: typeof HOSTED_SESSION_COOKIE_OPTIONS
   *   ): void
   * }} */ (cookies).set(
    HOSTED_SESSION_COOKIE_NAME,
    /** @type {string} */ (sessionId),
    HOSTED_SESSION_COOKIE_OPTIONS
  );
}

/**
 * @param {unknown} cookies
 */
export function clearHostedSessionCookie(cookies) {
  requireCookieMethod(cookies, 'delete');

  /** @type {{
   *   delete(
   *     name: string,
   *     options: typeof HOSTED_SESSION_COOKIE_OPTIONS
   *   ): void
   * }} */ (cookies).delete(
    HOSTED_SESSION_COOKIE_NAME,
    HOSTED_SESSION_COOKIE_OPTIONS
  );
}
