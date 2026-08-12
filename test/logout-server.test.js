import assert from 'node:assert/strict';
import test, {
  after,
  before
} from 'node:test';
import {
  createServer
} from 'vite';

const STATE_MODULE =
  'virtual:logout-route-test-state';
const RESOLVED_STATE_MODULE =
  `\0${STATE_MODULE}`;
const ENVIRONMENT_MODULE =
  'virtual:logout-route-test-environment';
const LOGOUT_MODULE =
  'virtual:logout-route-test-policy';
const RUNTIME_MODULE =
  'virtual:logout-route-test-runtime';

/** @type {import('vite').ViteDevServer | undefined} */
let server;
/** @type {{ configure(value: { runtimeMode: 'visitor' | 'hosted', perform: (input: any) => Promise<{ outcome: string }> | { outcome: string } }): void, reset(): void }} */
let state;

/**
 * @param {{ csrfToken?: string, throwFormData?: boolean }} [options]
 */
function request({
  csrfToken = 'csrf-token',
  throwFormData = false
} = {}) {
  let formDataCalls = 0;

  return {
    formDataCalls() {
      return formDataCalls;
    },
    request: {
      method: 'POST',
      headers: new Headers({
        host: 'studio.example.com',
        origin: 'https://studio.example.com'
      }),
      async formData() {
        formDataCalls += 1;

        if (throwFormData) {
          throw new Error('form body is unavailable');
        }

        return new Map([
          ['csrfToken', csrfToken]
        ]);
      }
    }
  };
}

/**
 * @param {number} status
 */
function hasHttpStatus(status) {
  return (
    /** @param {any} reason */
    (reason) => {
      assert.equal(reason?.status, status);
      return true;
    }
  );
}

before(async () => {
  server = await createServer({
    configFile: 'vite.config.js',
    logLevel: 'error',
    plugins: [{
      name: 'logout-route-test-modules',
      enforce: 'pre',
      resolveId(id) {
        if (id === STATE_MODULE) {
          return RESOLVED_STATE_MODULE;
        }

        if (
          id === ENVIRONMENT_MODULE ||
          id === LOGOUT_MODULE ||
          id === RUNTIME_MODULE
        ) {
          return `\0${id}`;
        }

        return null;
      },
      transform(code, id) {
        if (!id.endsWith('/src/routes/auth/logout/+server.js')) {
          return null;
        }

        return code
          .replace(
            "from '$app/environment';",
            `from '${ENVIRONMENT_MODULE}';`
          )
          .replace(
            "from '$lib/server/hosted-private-poc-logout-http.js';",
            `from '${LOGOUT_MODULE}';`
          )
          .replace(
            "from '$lib/studio-runtime.js';",
            `from '${RUNTIME_MODULE}';`
          );
      },
      load(id) {
        if (id === RESOLVED_STATE_MODULE) {
          return `
            let current;
            export function configure(value) { current = value; }
            export function reset() { current = undefined; }
            export function get() {
              if (current === undefined) {
                throw new Error('logout route test policy is not configured');
              }
              return current;
            }
          `;
        }

        if (id === `\0${ENVIRONMENT_MODULE}`) {
          return 'export const dev = false;';
        }

        if (id === `\0${LOGOUT_MODULE}`) {
          return `
            import { get } from '${STATE_MODULE}';
            export const HOSTED_PRIVATE_POC_LOGOUT_OUTCOMES = Object.freeze({
              NOT_FOUND: 'not-found',
              FORBIDDEN: 'forbidden',
              METHOD_NOT_ALLOWED: 'method-not-allowed',
              LOGGED_OUT: 'logged-out'
            });
            export async function performHostedPrivatePocLogout(input) {
              return await get().perform(input);
            }
          `;
        }

        if (id === `\0${RUNTIME_MODULE}`) {
          return `
            import { get } from '${STATE_MODULE}';
            export function resolveStudioRuntimeMode() {
              return get().runtimeMode;
            }
          `;
        }

        return null;
      }
    }],
    server: {
      middlewareMode: true
    }
  });

  state = /** @type {typeof state} */ (
    await server.ssrLoadModule(STATE_MODULE)
  );
});

after(async () => {
  state?.reset();
  await server?.close();
});

