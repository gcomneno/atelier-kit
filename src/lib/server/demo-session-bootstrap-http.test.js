import assert from 'node:assert/strict';
import test from 'node:test';
import {
  applyDemoSessionBootstrapRequest,
  DEMO_SESSION_BOOTSTRAP_OUTCOMES
} from './demo-session-bootstrap-http.js';
import {
  DEMO_SESSION_COOKIE_NAME
} from './demo-session-cookie.js';
import {
  DEMO_SESSION_ISSUANCE_OUTCOMES
} from './demo-session-issuance-limiter.js';

const SESSION_ID =
  Buffer.alloc(32, 111)
    .toString('base64url');

/**
 * @param {{
 *   path?: string,
 *   method?: string,
 *   host?: string,
 *   origin?: string,
 *   sessionId?: string
 * }} [options]
 */
function event({
  path = '/demo/start',
  method = 'POST',
  host = 'demo.example.test',
  origin = 'https://demo.example.test',
  sessionId
} = {}) {
  /** @type {any[]} */
  const cookieWrites = [];

  let currentSessionId =
    sessionId;

  return {
    event: {
      url:
        new URL(
          `https://demo.example.test${path}`
        ),
      request: {
        method,
        headers: {
          /** @param {string} name */
          get(name) {
            if (name === 'host') {
              return host;
            }

            if (name === 'origin') {
              return origin;
            }

            if (
              name ===
                'x-vercel-forwarded-for'
            ) {
              return '203.0.113.20';
            }

            return null;
          }
        }
      },
      cookies: {
        /** @param {string} name */
        get(name) {
          assert.equal(
            name,
            DEMO_SESSION_COOKIE_NAME
          );

          return currentSessionId;
        },

        /**
         * @param {string} name
         * @param {string} value
         * @param {object} options
         */
        set(name, value, options) {
          currentSessionId =
            value;

          cookieWrites.push([
            'set',
            name,
            value,
            options
          ]);
        },

        /**
         * @param {string} name
         * @param {object} options
         */
        delete(name, options) {
          currentSessionId =
            undefined;

          cookieWrites.push([
            'delete',
            name,
            options
          ]);
        }
      }
    },
    cookieWrites
  };
}

function environment() {
  return {
    VERCEL: '1',
    ATELIER_DEMO_CANONICAL_ORIGIN:
      'https://demo.example.test'
  };
}

test('bootstrap is exact Demo POST only and rejects request integrity before runtime access', async () => {
  let runtimeCalls = 0;

  const runtimeResolver = () => {
    runtimeCalls += 1;
    throw new Error(
      'must not resolve'
    );
  };

  for (const input of [
    {
      runtimeMode: 'visitor',
      fixture: event()
    },
    {
      runtimeMode: 'demo',
      fixture:
        event({
          path: '/demo/other'
        })
    },
    {
      runtimeMode: 'demo',
      fixture:
        event({
          host:
            'evil.example.test'
        })
    },
    {
      runtimeMode: 'demo',
      fixture:
        event({
          origin:
            'https://evil.example.test'
        })
    }
  ]) {
    const result =
      await applyDemoSessionBootstrapRequest({
        event:
          input.fixture.event,
        runtimeMode:
          input.runtimeMode,
        environment:
          environment(),
        runtimeResolver
      });

    assert.notEqual(
      result.outcome,
      DEMO_SESSION_BOOTSTRAP_OUTCOMES
        .ALLOWED
    );
  }

  assert.equal(
    runtimeCalls,
    0
  );
});

test('GET-shaped bootstrap cannot consume issuance authority', async () => {
  let issued = 0;

  const result =
    await applyDemoSessionBootstrapRequest({
      event:
        event({
          method: 'GET'
        }).event,
      runtimeMode: 'demo',
      environment:
        environment(),
      runtimeResolver: () => ({
        async issueGuestSession() {
          issued += 1;
          return {
            outcome:
              DEMO_SESSION_ISSUANCE_OUTCOMES
                .ALLOWED,
            session: {
              sessionId:
                SESSION_ID
            }
          };
        },
        async invalidateGuestSession() {
          return true;
        }
      })
    });

  assert.equal(
    result.outcome,
    DEMO_SESSION_BOOTSTRAP_OUTCOMES
      .METHOD_NOT_ALLOWED
  );

  assert.equal(issued, 0);
});

