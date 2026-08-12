import assert from 'node:assert/strict';
import test from 'node:test';
import {
  DemoPublicConfigurationError,
  DEFAULT_DEMO_ISSUANCE_POLICY,
  resolveDemoPublicConfig
} from './demo-public-config.js';

const SECRET =
  Buffer.alloc(32, 91)
    .toString('base64url');

function environment(
  overrides = {}
) {
  return {
    ATELIER_STUDIO_MODE:
      'demo',
    ATELIER_DEMO_PUBLIC:
      '1',
    ATELIER_DEMO_CANONICAL_ORIGIN:
      'https://demo.example.test',
    ATELIER_DEMO_STATE_REDIS_REST_URL:
      'https://redis.example.test',
    ATELIER_DEMO_STATE_REDIS_REST_TOKEN:
      'REDIS_SECRET_DO_NOT_LOG',
    ATELIER_DEMO_STATE_NAMESPACE:
      'demo-prod',
    ATELIER_DEMO_ISSUANCE_SECRET:
      SECRET,
    ...overrides
  };
}

test('non-Demo runtimes never require Demo public state configuration', () => {
  for (const mode of [
    'visitor',
    'local',
    'hosted',
    'invalid'
  ]) {
    assert.equal(
      resolveDemoPublicConfig(
        mode,
        {}
      ),
      null
    );
  }
});

test('Demo public runtime requires explicit enablement', () => {
  assert.equal(
    resolveDemoPublicConfig(
      'demo',
      {
        ATELIER_STUDIO_MODE:
          'demo'
      }
    ),
    null
  );

  assert.equal(
    resolveDemoPublicConfig(
      'demo',
      {
        ATELIER_DEMO_PUBLIC:
          '0'
      }
    ),
    null
  );

  for (const invalid of [
    '',
    'true',
    'yes',
    1
  ]) {
    assert.throws(
      () =>
        resolveDemoPublicConfig(
          'demo',
          environment({
            ATELIER_DEMO_PUBLIC:
              invalid
          })
        ),
      DemoPublicConfigurationError
    );
  }
});

test('complete Demo configuration requires canonical origin persistent Redis and issuance secret', () => {
  const config =
    resolveDemoPublicConfig(
      'demo',
      environment()
    );

  assert.ok(config);

  assert.deepEqual(
    config.origin,
    {
      origin:
        'https://demo.example.test',
      host:
        'demo.example.test'
    }
  );

  assert.equal(
    config.redis.namespace,
    'demo-prod'
  );

  assert.equal(
    config.issuance.secret,
    SECRET
  );

  assert.equal(
    config.issuance.windowMs,
    DEFAULT_DEMO_ISSUANCE_POLICY
      .windowMs
  );

  assert.equal(
    Object.isFrozen(config),
    true
  );

  assert.equal(
    Object.isFrozen(config.redis),
    true
  );

  assert.equal(
    Object.isFrozen(
      config.issuance
    ),
    true
  );
});

test('incomplete or malformed persistent configuration fails closed without secret diagnostics', () => {
  const secretValues = [
    'REDIS_SECRET_DO_NOT_LOG',
    SECRET
  ];

  for (const missing of [
    'ATELIER_DEMO_CANONICAL_ORIGIN',
    'ATELIER_DEMO_STATE_REDIS_REST_URL',
    'ATELIER_DEMO_STATE_REDIS_REST_TOKEN',
    'ATELIER_DEMO_STATE_NAMESPACE',
    'ATELIER_DEMO_ISSUANCE_SECRET'
  ]) {
    const env =
      environment();

    delete /** @type {Record<string, unknown>} */ (
      env
    )[missing];

    let caught;

    try {
      resolveDemoPublicConfig(
        'demo',
        env
      );
    } catch (error) {
      caught = error;
    }

    assert.ok(
      caught instanceof
        DemoPublicConfigurationError
    );

    /** @type {string} */
    const diagnostic =
      String(caught);

    for (
      const secret of
      secretValues
    ) {
      assert.equal(
        diagnostic.includes(secret),
        false
      );
    }
  }

  for (const badUrl of [
    'http://redis.example.test',
    'https://redis.example.test/',
    'https://REDIS.example.test',
    'https://redis.example.test/path'
  ]) {
    assert.throws(
      () =>
        resolveDemoPublicConfig(
          'demo',
          environment({
            ATELIER_DEMO_STATE_REDIS_REST_URL:
              badUrl
          })
        ),
      DemoPublicConfigurationError
    );
  }
});
