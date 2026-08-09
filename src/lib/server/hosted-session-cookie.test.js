import assert from 'node:assert/strict';
import test from 'node:test';
import {
  HOSTED_SESSION_COOKIE_NAME,
  HOSTED_SESSION_COOKIE_OPTIONS,
  HostedSessionCookieError,
  clearHostedSessionCookie,
  readHostedSessionCookie,
  setHostedSessionCookie
} from './hosted-session-cookie.js';

const SESSION_ID =
  Buffer.alloc(32, 41).toString('base64url');

/**
 * @param {string | undefined} [initial]
 */
function cookieCapture(
  initial = undefined
) {
  const calls = /** @type {any[]} */ ([]);

  return {
    calls,
    cookies: {
      /** @param {string} name */
      get(name) {
        calls.push({
          method: 'get',
          name
        });

        return initial;
      },
      /**
       * @param {string} name
       * @param {string} value
       * @param {any} options
       */
      set(name, value, options) {
        calls.push({
          method: 'set',
          name,
          value,
          options
        });
      },
      /**
       * @param {string} name
       * @param {any} options
       */
      delete(name, options) {
        calls.push({
          method: 'delete',
          name,
          options
        });
      }
    }
  };
}

test('Hosted session cookie uses the __Host prefix and strict browser attributes', () => {
  assert.equal(
    HOSTED_SESSION_COOKIE_NAME,
    '__Host-atelier_studio_session'
  );

  assert.deepEqual(
    HOSTED_SESSION_COOKIE_OPTIONS,
    {
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      path: '/'
    }
  );

  assert.equal(
    Object.isFrozen(
      HOSTED_SESSION_COOKIE_OPTIONS
    ),
    true
  );

  assert.equal(
    'domain' in HOSTED_SESSION_COOKIE_OPTIONS,
    false
  );
});

test('cookie reader returns only the opaque presented value without inventing authority', () => {
  {
    const capture = cookieCapture();

    assert.equal(
      readHostedSessionCookie(
        capture.cookies
      ),
      undefined
    );
  }

  {
    const capture =
      cookieCapture(SESSION_ID);

    assert.equal(
      readHostedSessionCookie(
        capture.cookies
      ),
      SESSION_ID
    );
  }

  {
    const malformed =
      'MALFORMED_SESSION_SENTINEL';

    const capture =
      cookieCapture(malformed);

    assert.equal(
      readHostedSessionCookie(
        capture.cookies
      ),
      malformed
    );
  }
});

test('cookie setter accepts only a canonical opaque session identifier', () => {
  const capture = cookieCapture();

  setHostedSessionCookie(
    capture.cookies,
    SESSION_ID
  );

  assert.deepEqual(
    capture.calls,
    [{
      method: 'set',
      name: HOSTED_SESSION_COOKIE_NAME,
      value: SESSION_ID,
      options:
        HOSTED_SESSION_COOKIE_OPTIONS
    }]
  );

  for (const invalid of [
    undefined,
    null,
    '',
    'SESSION_SECRET_SENTINEL',
    Buffer.alloc(31).toString('base64url'),
    Buffer.alloc(33).toString('base64url')
  ]) {
    assert.throws(
      () =>
        setHostedSessionCookie(
          cookieCapture().cookies,
          invalid
        ),
      HostedSessionCookieError
    );
  }
});

test('cookie transport contains no identity claims CSRF or provider data', () => {
  const capture = cookieCapture();

  setHostedSessionCookie(
    capture.cookies,
    SESSION_ID
  );

  const serialized =
    JSON.stringify(capture.calls);

  for (const forbidden of [
    'github',
    '"subject"',
    '"identity"',
    '"authorization"',
    '"csrfToken"',
    'ACCESS_TOKEN_SENTINEL',
    'CLIENT_SECRET_SENTINEL',
    'REPOSITORY_SECRET_SENTINEL'
  ]) {
    assert.equal(
      serialized.includes(forbidden),
      false
    );
  }
});

test('cookie clearing uses the exact same name and scope attributes', () => {
  const capture = cookieCapture();

  clearHostedSessionCookie(capture.cookies);

  assert.deepEqual(
    capture.calls,
    [{
      method: 'delete',
      name: HOSTED_SESSION_COOKIE_NAME,
      options:
        HOSTED_SESSION_COOKIE_OPTIONS
    }]
  );
});

test('cookie boundary fails closed for malformed framework adapters without echoing credentials', () => {
  const secret =
    'COOKIE_ADAPTER_SECRET_SENTINEL';

  for (const operation of [
    () =>
      readHostedSessionCookie({
        get: secret
      }),
    () =>
      setHostedSessionCookie(
        { set: secret },
        SESSION_ID
      ),
    () =>
      clearHostedSessionCookie({
        delete: secret
      }),
    () =>
      readHostedSessionCookie({
        get() {
          return { secret };
        }
      })
  ]) {
    let caught;

    try {
      operation();
    } catch (error) {
      caught = error;
    }

    assert.ok(
      caught instanceof
        HostedSessionCookieError
    );
    assert.equal(
      String(caught).includes(secret),
      false
    );
    assert.equal(
      String(caught).includes(SESSION_ID),
      false
    );
  }
});
