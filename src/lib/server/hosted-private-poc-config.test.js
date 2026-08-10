import assert from 'node:assert/strict';
import test from 'node:test';
import {
  HOSTED_PRIVATE_POC_STATE_TOPOLOGIES,
  HostedPrivatePocConfigurationError,
  resolveHostedPrivatePocConfig
} from './hosted-private-poc-config.js';

const SECRETS = Object.freeze({
  clientSecret:
    'CLIENT_SECRET_POC_SENTINEL_DO_NOT_LOG',
  repository:
    'REPOSITORY_SECRET_POC_SENTINEL_DO_NOT_LOG',
  unrelated:
    'UNRELATED_SECRET_POC_SENTINEL_DO_NOT_LOG',
  redisUrl:
    'https://redis-config-secret.example.com',
  redisToken:
    'REDIS_TOKEN_POC_SENTINEL_DO_NOT_LOG',
  redisNamespace:
    'private-prod-redis-sentinel'
});

function completeEnvironment(overrides = {}) {
  return {
    ATELIER_STUDIO_MODE: 'hosted',
    ATELIER_STUDIO_PRIVATE_POC: '1',
    ATELIER_STUDIO_PRIVATE_POC_STATE_TOPOLOGY:
      'single-process',
    ATELIER_STUDIO_CANONICAL_ORIGIN:
      'https://studio.example.com',
    ATELIER_STUDIO_GITHUB_CLIENT_ID:
      'github-client-id',
    ATELIER_STUDIO_GITHUB_CLIENT_SECRET:
      SECRETS.clientSecret,
    ATELIER_STUDIO_GITHUB_CALLBACK_URL:
      'https://studio.example.com/auth/github/callback',
    ATELIER_STUDIO_AUTHORIZED_GITHUB_IDS:
      '123,456',
    ATELIER_STUDIO_GITHUB_REPOSITORY_TOKEN:
      SECRETS.repository,
    UNRELATED_SECRET: SECRETS.unrelated,
    ...overrides
  };
}

function persistentRedisEnvironment(overrides = {}) {
  return completeEnvironment({
    ATELIER_STUDIO_PRIVATE_POC_STATE_TOPOLOGY:
      'persistent-redis',
    ATELIER_STUDIO_STATE_REDIS_REST_URL:
      SECRETS.redisUrl,
    ATELIER_STUDIO_STATE_REDIS_REST_TOKEN:
      SECRETS.redisToken,
    ATELIER_STUDIO_STATE_NAMESPACE:
      SECRETS.redisNamespace,
    ...overrides
  });
}

test('visitor Local and invalid runtimes never require Hosted PoC configuration', () => {
  for (
    const runtimeMode of
    /** @type {Array<'visitor' | 'local' | 'invalid'>} */ ([
      'visitor',
      'local',
      'invalid'
    ])
  ) {
    assert.equal(
      resolveHostedPrivatePocConfig(
        runtimeMode,
        {
          ATELIER_STUDIO_PRIVATE_POC: '1',
          ATELIER_STUDIO_GITHUB_CLIENT_SECRET:
            SECRETS.clientSecret
        }
      ),
      null
    );
  }
});

test('Hosted mode alone does not activate the private PoC', () => {
  assert.equal(
    resolveHostedPrivatePocConfig(
      'hosted',
      {
        ATELIER_STUDIO_MODE: 'hosted'
      }
    ),
    null
  );

  assert.equal(
    resolveHostedPrivatePocConfig(
      'hosted',
      {
        ATELIER_STUDIO_MODE: 'hosted',
        ATELIER_STUDIO_PRIVATE_POC: '0'
      }
    ),
    null
  );
});

test('active private PoC requires the explicitly supported single-process state topology', () => {
  for (const topology of [
    undefined,
    '',
    'serverless',
    'multi-instance',
    'persistent',
    'redis'
  ]) {
    const environment =
      completeEnvironment();

    if (topology === undefined) {
      delete /** @type {Record<string, string | undefined>} */ (
      environment
    )[
        'ATELIER_STUDIO_PRIVATE_POC_STATE_TOPOLOGY'
      ];
    } else {
      environment[
        'ATELIER_STUDIO_PRIVATE_POC_STATE_TOPOLOGY'
      ] = topology;
    }

    assert.throws(
      () =>
        resolveHostedPrivatePocConfig(
          'hosted',
          environment
        ),
      HostedPrivatePocConfigurationError
    );
  }
});

test('unknown private PoC enablement values fail closed', () => {
  for (const enablement of [
    '',
    'true',
    'yes',
    '01',
    1
  ]) {
    assert.throws(
      () =>
        resolveHostedPrivatePocConfig(
          'hosted',
          completeEnvironment({
            ATELIER_STUDIO_PRIVATE_POC:
              enablement
          })
        ),
      HostedPrivatePocConfigurationError
    );
  }
});

test('complete Hosted private PoC configuration reuses canonical security boundaries', () => {
  const config =
    resolveHostedPrivatePocConfig(
      'hosted',
      completeEnvironment()
    );

  assert.ok(config);
  assert.equal(
    config.stateTopology,
    HOSTED_PRIVATE_POC_STATE_TOPOLOGIES
      .SINGLE_PROCESS
  );
  assert.deepEqual(config.origin, {
    origin: 'https://studio.example.com',
    host: 'studio.example.com'
  });
  assert.equal(
    config.oauth.callbackUrl,
    'https://studio.example.com/auth/github/callback'
  );
  assert.deepEqual(
    config.authorization.allowedGitHubSubjects,
    ['123', '456']
  );

  assert.equal(Object.isFrozen(config), true);
  assert.equal(Object.isFrozen(config.origin), true);
  assert.equal(Object.isFrozen(config.oauth), true);
  assert.equal(
    Object.isFrozen(config.authorization),
    true
  );
});

