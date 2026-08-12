import assert from 'node:assert/strict';
import test from 'node:test';
import {
  AuthoringRevisionConflictError
} from './authoring-repository-boundary.js';
import {
  DEMO_SOCIAL_BASELINE,
  DEMO_SOCIAL_RESET_COMMIT_MESSAGE,
  resetDemoSocialSandbox
} from './demo-social-authoring.js';
import {
  serializeExpectedDemoSandboxMarker
} from './demo-sandbox-target.js';

const SHA_A =
  'github:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';

const SHA_B =
  'github:bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb';

const MARKER =
  Buffer.alloc(32, 71)
    .toString('base64url');

function environment() {
  return {
    ATELIER_DEMO_GITHUB_REPOSITORY:
      'gcomneno/atelier-kit-demo-sandbox',
    ATELIER_DEMO_GITHUB_BRANCH:
      'demo',
    ATELIER_DEMO_GITHUB_TOKEN:
      'demo-repository-token',
    ATELIER_DEMO_SANDBOX_MARKER:
      MARKER
  };
}

test('operator reset is a fixed forward commit after marker verification', async () => {
  /** @type {Array<any>} */
  const writes = [];

  const result =
    await resetDemoSocialSandbox({
      environment: environment(),
      repositoryFactory(config) {
        return {
          async readText(path) {
            assert.equal(
              path,
              '.atelier/demo-sandbox.json'
            );

            return {
              content:
                serializeExpectedDemoSandboxMarker(
                  config
                ),
              revision: SHA_A
            };
          },

          async writeText(
            path,
            content,
            options
          ) {
            writes.push({
              path,
              content,
              options
            });

            return {
              revision: SHA_B
            };
          }
        };
      }
    });

  assert.deepEqual(writes, [
    {
      path: 'config/social.yaml',
      content: DEMO_SOCIAL_BASELINE,
      options: {
        expectedRevision: SHA_A,
        message:
          DEMO_SOCIAL_RESET_COMMIT_MESSAGE
      }
    }
  ]);

  assert.deepEqual(result, {
    previousRevision: SHA_A,
    revision: SHA_B
  });
});

test('operator reset baseline is canonical and authority-free', () => {
  assert.equal(
    DEMO_SOCIAL_BASELINE,
    'social:\n  links: []\n'
  );

  assert.equal(
    DEMO_SOCIAL_RESET_COMMIT_MESSAGE,
    'demo: reset social links'
  );

  for (const forbidden of [
    'repository',
    'branch',
    'token',
    'session',
    'csrf',
    'commitMessage'
  ]) {
    assert.equal(
      DEMO_SOCIAL_BASELINE.includes(forbidden),
      false
    );
  }
});

test('marker failure cannot reach reset write authority', async () => {
  let writes = 0;

  await assert.rejects(
    () =>
      resetDemoSocialSandbox({
        environment: environment(),
        repositoryFactory() {
          return {
            async readText() {
              return {
                content: '{}\\n',
                revision: SHA_A
              };
            },
            async writeText() {
              writes += 1;

              return {
                revision: SHA_B
              };
            }
          };
        }
      }),
    /Demo Social authoring write failed/
  );

  assert.equal(writes, 0);
});

test('reset preserves optimistic-concurrency conflict', async () => {
  await assert.rejects(
    () =>
      resetDemoSocialSandbox({
        environment: environment(),
        repositoryFactory(config) {
          return {
            async readText() {
              return {
                content:
                  serializeExpectedDemoSandboxMarker(
                    config
                  ),
                revision: SHA_A
              };
            },

            async writeText(
              path,
              content,
              options
            ) {
              throw new AuthoringRevisionConflictError(
                path,
                options.expectedRevision,
                SHA_B
              );
            }
          };
        }
      }),
    AuthoringRevisionConflictError
  );
});