test('trusted issuance subject is resolved before guest session creation', async () => {
  const fixture =
    event();

  let subjectSeen;

  const result =
    await applyDemoSessionBootstrapRequest({
      event: fixture.event,
      runtimeMode: 'demo',
      environment:
        environment(),
      subjectResolver({
        environment,
        headers
      }) {
        assert.equal(
          /** @type {Record<string, unknown>} */ (
            environment
          ).VERCEL,
          '1'
        );

        assert.ok(headers);

        return 'trusted-subject';
      },
      runtimeResolver: () => ({
        /** @param {string} subject */
        async issueGuestSession(
          subject
        ) {
          subjectSeen =
            subject;

          return {
            outcome:
              DEMO_SESSION_ISSUANCE_OUTCOMES
                .ALLOWED,
            session: {
              sessionId:
                SESSION_ID
            }
          };
        },
        async invalidateGuestSession() {
          return true;
        }
      })
    });

  assert.equal(
    subjectSeen,
    'trusted-subject'
  );

  assert.equal(
    result.outcome,
    DEMO_SESSION_BOOTSTRAP_OUTCOMES
      .ALLOWED
  );

  assert.equal(
    fixture.cookieWrites.length,
    1
  );

  assert.equal(
    fixture.cookieWrites[0][0],
    'set'
  );

  assert.equal(
    fixture.cookieWrites[0][1],
    DEMO_SESSION_COOKIE_NAME
  );

  assert.equal(
    fixture.cookieWrites[0][2],
    SESSION_ID
  );
});

test('subject and global exhaustion never create browser session transport', async () => {
  for (const [
    issuanceOutcome,
    bootstrapOutcome
  ] of [
    [
      DEMO_SESSION_ISSUANCE_OUTCOMES
        .SUBJECT_EXHAUSTED,
      DEMO_SESSION_BOOTSTRAP_OUTCOMES
        .SUBJECT_EXHAUSTED
    ],
    [
      DEMO_SESSION_ISSUANCE_OUTCOMES
        .GLOBAL_EXHAUSTED,
      DEMO_SESSION_BOOTSTRAP_OUTCOMES
        .GLOBAL_EXHAUSTED
    ]
  ]) {
    const fixture =
      event();

    const result =
      await applyDemoSessionBootstrapRequest({
        event:
          fixture.event,
        runtimeMode: 'demo',
        environment:
          environment(),
        subjectResolver:
          () => 'subject',
        runtimeResolver:
          () => ({
            async issueGuestSession() {
              return {
                outcome:
                  issuanceOutcome,
                session: null
              };
            },
            async invalidateGuestSession() {
              throw new Error(
                'must not invalidate'
              );
            }
          })
      });

    assert.equal(
      result.outcome,
      bootstrapOutcome
    );

    assert.deepEqual(
      fixture.cookieWrites,
      []
    );
  }
});

test('cookie transport failure retires newly-created server authority', async () => {
  const fixture =
    event();

  fixture.event.cookies.set =
    () => {
      throw new Error(
        'cookie transport failed'
      );
    };

  let invalidated;

  const result =
    await applyDemoSessionBootstrapRequest({
      event: fixture.event,
      runtimeMode: 'demo',
      environment:
        environment(),
      subjectResolver:
        () => 'subject',
      runtimeResolver:
        () => ({
          async issueGuestSession() {
            return {
              outcome:
                DEMO_SESSION_ISSUANCE_OUTCOMES
                  .ALLOWED,
              session: {
                sessionId:
                  SESSION_ID
              }
            };
          },
          /** @param {string} sessionId */
          async invalidateGuestSession(
            sessionId
          ) {
            invalidated =
              sessionId;
            return true;
          }
        })
    });

  assert.equal(
    result.outcome,
    DEMO_SESSION_BOOTSTRAP_OUTCOMES
      .UNAVAILABLE
  );

  assert.equal(
    invalidated,
    SESSION_ID
  );
});

test('missing trusted Vercel subject fails closed before issuing a guest session', async () => {
  let issued = 0;

  const result =
    await applyDemoSessionBootstrapRequest({
      event:
        event().event,
      runtimeMode: 'demo',
      environment: {
        VERCEL: '0',
        ATELIER_DEMO_CANONICAL_ORIGIN:
          'https://demo.example.test'
      },
      runtimeResolver:
        () => ({
          async issueGuestSession() {
            issued += 1;
          },
          async invalidateGuestSession() {
            return true;
          }
        })
    });

  assert.equal(
    result.outcome,
    DEMO_SESSION_BOOTSTRAP_OUTCOMES
      .UNAVAILABLE
  );

  assert.equal(
    issued,
    0
  );
});


test('valid existing guest session bypasses subject resolution and issuance budget', async () => {
  const fixture =
    event({
      sessionId: SESSION_ID
    });

  let subjectCalls = 0;
  let issuanceCalls = 0;

  const result =
    await applyDemoSessionBootstrapRequest({
      event: fixture.event,
      runtimeMode: 'demo',
      environment:
        environment(),
      subjectResolver() {
        subjectCalls += 1;
        throw new Error(
          'must not derive another issuance subject'
        );
      },
      runtimeResolver: () => ({
        /**
         * @param {unknown} runtimeMode
         * @param {unknown} sessionId
         */
        async evaluateRequest(
          runtimeMode,
          sessionId
        ) {
          assert.equal(
            runtimeMode,
            'demo'
          );
          assert.equal(
            sessionId,
            SESSION_ID
          );

          return {
            outcome: 'allowed',
            context: {},
            sessionTransport: null
          };
        },

        async issueGuestSession() {
          issuanceCalls += 1;
          throw new Error(
            'must not issue another guest session'
          );
        },

        async invalidateGuestSession() {
          throw new Error(
            'must not invalidate valid authority'
          );
        }
      })
    });

  assert.equal(
    result.outcome,
    DEMO_SESSION_BOOTSTRAP_OUTCOMES
      .ALLOWED
  );

  assert.equal(subjectCalls, 0);
  assert.equal(issuanceCalls, 0);
  assert.deepEqual(
    fixture.cookieWrites,
    []
  );
});

