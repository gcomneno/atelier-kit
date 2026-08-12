import assert from 'node:assert/strict';
import test from 'node:test';
import {
  AuthoringRevisionConflictError
} from './authoring-repository-boundary.js';
import {
  DEMO_MUTATION_GUARD_OUTCOMES
} from './demo-mutation-guard.js';
import {
  loadDemoPublicSocialRoute,
  saveDemoPublicSocialRoute,
  DEMO_PUBLIC_SOCIAL_OUTCOMES
} from './demo-public-social-route.js';
import {
  DemoRouteGate
} from './demo-route-gate.js';
import {
  DemoSessionLifecycle
} from './demo-session.js';
import {
  InMemoryDemoSessionStore
} from './demo-session-store.js';
import {
  DemoSocialAuthoringValidationError
} from './demo-social-authoring.js';

const REVISION =
  `github:${'a'.repeat(40)}`;

const NEXT_REVISION =
  `github:${'b'.repeat(40)}`;

async function trustedContext() {
  const lifecycle =
    new DemoSessionLifecycle({
      store:
        new InMemoryDemoSessionStore(),
      clock: () => 1000,
      sessionIdGenerator: () =>
        Buffer.alloc(32, 71)
          .toString('base64url'),
      csrfTokenGenerator: () =>
        Buffer.alloc(32, 72)
          .toString('base64url')
    });

  const created =
    await lifecycle.create();

  const gate =
    new DemoRouteGate({
      sessionLifecycle: lifecycle
    });

  const decision =
    await gate.evaluate(
      'demo',
      created.sessionId
    );

  assert.equal(
    decision.outcome,
    'allowed'
  );

  return decision.context;
}

/**
 * @param {Map<string, string>} values
 */
function request(values) {
  return {
    method: 'POST',
    headers: {
      /** @param {string} name */
      get(name) {
        if (name === 'host') {
          return 'demo.example.test';
        }

        if (name === 'origin') {
          return 'https://demo.example.test';
        }

        return null;
      }
    },
    async formData() {
      return {
        /** @param {string} name */
        get(name) {
          return values.get(name) ?? null;
        }
      };
    }
  };
}

test('Demo Social load requires genuine trusted context before authoring authority', async () => {
  let loads = 0;

  const forged =
    await loadDemoPublicSocialRoute({
      runtimeMode: 'demo',
      demoContext: {
        runtime: 'demo'
      },
      authoringLoader: async () => {
        loads += 1;
        throw new Error(
          'must not load'
        );
      }
    });

  assert.equal(
    forged.outcome,
    DEMO_PUBLIC_SOCIAL_OUTCOMES.NOT_FOUND
  );
  assert.equal(loads, 0);

  const context =
    await trustedContext();

  const allowed =
    await loadDemoPublicSocialRoute({
      runtimeMode: 'demo',
      demoContext: context,
      authoringLoader: async () => ({
        socialForm: {
          instagram: '',
          facebook: '',
          x: '',
          github:
            'https://github.com/example'
        },
        authoringRevision:
          REVISION
      })
    });

  assert.equal(
    allowed.outcome,
    DEMO_PUBLIC_SOCIAL_OUTCOMES.ALLOWED
  );
  const allowedData =
    /** @type {{
     *   demoSocial: {
     *     authoringRevision: string,
     *     csrfToken: string
     *   }
     * }} */ (
      /** @type {unknown} */ (allowed)
    );

  assert.equal(
    allowedData.demoSocial.authoringRevision,
    REVISION
  );
  assert.equal(
    typeof allowedData.demoSocial.csrfToken,
    'string'
  );
  assert.equal(
    'sessionId' in allowedData.demoSocial,
    false
  );
});

test('integrity rejection never reaches Demo authoring saver', async () => {
  const context =
    await trustedContext();

  let saves = 0;

  const result =
    await saveDemoPublicSocialRoute({
      runtimeMode: 'demo',
      demoContext: context,
      request:
        request(
          new Map([
            ['demo_csrf_token', 'bad'],
            ['authoring_revision', REVISION]
          ])
        ),
      runtime: {
        async evaluateMutation() {
          return {
            outcome:
              DEMO_MUTATION_GUARD_OUTCOMES
                .FORBIDDEN
          };
        }
      },
      authoringSaver: async () => {
        saves += 1;
        throw new Error(
          'must not save'
        );
      }
    });

  assert.equal(
    result.outcome,
    DEMO_PUBLIC_SOCIAL_OUTCOMES.FORBIDDEN
  );
  assert.equal(saves, 0);
});

