import assert from 'node:assert/strict';
import test from 'node:test';
import {
  HostedOriginConfigurationError,
  parseHostedOriginConfig
} from './hosted-origin.js';

test('parses exact canonical HTTPS origin and derives host', () => {
  assert.deepEqual(
    parseHostedOriginConfig({
      ATELIER_STUDIO_CANONICAL_ORIGIN:
        'https://studio.example.com'
    }),
    {
      origin: 'https://studio.example.com',
      host: 'studio.example.com'
    }
  );
});

test('preserves an explicit non-default HTTPS port', () => {
  assert.deepEqual(
    parseHostedOriginConfig({
      ATELIER_STUDIO_CANONICAL_ORIGIN:
        'https://studio.example.com:8443'
    }),
    {
      origin: 'https://studio.example.com:8443',
      host: 'studio.example.com:8443'
    }
  );
});

test('configuration result is immutable', () => {
  const config = parseHostedOriginConfig({
    ATELIER_STUDIO_CANONICAL_ORIGIN:
      'https://studio.example.com'
  });

  assert.equal(Object.isFrozen(config), true);
});

test('missing and invalid configuration fail closed', () => {
  for (const environment of [
    null,
    undefined,
    [],
    {},
    {
      ATELIER_STUDIO_CANONICAL_ORIGIN: null
    },
    {
      ATELIER_STUDIO_CANONICAL_ORIGIN: ''
    }
  ]) {
    assert.throws(
      () => parseHostedOriginConfig(environment),
      HostedOriginConfigurationError
    );
  }
});

test('rejects non-HTTPS and non-origin URL forms', () => {
  for (const value of [
    'http://studio.example.com',
    'ftp://studio.example.com',
    '//studio.example.com',
    'studio.example.com',
    'https://user@studio.example.com',
    'https://user:password@studio.example.com',
    'https://studio.example.com/path',
    'https://studio.example.com/?query=1',
    'https://studio.example.com/#fragment'
  ]) {
    assert.throws(
      () => parseHostedOriginConfig({
        ATELIER_STUDIO_CANONICAL_ORIGIN: value
      }),
      HostedOriginConfigurationError
    );
  }
});

test('rejects URL spellings that require normalization', () => {
  for (const value of [
    'https://STUDIO.EXAMPLE.COM',
    'https://studio.example.com/',
    'https://studio.example.com:443',
    ' https://studio.example.com',
    'https://studio.example.com ',
    'https://studio.example.com\n'
  ]) {
    assert.throws(
      () => parseHostedOriginConfig({
        ATELIER_STUDIO_CANONICAL_ORIGIN: value
      }),
      HostedOriginConfigurationError
    );
  }
});

test('does not grant wildcard or implicit subdomain authority', () => {
  for (const value of [
    'https://*.example.com',
    'https://example.com/*'
  ]) {
    assert.throws(
      () => parseHostedOriginConfig({
        ATELIER_STUDIO_CANONICAL_ORIGIN: value
      }),
      HostedOriginConfigurationError
    );
  }

  const config = parseHostedOriginConfig({
    ATELIER_STUDIO_CANONICAL_ORIGIN:
      'https://studio.example.com'
  });

  assert.notEqual(
    config.host,
    'admin.studio.example.com'
  );
});

test('diagnostics do not echo configured values or environment contents', () => {
  const secretLikeOrigin =
    'https://operator:secret@studio.example.com/private';

  assert.throws(
    () => parseHostedOriginConfig({
      ATELIER_STUDIO_CANONICAL_ORIGIN:
        secretLikeOrigin,
      PROVIDER_SECRET: 'provider-secret',
      REPOSITORY_TOKEN: 'repository-secret'
    }),
    (error) => {
      assert.ok(
        error instanceof HostedOriginConfigurationError
      );

      for (const secret of [
        secretLikeOrigin,
        'secret',
        'provider-secret',
        'repository-secret'
      ]) {
        assert.equal(
          error.message.includes(secret),
          false
        );
      }

      return true;
    }
  );
});
