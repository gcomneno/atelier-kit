import assert from 'node:assert/strict';
import test from 'node:test';
import {
  createHostedPrivatePocDashboardData
} from './hosted-private-poc-dashboard.js';
import {
  HOSTED_PRIVATE_POC_AUTH_RESULTS,
  createHostedPrivatePocRuntime
} from './hosted-private-poc-runtime.js';
import {
  HOSTED_ROUTE_GATE_OUTCOMES
} from './hosted-route-gate.js';

const OAUTH_STATE =
  Buffer.alloc(32, 101).toString('base64url');
const PKCE =
  Buffer.alloc(32, 102).toString('base64url');
const SESSION_ID =
  Buffer.alloc(32, 103).toString('base64url');
const CSRF =
  Buffer.alloc(32, 104).toString('base64url');

/**
 * @param {string[]} values
 */
function sequence(values) {
  let index = 0;
  return () => values[index++];
}

async function trustedContext() {
  const runtime =
    createHostedPrivatePocRuntime(
      'hosted',
      {
        ATELIER_STUDIO_MODE: 'hosted',
        ATELIER_STUDIO_PRIVATE_POC: '1',
        ATELIER_STUDIO_PRIVATE_POC_STATE_TOPOLOGY:
          'single-process',
        ATELIER_STUDIO_CANONICAL_ORIGIN:
          'https://studio.example.com',
        ATELIER_STUDIO_GITHUB_CLIENT_ID:
          'client-id',
        ATELIER_STUDIO_GITHUB_CLIENT_SECRET:
          'CLIENT_SECRET_DASHBOARD_SENTINEL',
        ATELIER_STUDIO_GITHUB_CALLBACK_URL:
          'https://studio.example.com/auth/github/callback',
        ATELIER_STUDIO_AUTHORIZED_GITHUB_IDS:
          '123'
      },
      {
        clock: () => 150_000,
        oauthSecretGenerator:
          sequence([OAUTH_STATE, PKCE]),
        sessionIdGenerator:
          () => SESSION_ID,
        csrfTokenGenerator:
          () => CSRF,
        transport: {
          async exchangeAuthorizationCode() {
            return 'ACCESS_TOKEN_DASHBOARD_SENTINEL';
          },
          async fetchAuthenticatedUser() {
            return {
              id: 123,
              login: 'operator'
            };
          }
        }
      }
    );

  assert.ok(runtime);

  runtime.beginAuthentication('/studio');

  const completed =
    await runtime.completeAuthentication({
      state: OAUTH_STATE,
      code: 'oauth-code'
    });

  assert.equal(
    completed.result,
    HOSTED_PRIVATE_POC_AUTH_RESULTS.AUTHORIZED
  );

  const decision =
    runtime.evaluateRequest(
      'hosted',
      completed.sessionId
    );

  assert.equal(
    decision.outcome,
    HOSTED_ROUTE_GATE_OUTCOMES.ALLOWED
  );

  return decision.context;
}

test('Local or forged contexts expose no Hosted dashboard capability', () => {
  for (const value of [
    undefined,
    null,
    {},
    {
      runtime: 'hosted',
      csrfToken: CSRF
    }
  ]) {
    assert.equal(
      createHostedPrivatePocDashboardData(
        value
      ),
      null
    );
  }
});

test('trusted Hosted dashboard data deliberately exposes only logout CSRF', async () => {
  const data =
    createHostedPrivatePocDashboardData(
      await trustedContext()
    );

  assert.ok(data);

  assert.deepEqual(
    Object.keys(data),
    ['logoutCsrfToken']
  );
  assert.equal(
    data.logoutCsrfToken,
    CSRF
  );
  assert.equal(Object.isFrozen(data), true);

  const serialized = JSON.stringify(data);

  for (const forbidden of [
    SESSION_ID,
    OAUTH_STATE,
    PKCE,
    'github',
    '123',
    'operator',
    'CLIENT_SECRET_DASHBOARD_SENTINEL',
    'ACCESS_TOKEN_DASHBOARD_SENTINEL',
    'repository',
    'authorization'
  ]) {
    assert.equal(
      serialized.includes(forbidden),
      false
    );
  }
});