test('existing guest rotation is transported without consuming issuance', async () => {
  const replacementSessionId =
    Buffer.alloc(32, 112)
      .toString('base64url');

  const fixture =
    event({
      sessionId: SESSION_ID
    });

  let issuanceCalls = 0;

  const result =
    await applyDemoSessionBootstrapRequest({
      event: fixture.event,
      runtimeMode: 'demo',
      environment:
        environment(),
      subjectResolver() {
        throw new Error(
          'must not resolve issuance subject'
        );
      },
      runtimeResolver: () => ({
        async evaluateRequest() {
          return {
            outcome: 'allowed',
            context: {},
            sessionTransport: {
              replaceSessionId:
                replacementSessionId
            }
          };
        },

        async issueGuestSession() {
          issuanceCalls += 1;
        },

        async invalidateGuestSession() {
          throw new Error(
            'must not invalidate successful rotation'
          );
        }
      })
    });

  assert.equal(
    result.outcome,
    DEMO_SESSION_BOOTSTRAP_OUTCOMES
      .ALLOWED
  );

  assert.equal(
    issuanceCalls,
    0
  );

  assert.equal(
    fixture.cookieWrites.length,
    1
  );

  assert.equal(
    fixture.cookieWrites[0][0],
    'set'
  );

  assert.equal(
    fixture.cookieWrites[0][2],
    replacementSessionId
  );
});

test('stale existing guest cookie is cleared before bounded replacement issuance', async () => {
  const fixture =
    event({
      sessionId: SESSION_ID
    });

  let subjectCalls = 0;
  let issuanceCalls = 0;

  const result =
    await applyDemoSessionBootstrapRequest({
      event: fixture.event,
      runtimeMode: 'demo',
      environment:
        environment(),
      subjectResolver() {
        subjectCalls += 1;
        return 'trusted-subject';
      },
      runtimeResolver: () => ({
        async evaluateRequest() {
          return {
            outcome:
              'session-required',
            context: null,
            sessionTransport: null
          };
        },

        async issueGuestSession() {
          issuanceCalls += 1;

          return {
            outcome:
              DEMO_SESSION_ISSUANCE_OUTCOMES
                .ALLOWED,
            session: {
              sessionId:
                SESSION_ID
            }
          };
        },

        async invalidateGuestSession() {
          return true;
        }
      })
    });

  assert.equal(
    result.outcome,
    DEMO_SESSION_BOOTSTRAP_OUTCOMES
      .ALLOWED
  );

  assert.equal(subjectCalls, 1);
  assert.equal(issuanceCalls, 1);

  assert.equal(
    fixture.cookieWrites[0][0],
    'delete'
  );

  assert.equal(
    fixture.cookieWrites[1][0],
    'set'
  );
});

test('failed rotation cookie transport retires replacement authority and never issues again', async () => {
  const replacementSessionId =
    Buffer.alloc(32, 113)
      .toString('base64url');

  const fixture =
    event({
      sessionId: SESSION_ID
    });

  fixture.event.cookies.set =
    () => {
      throw new Error(
        'rotation cookie transport failed'
      );
    };

  let invalidated;
  let issuanceCalls = 0;

  const result =
    await applyDemoSessionBootstrapRequest({
      event: fixture.event,
      runtimeMode: 'demo',
      environment:
        environment(),
      subjectResolver() {
        throw new Error(
          'must not derive issuance subject'
        );
      },
      runtimeResolver: () => ({
        async evaluateRequest() {
          return {
            outcome: 'allowed',
            context: {},
            sessionTransport: {
              replaceSessionId:
                replacementSessionId
            }
          };
        },

        async issueGuestSession() {
          issuanceCalls += 1;
        },

        /** @param {unknown} sessionId */
        async invalidateGuestSession(
          sessionId
        ) {
          invalidated =
            sessionId;

          return true;
        }
      })
    });

  assert.equal(
    result.outcome,
    DEMO_SESSION_BOOTSTRAP_OUTCOMES
      .UNAVAILABLE
  );

  assert.equal(
    invalidated,
    replacementSessionId
  );

  assert.equal(
    issuanceCalls,
    0
  );
});
