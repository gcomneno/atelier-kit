import assert from 'node:assert/strict';
import test from 'node:test';
import {
  parseHostedAuthorizationConfig
} from './hosted-authorization.js';
import {
  HostedRouteGate
} from './hosted-route-gate.js';
import {
  canAccessStudioRoute
} from './studio-access-policy.js';

async function createTrustedContext() {
  const session = {
    sessionId: 'A'.repeat(43),
    identity: {
      provider: 'github',
      subject: '123'
    },
    authorization: 'authorized',
    csrfToken: Buffer.alloc(32, 9).toString('base64url'),
    createdAt: 100,
    rotatedAt: 100,
    lastSeenAt: 120,
    expiresAt: 1000
  };

  const gate = new HostedRouteGate({
    sessionLifecycle: {
      resolve() {
        return {
          session,
          rotationDue: false
        };
      },
      touch() {
        return {
          session,
          rotationDue: false
        };
      },
      rotate() {
        throw new Error('rotation not expected');
      }
    },
    authorizationConfig: parseHostedAuthorizationConfig({
      ATELIER_STUDIO_AUTHORIZED_GITHUB_IDS: '123'
    })
  });

  const result = await gate.evaluate(
    'hosted',
    'opaque-session-credential'
  );

  assert.ok(result.context);

  return result.context;
}

const TRUSTED_CONTEXT = await createTrustedContext();

function trustedContext() {
  return TRUSTED_CONTEXT;
}

test('Local Studio remains admitted without Hosted context', () => {
  assert.equal(
    canAccessStudioRoute('local'),
    true
  );
});

test('visitor and invalid modes remain fail-closed', () => {
  const trusted = trustedContext();

  for (const mode of ['visitor', 'invalid', 'unknown']) {
    assert.equal(
      canAccessStudioRoute(mode, trusted),
      false
    );
  }
});

test('Hosted Studio rejects absent and plain-object context', () => {
  assert.equal(
    canAccessStudioRoute('hosted'),
    false
  );

  assert.equal(
    canAccessStudioRoute('hosted', {
      runtime: 'hosted',
      identity: {
        provider: 'github',
        subject: '123'
      }
    }),
    false
  );
});

test('legacy hostedAuthorized boolean cannot open Hosted Studio', () => {
  assert.equal(
    canAccessStudioRoute(
      'hosted',
      { hostedAuthorized: true }
    ),
    false
  );
});

test('Hosted Studio accepts only genuinely gate-issued context', () => {
  assert.equal(
    canAccessStudioRoute('hosted', trustedContext()),
    true
  );
});
