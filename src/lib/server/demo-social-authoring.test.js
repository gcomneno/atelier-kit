import assert from 'node:assert/strict';
import test from 'node:test';
import {
  AuthoringRevisionConflictError
} from './authoring-repository-boundary.js';
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
  DEMO_SANDBOX_MARKER_PATH,
  parseDemoSandboxTargetConfig,
  serializeExpectedDemoSandboxMarker
} from './demo-sandbox-target.js';
import {
  DemoSocialAuthoringReadError,
  DemoSocialAuthoringRevisionError,
  DemoSocialAuthoringValidationError,
  DemoSocialAuthoringWriteError,
  loadDemoSocialAuthoringData,
  saveDemoSocialAuthoringData
} from './demo-social-authoring.js';
import {
  SOCIAL_AUTHORING_PATH,
  serializeSocialAuthoringDocument
} from './social-authoring.js';

const SHA_A =
  'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
const SHA_B =
  'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb';

const REVISION_A = `github:${SHA_A}`;
const REVISION_B = `github:${SHA_B}`;

const MARKER =
  Buffer.alloc(32, 91).toString('base64url');

function environment() {
  return {
    ATELIER_DEMO_GITHUB_REPOSITORY:
      'gcomneno/atelier-kit-demo-sandbox',
    ATELIER_DEMO_GITHUB_BRANCH:
      'demo',
    ATELIER_DEMO_GITHUB_TOKEN:
      'demo-token',
    ATELIER_DEMO_SANDBOX_MARKER:
      MARKER
  };
}

/**
 * @returns {Promise<object>}
 */
async function trustedDemoContext() {
  const lifecycle =
    new DemoSessionLifecycle({
      store:
        new InMemoryDemoSessionStore(),
      clock: () => 1000,
      sessionIdGenerator: () =>
        Buffer.alloc(32, 31)
          .toString('base64url'),
      csrfTokenGenerator: () =>
        Buffer.alloc(32, 32)
          .toString('base64url')
    });

  const session =
    await lifecycle.create();

  const gate =
    new DemoRouteGate({
      sessionLifecycle: lifecycle
    });

  const admitted =
    await gate.evaluate(
      'demo',
      session.sessionId
    );

  assert.ok(admitted.context);

  return admitted.context;
}

function emptySocialDocument() {
  return serializeSocialAuthoringDocument({
    social: {
      links: []
    }
  });
}

function emptyFormData() {
  return new FormData();
}

/**
 * @param {{
 *   markerRevision?: string,
 *   socialRevision?: string,
 *   writeRevision?: string,
 *   markerContent?: string,
 *   onWrite?: (
 *     path: string,
 *     content: string,
 *     options: {
 *       expectedRevision: string,
 *       message: string
 *     }
 *   ) => void
 * }} [options]
 */
function repositoryFactory({
  markerRevision = REVISION_A,
  socialRevision = REVISION_A,
  writeRevision = REVISION_B,
  markerContent,
  onWrite
} = {}) {
  return (
    /** @type {import('./demo-sandbox-target.js').DemoSandboxTargetConfig} */ config
  ) => ({
    /** @param {string} path */
    async readText(path) {
      if (path === DEMO_SANDBOX_MARKER_PATH) {
        return {
          content:
            markerContent ??
            serializeExpectedDemoSandboxMarker(
              config
            ),
          revision:
            markerRevision
        };
      }

      if (path === SOCIAL_AUTHORING_PATH) {
        return {
          content:
            emptySocialDocument(),
          revision:
            socialRevision
        };
      }

      throw new Error('unexpected path');
    },

    /**
     * @param {string} path
     * @param {string} content
     * @param {{
     *   expectedRevision: string,
     *   message: string
     * }} options
     */
    async writeText(
      path,
      content,
      options
    ) {
      onWrite?.(
        path,
        content,
        options
      );

      return {
        revision:
          writeRevision
      };
    }
  });
}

test('non-Demo and forged contexts cannot reach Demo repository authority', async () => {
  let factoryCalls = 0;

  const factory = () => {
    factoryCalls += 1;
    throw new Error('must not run');
  };

  await assert.rejects(
    () => loadDemoSocialAuthoringData({
      runtimeMode: 'hosted',
      demoContext: {},
      environment: environment(),
      repositoryFactory: factory
    }),
    DemoSocialAuthoringReadError
  );

  await assert.rejects(
    () => saveDemoSocialAuthoringData({
      runtimeMode: 'demo',
      demoContext: {},
      formData: emptyFormData(),
      expectedRevision:
        REVISION_A,
      environment: environment(),
      repositoryFactory: factory
    }),
    DemoSocialAuthoringWriteError
  );

  assert.equal(factoryCalls, 0);
});

test('Demo Social read verifies marker and document on the same revision', async () => {
  const context =
    await trustedDemoContext();

  /** @type {string[]} */
  const paths = [];

  const factory = (
    /** @type {import('./demo-sandbox-target.js').DemoSandboxTargetConfig} */ config
  ) => ({
    /** @param {string} path */
    async readText(path) {
      paths.push(path);

      if (
        path ===
        DEMO_SANDBOX_MARKER_PATH
      ) {
        return {
          content:
            serializeExpectedDemoSandboxMarker(
              config
            ),
          revision:
            REVISION_A
        };
      }

      return {
        content:
          emptySocialDocument(),
        revision:
          REVISION_A
      };
    },

    async writeText() {
      throw new Error('read must not write');
    }
  });

  const result =
    await loadDemoSocialAuthoringData({
      runtimeMode: 'demo',
      demoContext: context,
      environment: environment(),
      repositoryFactory: factory
    });

  assert.deepEqual(
    paths,
    [
      DEMO_SANDBOX_MARKER_PATH,
      SOCIAL_AUTHORING_PATH
    ]
  );

  assert.equal(
    result.authoringRevision,
    REVISION_A
  );

  assert.equal(
    Object.isFrozen(result),
    true
  );
});

