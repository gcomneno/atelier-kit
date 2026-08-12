import assert from 'node:assert/strict';
import test from 'node:test';
import {
  DemoOriginConfigurationError,
  parseDemoOriginConfig
} from './demo-origin.js';

test('Demo canonical origin is exact HTTPS deployment configuration', () => {
  assert.deepEqual(
    parseDemoOriginConfig({
      ATELIER_DEMO_CANONICAL_ORIGIN:
        'https://demo.example.com'
    }),
    {
      origin: 'https://demo.example.com',
      host: 'demo.example.com'
    }
  );
});

test('Demo origin rejects absent malformed or non-canonical values', () => {
  for (const environment of [
    undefined,
    null,
    {},
    {
      ATELIER_DEMO_CANONICAL_ORIGIN:
        'http://demo.example.com'
    },
    {
      ATELIER_DEMO_CANONICAL_ORIGIN:
        'https://demo.example.com/'
    },
    {
      ATELIER_DEMO_CANONICAL_ORIGIN:
        'https://DEMO.example.com'
    },
    {
      ATELIER_DEMO_CANONICAL_ORIGIN:
        'https://demo.example.com:443'
    },
    {
      ATELIER_DEMO_CANONICAL_ORIGIN:
        'https://demo.example.com/path'
    },
    {
      ATELIER_DEMO_CANONICAL_ORIGIN:
        'https://*.example.com'
    }
  ]) {
    assert.throws(
      () => parseDemoOriginConfig(environment),
      DemoOriginConfigurationError
    );
  }
});