test('Visitor POST logout returns 404 for malformed or non-form input before parsing', async () => {
  assert.ok(server);
  const handler = await server.ssrLoadModule(
    '/src/routes/auth/logout/+server.js'
  );
  const attempted = request({
    throwFormData: true
  });
  let delegated = false;

  state.configure({
    runtimeMode: 'visitor',
    async perform() {
      delegated = true;
      throw new Error('Visitor mode must not delegate');
    }
  });

  await assert.rejects(
    handler.POST({
      request: attempted.request,
      cookies: {}
    }),
    hasHttpStatus(404)
  );

  assert.equal(attempted.formDataCalls(), 0);
  assert.equal(delegated, false);

  const nonFormRequest = new Request(
    'https://studio.example.com/auth/logout',
    {
      method: 'POST',
      headers: {
        origin: 'https://studio.example.com',
        'content-type': 'text/plain'
      },
      body: 'visitor-audit'
    }
  );

  await assert.rejects(
    handler.POST({
      request: nonFormRequest,
      cookies: {}
    }),
    hasHttpStatus(404)
  );

  assert.equal(delegated, false);
});

test('Hosted logout maps malformed form data and delegated CSRF rejection to 403', async () => {
  assert.ok(server);
  const handler = await server.ssrLoadModule(
    '/src/routes/auth/logout/+server.js'
  );
  const malformed = request({
    throwFormData: true
  });
  let delegated = false;

  state.configure({
    runtimeMode: 'hosted',
    async perform() {
      delegated = true;
      return {
        outcome: 'logged-out'
      };
    }
  });

  await assert.rejects(
    handler.POST({
      request: malformed.request,
      cookies: {}
    }),
    hasHttpStatus(403)
  );

  assert.equal(malformed.formDataCalls(), 1);
  assert.equal(delegated, false);

  const csrfRejected = request({
    csrfToken: 'wrong-csrf-token'
  });
  /** @type {any} */
  let received;

  state.configure({
    runtimeMode: 'hosted',
    async perform(input) {
      received = input;
      return {
        outcome: 'forbidden'
      };
    }
  });

  const cookies = {};

  await assert.rejects(
    handler.POST({
      request: csrfRejected.request,
      cookies
    }),
    hasHttpStatus(403)
  );

  assert.equal(csrfRejected.formDataCalls(), 1);
  assert.deepEqual(received, {
    runtimeMode: 'hosted',
    cookies,
    host: 'studio.example.com',
    origin: 'https://studio.example.com',
    method: 'POST',
    csrfToken: 'wrong-csrf-token'
  });
});

test('Hosted successful logout preserves delegated session and cookie effects', async () => {
  assert.ok(server);
  const handler = await server.ssrLoadModule(
    '/src/routes/auth/logout/+server.js'
  );
  const attempted = request();
  /** @type {Array<{ name: string, options: unknown }>} */
  const cookieCalls = [];
  const cookies = {
    /** @param {string} name @param {unknown} options */
    delete(name, options) {
      cookieCalls.push({
        name,
        options
      });
    }
  };
  let invalidated = false;

  state.configure({
    runtimeMode: 'hosted',
    async perform(input) {
      assert.deepEqual({
        runtimeMode: input.runtimeMode,
        host: input.host,
        origin: input.origin,
        method: input.method,
        csrfToken: input.csrfToken
      }, {
        runtimeMode: 'hosted',
        host: 'studio.example.com',
        origin: 'https://studio.example.com',
        method: 'POST',
        csrfToken: 'csrf-token'
      });
      assert.equal(input.cookies, cookies);
      invalidated = true;
      input.cookies.delete('__Host-atelier_studio_session', {
        path: '/'
      });

      return {
        outcome: 'logged-out'
      };
    }
  });

  const response = await handler.POST({
    request: attempted.request,
    cookies
  });

  assert.equal(attempted.formDataCalls(), 1);
  assert.equal(invalidated, true);
  assert.deepEqual(cookieCalls, [{
    name: '__Host-atelier_studio_session',
    options: {
      path: '/'
    }
  }]);
  assert.equal(response.status, 200);
  assert.equal(
    response.headers.get('content-type'),
    'text/plain; charset=utf-8'
  );
  assert.equal(response.headers.get('cache-control'), 'no-store');
  assert.equal(await response.text(), 'Signed out.');
});
