import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import {
  parseHostedAuthorizationConfig
} from './hosted-authorization.js';
import {
  HostedRouteGate
} from './hosted-route-gate.js';
import {
  AuthoringRevisionConflictError
} from './authoring-repository-boundary.js';
/** @type {typeof import('./hosted-social-authoring.js').HostedSocialAuthoringReadError} */
let HostedSocialAuthoringReadError;
/** @type {typeof import('./hosted-social-authoring.js').HostedSocialAuthoringRevisionError} */
let HostedSocialAuthoringRevisionError;
/** @type {typeof import('./hosted-social-authoring.js').HostedSocialAuthoringValidationError} */
let HostedSocialAuthoringValidationError;
/** @type {typeof import('./hosted-social-authoring.js').HostedSocialAuthoringWriteError} */
let HostedSocialAuthoringWriteError;
/** @type {typeof import('./hosted-social-authoring.js').loadHostedSocialAuthoringData} */
let loadHostedSocialAuthoringData;
/** @type {typeof import('./hosted-social-authoring.js').saveHostedSocialAuthoringData} */
let saveHostedSocialAuthoringData;

let missingPortableYaml = false;

try {
  ({
    HostedSocialAuthoringReadError,
    HostedSocialAuthoringRevisionError,
    HostedSocialAuthoringValidationError,
    HostedSocialAuthoringWriteError,
    loadHostedSocialAuthoringData,
    saveHostedSocialAuthoringData
  } = await import('./hosted-social-authoring.js'));
} catch (error) {
  const moduleError =
    /** @type {{ code?: string, message?: string }} */ (
      error
    );

  const missingYaml =
    moduleError.code === 'ERR_MODULE_NOT_FOUND' &&
    String(moduleError.message ?? '').includes(
      "package 'yaml'"
    );

  if (!missingYaml) throw error;

  missingPortableYaml = true;
}

const portableTest =
  missingPortableYaml
    ? test.skip
    : test;

const REVISION =
  'github:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';


/** @param {Record<string, unknown>} [values] */
function formData(values = {}) {
  return {
    /** @param {string} name */
    get(name) {
      return Object.prototype.hasOwnProperty.call(
        values,
        name
      )
        ? values[name]
        : null;
    }
  };
}

async function createGenuineContext() {
  const csrfToken =
    Buffer.alloc(32, 7).toString('base64url');

  const currentSession = {
    sessionId: 'A'.repeat(43),
    identity: {
      provider: 'github',
      subject: '123'
    },
    authorization: 'authorized',
    csrfToken,
    createdAt: 100,
    rotatedAt: 100,
    lastSeenAt: 100,
    expiresAt: 1000
  };

  const lifecycle = {
    resolve() {
      return {
        session: currentSession,
        rotationDue: false
      };
    },
    touch() {
      return {
        session: {
          ...currentSession,
          lastSeenAt: 150
        },
        rotationDue: false
      };
    },
    rotate() {
      throw new Error('rotation not expected');
    }
  };

  const gate =
    new HostedRouteGate({
      sessionLifecycle: lifecycle,
      authorizationConfig:
        parseHostedAuthorizationConfig({
          ATELIER_STUDIO_AUTHORIZED_GITHUB_IDS:
            '123'
        })
    });

  const result =
    await gate.evaluate(
      'hosted',
      currentSession.sessionId
    );

  assert.equal(result.outcome, 'allowed');
  assert.ok(result.context);

  return result.context;
}

const GENUINE_CONTEXT = await createGenuineContext();

function genuineContext() {
  return GENUINE_CONTEXT;
}

portableTest('Hosted Social read requires genuine Hosted trusted context', async () => {
  let factoryCalled = false;

  await assert.rejects(
    () =>
      loadHostedSocialAuthoringData({
        runtimeMode: 'hosted',
        hostedContext: {},
        environment: {},
        repositoryFactory() {
          factoryCalled = true;
          throw new Error('must not run');
        }
      }),
    HostedSocialAuthoringReadError
  );

  assert.equal(factoryCalled, false);

  await assert.rejects(
    () =>
      loadHostedSocialAuthoringData({
        runtimeMode: 'local',
        hostedContext: genuineContext(),
        environment: {},
        repositoryFactory() {
          factoryCalled = true;
          throw new Error('must not run');
        }
      }),
    HostedSocialAuthoringReadError
  );

  assert.equal(factoryCalled, false);
});

portableTest('Hosted Social reads only the fixed repository path and returns form plus revision', async () => {
  /** @type {string[]} */
  const paths = [];

  const result =
    await loadHostedSocialAuthoringData({
      runtimeMode: 'hosted',
      hostedContext: genuineContext(),
      environment: {
        SECRET_SENTINEL:
          'must-not-cross-browser-boundary'
      },
      repositoryFactory() {
        return {
          async readText(path) {
            paths.push(path);

            return {
              content: [
                'social:',
                '  links:',
                '    - id: github',
                '      url: https://github.com/example',
                ''
              ].join('\n'),
              revision: REVISION
            };
          }
        };
      }
    });

  assert.deepEqual(paths, [
    'config/social.yaml'
  ]);

  assert.deepEqual(result, {
    socialForm: {
      instagram: '',
      facebook: '',
      x: '',
      github:
        'https://github.com/example'
    },
    authoringRevision: REVISION
  });

  const serialized =
    JSON.stringify(result);

  assert.equal(
    serialized.includes('must-not-cross'),
    false
  );
});