test('marker and Social revision mismatch fails the read closed', async () => {
  const context =
    await trustedDemoContext();

  await assert.rejects(
    () => loadDemoSocialAuthoringData({
      runtimeMode: 'demo',
      demoContext: context,
      environment: environment(),
      repositoryFactory:
        repositoryFactory({
          markerRevision:
            REVISION_A,
          socialRevision:
            REVISION_B
        })
    }),
    DemoSocialAuthoringReadError
  );
});

test('invalid form and revision fail before repository verification', async () => {
  const context =
    await trustedDemoContext();

  let factoryCalls = 0;

  const factory = () => {
    factoryCalls += 1;
    throw new Error('must not run');
  };

  const malformedForm = {
    get() {
      return 'not-a-valid-url';
    }
  };

  await assert.rejects(
    () => saveDemoSocialAuthoringData({
      runtimeMode: 'demo',
      demoContext: context,
      formData: malformedForm,
      expectedRevision:
        REVISION_A,
      environment: environment(),
      repositoryFactory: factory
    }),
    DemoSocialAuthoringValidationError
  );

  await assert.rejects(
    () => saveDemoSocialAuthoringData({
      runtimeMode: 'demo',
      demoContext: context,
      formData: emptyFormData(),
      expectedRevision:
        'not-a-github-revision',
      environment: environment(),
      repositoryFactory: factory
    }),
    DemoSocialAuthoringRevisionError
  );

  assert.equal(factoryCalls, 0);
});

test('Demo Social mutation uses only fixed path message and verified expected revision', async () => {
  const context =
    await trustedDemoContext();

  /** @type {Array<{
   *   path: string,
   *   content: string,
   *   options: {
   *     expectedRevision: string,
   *     message: string
   *   }
   * }>} */
  const writes = [];

  const result =
    await saveDemoSocialAuthoringData({
      runtimeMode: 'demo',
      demoContext: context,
      formData: emptyFormData(),
      expectedRevision:
        REVISION_A,
      environment: environment(),
      repositoryFactory:
        repositoryFactory({
          onWrite(
            path,
            content,
            options
          ) {
            writes.push({
              path,
              content,
              options
            });
          }
        })
    });

  assert.equal(writes.length, 1);

  assert.equal(
    writes[0].path,
    SOCIAL_AUTHORING_PATH
  );

  assert.equal(
    writes[0].options.expectedRevision,
    REVISION_A
  );

  assert.equal(
    writes[0].options.message,
    'demo: update social links'
  );

  assert.equal(
    writes[0].content,
    emptySocialDocument()
  );

  assert.equal(
    result.authoringRevision,
    REVISION_B
  );
});

test('stale marker verification cannot authorize Demo Social mutation', async () => {
  const context =
    await trustedDemoContext();

  let writes = 0;

  await assert.rejects(
    () => saveDemoSocialAuthoringData({
      runtimeMode: 'demo',
      demoContext: context,
      formData: emptyFormData(),
      expectedRevision:
        REVISION_B,
      environment: environment(),
      repositoryFactory:
        repositoryFactory({
          markerRevision:
            REVISION_A,
          onWrite() {
            writes += 1;
          }
        })
    }),
    (error) => {
      assert.ok(
        error instanceof
          AuthoringRevisionConflictError
      );

      assert.equal(
        error.expectedRevision,
        REVISION_B
      );

      assert.equal(
        error.actualRevision,
        REVISION_A
      );

      return true;
    }
  );

  assert.equal(writes, 0);
});

test('marker failure and repository failures are redacted behind Demo errors', async () => {
  const context =
    await trustedDemoContext();

  await assert.rejects(
    () => loadDemoSocialAuthoringData({
      runtimeMode: 'demo',
      demoContext: context,
      environment: environment(),
      repositoryFactory:
        repositoryFactory({
          markerContent:
            'SECRET_BAD_TARGET_SENTINEL'
        })
    }),
    (error) => {
      assert.ok(
        error instanceof
          DemoSocialAuthoringReadError
      );

      assert.equal(
        error.message.includes(
          'SECRET_BAD_TARGET_SENTINEL'
        ),
        false
      );

      return true;
    }
  );

  await assert.rejects(
    () => saveDemoSocialAuthoringData({
      runtimeMode: 'demo',
      demoContext: context,
      formData: emptyFormData(),
      expectedRevision:
        REVISION_A,
      environment: environment(),
      repositoryFactory() {
        throw new Error(
          'SECRET_REPOSITORY_TOKEN_SENTINEL'
        );
      }
    }),
    (error) => {
      assert.ok(
        error instanceof
          DemoSocialAuthoringWriteError
      );

      assert.equal(
        error.message.includes(
          'SECRET_REPOSITORY_TOKEN_SENTINEL'
        ),
        false
      );

      return true;
    }
  );
});
