import {
  isCanonicalDemoSessionId
} from './demo-session.js';

export const DEMO_SESSION_COOKIE_NAME =
  '__Host-atelier_demo_session';

export const DEMO_SESSION_COOKIE_OPTIONS =
  Object.freeze({
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    path: '/'
  });

export class DemoSessionCookieError extends Error {
  constructor() {
    super('Demo session cookie operation failed.');
    this.name = 'DemoSessionCookieError';
    this.code = 'DEMO_SESSION_COOKIE_ERROR';
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
    throw new DemoSessionCookieError();
  }
}

/**
 * @param {unknown} cookies
 * @returns {string | undefined}
 */
export function readDemoSessionCookie(cookies) {
  requireCookieMethod(cookies, 'get');

  const value =
    /** @type {{ get(name: string): unknown }} */ (
      cookies
    ).get(DEMO_SESSION_COOKIE_NAME);

  if (
    value !== undefined &&
    typeof value !== 'string'
  ) {
    throw new DemoSessionCookieError();
  }

  return value;
}

/**
 * @param {unknown} cookies
 * @param {unknown} sessionId
 */
export function setDemoSessionCookie(cookies, sessionId) {
  requireCookieMethod(cookies, 'set');

  if (!isCanonicalDemoSessionId(sessionId)) {
    throw new DemoSessionCookieError();
  }

  /** @type {{
   *   set(
   *     name: string,
   *     value: string,
   *     options: typeof DEMO_SESSION_COOKIE_OPTIONS
   *   ): void
   * }} */ (cookies).set(
    DEMO_SESSION_COOKIE_NAME,
    sessionId,
    DEMO_SESSION_COOKIE_OPTIONS
  );
}

/**
 * @param {unknown} cookies
 */
export function clearDemoSessionCookie(cookies) {
  requireCookieMethod(cookies, 'delete');

  /** @type {{
   *   delete(
   *     name: string,
   *     options: typeof DEMO_SESSION_COOKIE_OPTIONS
   *   ): void
   * }} */ (cookies).delete(
    DEMO_SESSION_COOKIE_NAME,
    DEMO_SESSION_COOKIE_OPTIONS
  );
}
