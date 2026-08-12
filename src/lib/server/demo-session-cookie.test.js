import assert from 'node:assert/strict';
import test from 'node:test';
import {
  DEMO_SESSION_COOKIE_NAME,
  DEMO_SESSION_COOKIE_OPTIONS,
  clearDemoSessionCookie,
  readDemoSessionCookie,
  setDemoSessionCookie
} from './demo-session-cookie.js';

const SESSION =
  Buffer.alloc(32, 7).toString('base64url');

function capture() {
  const calls = /** @type {any[]} */ ([]);

  return {
    calls,
    cookies: {
      /** @param {string} name */
      get(name) {
        calls.push(['get', name]);
        return SESSION;
      },
      /**
       * @param {string} name
       * @param {string} value
       * @param {any} options
       */
      set(name, value, options) {
        calls.push(['set', name, value, options]);
      },
      /**
       * @param {string} name
       * @param {any} options
       */
      delete(name, options) {
        calls.push(['delete', name, options]);
      }
    }
  };
}

test('Demo cookie is distinct secure opaque browser transport', () => {
  assert.equal(
    DEMO_SESSION_COOKIE_NAME,
    '__Host-atelier_demo_session'
  );

  assert.deepEqual(DEMO_SESSION_COOKIE_OPTIONS, {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    path: '/'
  });

  const state = capture();

  assert.equal(
    readDemoSessionCookie(state.cookies),
    SESSION
  );

  setDemoSessionCookie(state.cookies, SESSION);
  clearDemoSessionCookie(state.cookies);

  assert.deepEqual(state.calls, [
    ['get', DEMO_SESSION_COOKIE_NAME],
    [
      'set',
      DEMO_SESSION_COOKIE_NAME,
      SESSION,
      DEMO_SESSION_COOKIE_OPTIONS
    ],
    [
      'delete',
      DEMO_SESSION_COOKIE_NAME,
      DEMO_SESSION_COOKIE_OPTIONS
    ]
  ]);
});