test('persistent Redis requires exactly its complete validated server configuration', () => {
  const config = resolveHostedPrivatePocConfig(
    'hosted',
    persistentRedisEnvironment()
  );

  assert.equal(
    config?.stateTopology,
    HOSTED_PRIVATE_POC_STATE_TOPOLOGIES.PERSISTENT_REDIS
  );
  assert.deepEqual(config?.redis, {
    url: SECRETS.redisUrl,
    token: SECRETS.redisToken,
    namespace: SECRETS.redisNamespace
  });
  assert.equal(Object.isFrozen(config?.redis), true);

  for (const missing of [
    'ATELIER_STUDIO_STATE_REDIS_REST_URL',
    'ATELIER_STUDIO_STATE_REDIS_REST_TOKEN',
    'ATELIER_STUDIO_STATE_NAMESPACE'
  ]) {
    const environment = persistentRedisEnvironment();
    delete /** @type {Record<string, unknown>} */ (environment)[missing];
    assert.throws(
      () => resolveHostedPrivatePocConfig('hosted', environment),
      HostedPrivatePocConfigurationError
    );
  }
});

test('Redis settings are a closed topology contract', () => {
  for (const settings of [
    {
      ATELIER_STUDIO_STATE_REDIS_REST_URL: SECRETS.redisUrl
    },
    {
      ATELIER_STUDIO_STATE_REDIS_REST_TOKEN: SECRETS.redisToken
    },
    {
      ATELIER_STUDIO_STATE_NAMESPACE: SECRETS.redisNamespace
    },
    {
      ATELIER_STUDIO_STATE_REDIS_REST_URL: SECRETS.redisUrl,
      ATELIER_STUDIO_STATE_REDIS_REST_TOKEN: SECRETS.redisToken,
      ATELIER_STUDIO_STATE_NAMESPACE: SECRETS.redisNamespace
    }
  ]) {
    assert.throws(
      () => resolveHostedPrivatePocConfig(
        'hosted', completeEnvironment(settings)
      ),
      HostedPrivatePocConfigurationError
    );
  }
});

test('persistent Redis rejects non-canonical URLs and invalid namespaces without diagnostics', () => {
  for (const overrides of [
    { ATELIER_STUDIO_STATE_REDIS_REST_URL: 'http://redis.example.com' },
    { ATELIER_STUDIO_STATE_REDIS_REST_URL: 'https://redis.example.com/' },
    { ATELIER_STUDIO_STATE_REDIS_REST_URL: 'https://REDIS.example.com' },
    { ATELIER_STUDIO_STATE_REDIS_REST_URL: 'https://redis.example.com/path' },
    { ATELIER_STUDIO_STATE_REDIS_REST_URL: 'https://redis.example.com?x=1' },
    { ATELIER_STUDIO_STATE_NAMESPACE: 'Invalid Namespace' },
    { ATELIER_STUDIO_STATE_NAMESPACE: 'too__many' }
  ]) {
    let caught;
    try {
      resolveHostedPrivatePocConfig(
        'hosted', persistentRedisEnvironment(overrides)
      );
    } catch (error) {
      caught = error;
    }
    assert.ok(caught instanceof HostedPrivatePocConfigurationError);
    /** @type {string} */
    const diagnostic = String(caught);
    for (const value of Object.values(SECRETS)) {
      assert.equal(diagnostic.includes(value), false);
    }
  }
});

test('OAuth callback must belong to the exact canonical authoring origin', () => {
  assert.throws(
    () =>
      resolveHostedPrivatePocConfig(
        'hosted',
        completeEnvironment({
          ATELIER_STUDIO_GITHUB_CALLBACK_URL:
            'https://other.example.com/auth/github/callback'
        })
      ),
    HostedPrivatePocConfigurationError
  );
});

test('incomplete active configuration fails closed without secret-bearing diagnostics', () => {
  for (const key of [
    'ATELIER_STUDIO_CANONICAL_ORIGIN',
    'ATELIER_STUDIO_GITHUB_CLIENT_ID',
    'ATELIER_STUDIO_GITHUB_CLIENT_SECRET',
    'ATELIER_STUDIO_GITHUB_CALLBACK_URL',
    'ATELIER_STUDIO_AUTHORIZED_GITHUB_IDS'
  ]) {
    const environment =
      completeEnvironment();

    delete /** @type {Record<string, string | undefined>} */ (
      environment
    )[key];

    let caught;

    try {
      resolveHostedPrivatePocConfig(
        'hosted',
        environment
      );
    } catch (error) {
      caught = error;
    }

    assert.ok(
      caught instanceof
        HostedPrivatePocConfigurationError
    );

    const diagnostic =
      /** @type {string} */ (String(caught));

    for (const secret of Object.values(SECRETS)) {
      assert.equal(
        diagnostic.includes(secret),
        false
      );
    }

    assert.equal(
      diagnostic.includes('123,456'),
      false
    );
  }
});

test('repository and unrelated environment secrets are not part of the PoC configuration contract', () => {
  const config =
    resolveHostedPrivatePocConfig(
      'hosted',
      completeEnvironment()
    );

  const serialized = JSON.stringify(config);

  assert.equal(
    serialized.includes(SECRETS.repository),
    false
  );
  assert.equal(
    serialized.includes(SECRETS.unrelated),
    false
  );
});