portableTest('malformed repository content revision or transport failures become one safe error', async () => {
  const cases = [
    {
      content: 'social: [broken',
      revision: REVISION
    },
    {
      content: 'social:\n  links: []\n',
      revision: 'not-a-github-revision'
    }
  ];

  for (const value of cases) {
    await assert.rejects(
      () =>
        loadHostedSocialAuthoringData({
          runtimeMode: 'hosted',
          hostedContext: genuineContext(),
          environment: {},
          repositoryFactory() {
            return {
              async readText() {
                return value;
              }
            };
          }
        }),
      (error) => {
        assert.ok(
          error instanceof
            HostedSocialAuthoringReadError
        );
        assert.equal(
          error.message,
          'Hosted Social authoring is unavailable.'
        );
        return true;
      }
    );
  }

  await assert.rejects(
    () =>
      loadHostedSocialAuthoringData({
        runtimeMode: 'hosted',
        hostedContext: genuineContext(),
        environment: {},
        repositoryFactory() {
          throw new Error(
            'SECRET_REPOSITORY_TOKEN_SENTINEL'
          );
        }
      }),
    (error) => {
      assert.ok(
        error instanceof
          HostedSocialAuthoringReadError
      );
      assert.equal(
        error.message.includes('SENTINEL'),
        false
      );
      return true;
    }
  );
});

portableTest('Hosted Social validation and revision checks happen before repository mutation', async () => {
  let factoryCalls = 0;

  await assert.rejects(
    () =>
      saveHostedSocialAuthoringData({
        runtimeMode: 'hosted',
        hostedContext: genuineContext(),
        formData: formData({
          url_github:
            'https://example.com/not-github'
        }),
        expectedRevision: REVISION,
        environment: {},
        repositoryFactory() {
          factoryCalls += 1;
          throw new Error('must not run');
        }
      }),
    HostedSocialAuthoringValidationError
  );

  assert.equal(factoryCalls, 0);

  await assert.rejects(
    () =>
      saveHostedSocialAuthoringData({
        runtimeMode: 'hosted',
        hostedContext: genuineContext(),
        formData: formData({
          url_github:
            'https://github.com/example'
        }),
        expectedRevision: 'malformed',
        environment: {},
        repositoryFactory() {
          factoryCalls += 1;
          throw new Error('must not run');
        }
      }),
    HostedSocialAuthoringRevisionError
  );

  assert.equal(factoryCalls, 0);
});

portableTest('Hosted Social mutation writes only fixed path with fixed commit message and expected revision', async () => {
  /** @type {any[]} */
  const calls = [];

  const result =
    await saveHostedSocialAuthoringData({
      runtimeMode: 'hosted',
      hostedContext: genuineContext(),
      formData: formData({
        url_instagram:
          ' https://instagram.com/example ',
        url_github:
          'https://github.com/example'
      }),
      expectedRevision: REVISION,
      environment: {
        REQUEST_PATH:
          'content/news/browser-controlled.yaml',
        COMMIT_MESSAGE:
          'browser controlled'
      },
      repositoryFactory() {
        return {
          async writeText(
            path,
            content,
            options
          ) {
            calls.push({
              path,
              content,
              options
            });

            return {
              revision:
                'github:bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb'
            };
          }
        };
      }
    });

  assert.equal(calls.length, 1);
  assert.deepEqual(calls[0], {
    path: 'config/social.yaml',
    content: [
      'social:',
      '  links:',
      '    - id: instagram',
      '      url: https://instagram.com/example',
      '    - id: github',
      '      url: https://github.com/example',
      ''
    ].join('\n'),
    options: {
      expectedRevision: REVISION,
      message:
        'studio: update social links'
    }
  });

  assert.deepEqual(result, {
    socialForm: {
      instagram:
        'https://instagram.com/example',
      facebook: '',
      x: '',
      github:
        'https://github.com/example'
    },
    authoringRevision:
      'github:bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb'
  });
});

portableTest('Hosted Social mutation preserves revision conflicts and redacts other repository failures', async () => {
  const conflict =
    new AuthoringRevisionConflictError(
      'main',
      REVISION,
      'github:bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb'
    );

  await assert.rejects(
    () =>
      saveHostedSocialAuthoringData({
        runtimeMode: 'hosted',
        hostedContext: genuineContext(),
        formData: formData({}),
        expectedRevision: REVISION,
        environment: {},
        repositoryFactory() {
          return {
            async writeText() {
              throw conflict;
            }
          };
        }
      }),
    (error) => {
      assert.equal(error, conflict);
      return true;
    }
  );

  await assert.rejects(
    () =>
      saveHostedSocialAuthoringData({
        runtimeMode: 'hosted',
        hostedContext: genuineContext(),
        formData: formData({}),
        expectedRevision: REVISION,
        environment: {},
        repositoryFactory() {
          throw new Error(
            'SECRET_GITHUB_TOKEN_SENTINEL'
          );
        }
      }),
    (error) => {
      assert.ok(
        error instanceof
          HostedSocialAuthoringWriteError
      );
      assert.equal(
        error.message.includes('SENTINEL'),
        false
      );
      return true;
    }
  );
});

portableTest('Hosted Social runtime boundary has no Local filesystem or publish dependency', () => {
  const hosted =
    readFileSync(
      'src/lib/server/hosted-social-authoring.js',
      'utf8'
    );

  const route =
    readFileSync(
      'src/routes/studio/site/social/+page.server.js',
      'utf8'
    );

  for (const source of [
    hosted,
    route
  ]) {
    assert.equal(
      /from\s+['"](?:\.\/|\$lib\/server\/)authoring-repository\.js['"]/
        .test(source),
      false
    );

    for (const forbidden of [
      'node:fs',
      'studio-io',
      'writeProjectYaml',
      'runStructuralValidation',
      'child_process',
      'spawnSync',
      'vercel',
      'publish'
    ]) {
      assert.equal(
        source.includes(forbidden),
        false,
        `Hosted Social boundary must not include ${forbidden}`
      );
    }
  }
});
