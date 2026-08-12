import assert from 'node:assert/strict';
import test from 'node:test';
import {
  DEMO_SANDBOX_MARKER_PATH,
  DEMO_SANDBOX_MARKER_PURPOSE,
  DemoSandboxTargetConfigurationError,
  DemoSandboxTargetVerificationError,
  createVerifiedDemoSandboxRepository,
  parseDemoSandboxTargetConfig,
  serializeExpectedDemoSandboxMarker,
  verifyDemoSandboxTarget
} from './demo-sandbox-target.js';

const MARKER =
  Buffer.alloc(32, 71).toString('base64url');

function environment(overrides = {}) {
  return {
    ATELIER_DEMO_GITHUB_REPOSITORY:
      'gcomneno/atelier-kit-demo-sandbox',
    ATELIER_DEMO_GITHUB_BRANCH:
      'demo',
    ATELIER_DEMO_GITHUB_TOKEN:
      'demo-repository-token',
    ATELIER_DEMO_SANDBOX_MARKER:
      MARKER,
    ...overrides
  };
}

test('Demo sandbox configuration is separate and fixed server-side', () => {
  const config =
    parseDemoSandboxTargetConfig(
      environment()
    );

  assert.deepEqual(config, {
    repository:
      'gcomneno/atelier-kit-demo-sandbox',
    branch: 'demo',
    token: 'demo-repository-token',
    marker: MARKER
  });

  assert.equal(
    Object.isFrozen(config),
    true
  );
});

test('canonical Atelier-Kit and matching Hosted repository fail closed', () => {
  assert.throws(
    () => parseDemoSandboxTargetConfig(
      environment({
        ATELIER_DEMO_GITHUB_REPOSITORY:
          'gcomneno/atelier-kit'
      })
    ),
    DemoSandboxTargetConfigurationError
  );

  assert.throws(
    () => parseDemoSandboxTargetConfig(
      environment({
        ATELIER_STUDIO_GITHUB_REPOSITORY:
          'GCOMNENO/ATELIER-KIT-DEMO-SANDBOX'
      })
    ),
    DemoSandboxTargetConfigurationError
  );
});

test('malformed repository branch token and marker fail closed', () => {
  for (const overrides of [
    {
      ATELIER_DEMO_GITHUB_REPOSITORY:
        'not-owner-repo'
    },
    {
      ATELIER_DEMO_GITHUB_BRANCH:
        '../main'
    },
    {
      ATELIER_DEMO_GITHUB_TOKEN:
        ''
    },
    {
      ATELIER_DEMO_SANDBOX_MARKER:
        'not-a-256-bit-marker'
    }
  ]) {
    assert.throws(
      () => parseDemoSandboxTargetConfig(
        environment(overrides)
      ),
      DemoSandboxTargetConfigurationError
    );
  }
});

test('Hosted repository comparison is canonical after surrounding whitespace', () => {
  assert.throws(
    () => parseDemoSandboxTargetConfig(
      environment({
        ATELIER_STUDIO_GITHUB_REPOSITORY:
          '  GCOMNENO/ATELIER-KIT-DEMO-SANDBOX  '
      })
    ),
    DemoSandboxTargetConfigurationError
  );
});

test('marker verification requires a canonical GitHub revision', async () => {
  const config =
    parseDemoSandboxTargetConfig(
      environment()
    );

  await assert.rejects(
    () => verifyDemoSandboxTarget({
      config,
      repository: {
        async readText() {
          return {
            content:
              serializeExpectedDemoSandboxMarker(
                config
              ),
            revision:
              'not-a-github-revision'
          };
        }
      }
    }),
    DemoSandboxTargetVerificationError
  );
});

test('expected marker binds purpose repository branch and deployment marker', () => {
  const config =
    parseDemoSandboxTargetConfig(
      environment()
    );

  const document =
    JSON.parse(
      serializeExpectedDemoSandboxMarker(
        config
      )
    );

  assert.deepEqual(document, {
    purpose:
      DEMO_SANDBOX_MARKER_PURPOSE,
    repository:
      'gcomneno/atelier-kit-demo-sandbox',
    branch: 'demo',
    marker: MARKER
  });
});

test('target verification reads only the fixed marker path', async () => {
  const config =
    parseDemoSandboxTargetConfig(
      environment()
    );

  /** @type {string[]} */
  const calls = [];

  const result =
    await verifyDemoSandboxTarget({
      config,
      repository: {
        async readText(path) {
          calls.push(path);

          return {
            content:
              serializeExpectedDemoSandboxMarker(
                config
              ),
            revision:
              'github:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa'
          };
        }
      }
    });

  assert.deepEqual(
    calls,
    [DEMO_SANDBOX_MARKER_PATH]
  );

  assert.deepEqual(result, {
    revision:
      'github:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa'
  });
});

test('missing malformed copied or stale marker never verifies', async () => {
  const config =
    parseDemoSandboxTargetConfig(
      environment()
    );

  const wrongTarget =
    parseDemoSandboxTargetConfig(
      environment({
        ATELIER_DEMO_GITHUB_REPOSITORY:
          'gcomneno/another-demo-sandbox'
      })
    );

  for (const behavior of [
    async () => {
      throw new Error('missing');
    },
    async () => ({
      content: '{}\n',
      revision:
        'github:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa'
    }),
    async () => ({
      content:
        serializeExpectedDemoSandboxMarker(
          wrongTarget
        ),
      revision:
        'github:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa'
    })
  ]) {
    await assert.rejects(
      () => verifyDemoSandboxTarget({
        config,
        repository: {
          readText: behavior
        }
      }),
      DemoSandboxTargetVerificationError
    );
  }
});

test('verified factory never exposes write authority before marker success', async () => {
  let writes = 0;

  await assert.rejects(
    () =>
      createVerifiedDemoSandboxRepository(
        environment(),
        {
          repositoryFactory() {
            return {
              async readText() {
                return {
                  content: '{}\n',
                  revision:
                    'github:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa'
                };
              },
              async writeText() {
                writes += 1;
                return {
                  revision:
                    'github:bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb'
                };
              }
            };
          }
        }
      ),
    DemoSandboxTargetVerificationError
  );

  assert.equal(writes, 0);
});

test('verified factory returns only an already-marked repository object', async () => {
  const config =
    parseDemoSandboxTargetConfig(
      environment()
    );

  const repository = {
    async readText() {
      return {
        content:
          serializeExpectedDemoSandboxMarker(
            config
          ),
        revision:
          'github:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa'
      };
    },
    async writeText() {
      return {
        revision:
          'github:bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb'
      };
    }
  };

  const verified =
    await createVerifiedDemoSandboxRepository(
      environment(),
      {
        repositoryFactory() {
          return repository;
        }
      }
    );

  assert.deepEqual(verified, {
    repository,
    verifiedRevision:
      'github:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa'
  });

  assert.equal(
    Object.isFrozen(verified),
    true
  );
});