test('budget exhaustion and unavailable budget fail before repository authority', async () => {
  const context =
    await trustedContext();

  for (const guardOutcome of [
    DEMO_MUTATION_GUARD_OUTCOMES
      .BUDGET_EXHAUSTED,
    DEMO_MUTATION_GUARD_OUTCOMES
      .BUDGET_UNAVAILABLE
  ]) {
    let saves = 0;

    const result =
      await saveDemoPublicSocialRoute({
        runtimeMode: 'demo',
        demoContext: context,
        request:
          request(
            new Map([
              [
                'demo_csrf_token',
                Buffer.alloc(32, 72)
                  .toString('base64url')
              ],
              [
                'authoring_revision',
                REVISION
              ]
            ])
          ),
        runtime: {
          async evaluateMutation() {
            return {
              outcome: guardOutcome
            };
          }
        },
        authoringSaver: async () => {
          saves += 1;
          throw new Error(
            'must not save'
          );
        }
      });

    assert.equal(saves, 0);

    assert.equal(
      result.outcome,
      guardOutcome ===
        DEMO_MUTATION_GUARD_OUTCOMES
          .BUDGET_EXHAUSTED
        ? DEMO_PUBLIC_SOCIAL_OUTCOMES
            .BUDGET_EXHAUSTED
        : DEMO_PUBLIC_SOCIAL_OUTCOMES
            .BUDGET_UNAVAILABLE
    );
  }
});

test('allowed mutation forwards fixed trusted context and revision into Demo authoring', async () => {
  const context =
    await trustedContext();

  const csrfToken =
    Buffer.alloc(32, 72)
      .toString('base64url');

  let guarded = false;
  let saved = false;

  const result =
    await saveDemoPublicSocialRoute({
      runtimeMode: 'demo',
      demoContext: context,
      request:
        request(
          new Map([
            ['demo_csrf_token', csrfToken],
            ['authoring_revision', REVISION],
            [
              'url_github',
              'https://github.com/example'
            ]
          ])
        ),
      runtime: {
        async evaluateMutation(input) {
          guarded = true;
          assert.equal(
            input.runtimeMode,
            'demo'
          );
          assert.equal(
            input.trustedContext,
            context
          );
          assert.equal(
            input.host,
            'demo.example.test'
          );
          assert.equal(
            input.origin,
            'https://demo.example.test'
          );
          assert.equal(
            input.method,
            'POST'
          );
          assert.equal(
            input.csrfToken,
            csrfToken
          );

          return {
            outcome:
              DEMO_MUTATION_GUARD_OUTCOMES
                .ALLOWED,
            remaining: 4
          };
        }
      },
      authoringSaver: async (input) => {
        assert.equal(guarded, true);
        saved = true;

        assert.equal(
          input.runtimeMode,
          'demo'
        );
        assert.equal(
          input.demoContext,
          context
        );
        assert.equal(
          input.expectedRevision,
          REVISION
        );

        return {
          socialForm: {
            instagram: '',
            facebook: '',
            x: '',
            github:
              'https://github.com/example'
          },
          authoringRevision:
            NEXT_REVISION
        };
      }
    });

  assert.equal(saved, true);
  assert.equal(
    result.outcome,
    DEMO_PUBLIC_SOCIAL_OUTCOMES.ALLOWED
  );
  const resultData =
    /** @type {{
     *   demoSocial: {
     *     authoringRevision: string,
     *     remainingMutations: number
     *   }
     * }} */ (
      /** @type {unknown} */ (result)
    );

  assert.equal(
    resultData.demoSocial.authoringRevision,
    NEXT_REVISION
  );
  assert.equal(
    resultData.demoSocial.remainingMutations,
    4
  );
});

test('validation and optimistic-concurrency failures remain explicit and safe', async () => {
  const context =
    await trustedContext();

  const baseInput = {
    runtimeMode: 'demo',
    demoContext: context,
    request:
      request(
        new Map([
          [
            'demo_csrf_token',
            Buffer.alloc(32, 72)
              .toString('base64url')
          ],
          ['authoring_revision', REVISION],
          [
            'url_github',
            ' https://invalid.example '
          ]
        ])
      ),
    runtime: {
      async evaluateMutation() {
        return {
          outcome:
            DEMO_MUTATION_GUARD_OUTCOMES
              .ALLOWED,
          remaining: 3
        };
      }
    }
  };

  const invalid =
    await saveDemoPublicSocialRoute({
      ...baseInput,
      authoringSaver: async () => {
        throw new DemoSocialAuthoringValidationError(
          'github'
        );
      }
    });

  assert.equal(
    invalid.outcome,
    DEMO_PUBLIC_SOCIAL_OUTCOMES
      .VALIDATION_FAILED
  );
  const invalidData =
    /** @type {{
     *   invalidId: string,
     *   socialForm: {
     *     github: string
     *   }
     * }} */ (
      /** @type {unknown} */ (invalid)
    );

  assert.equal(
    invalidData.invalidId,
    'github'
  );
  assert.equal(
    invalidData.socialForm.github,
    'https://invalid.example'
  );

  const conflict =
    await saveDemoPublicSocialRoute({
      ...baseInput,
      authoringSaver: async () => {
        throw new AuthoringRevisionConflictError(
          'config/social.yaml',
          REVISION,
          NEXT_REVISION
        );
      }
    });

  assert.equal(
    conflict.outcome,
    DEMO_PUBLIC_SOCIAL_OUTCOMES.CONFLICT
  );
});
