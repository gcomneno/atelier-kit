import assert from 'node:assert/strict';
import test from 'node:test';
import {
  parseHostedAuthorizationConfig
} from './hosted-authorization.js';
import {
  getTrustedHostedRequestCsrfToken,
  HostedRequestContextTrustError,
  isTrustedHostedRequestContext,
  requireTrustedHostedRequestContext
} from './hosted-request-context.js';
import {
  HOSTED_ROUTE_GATE_OUTCOMES,
  HostedRouteGate
} from './hosted-route-gate.js';

const CSRF_TOKEN =
  Buffer.alloc(32, 9).toString('base64url');

async function createGenuineContext() {
  const session = {
    sessionId: 'A'.repeat(43),
    identity: {
      provider: 'github',
      subject: '123'
    },
    authorization: 'authorized',
    csrfToken: CSRF_TOKEN,
    createdAt: 100,
    rotatedAt: 120,
    lastSeenAt: 140,
    expiresAt: 1000
  };

  const lifecycle = {
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
  };

  const gate = new HostedRouteGate({
    sessionLifecycle: lifecycle,
    authorizationConfig: parseHostedAuthorizationConfig({
      ATELIER_STUDIO_AUTHORIZED_GITHUB_IDS: '123'
    })
  });

  const result = await gate.evaluate(
    'hosted',
    'opaque-session-credential'
  );

  assert.equal(result.outcome, HOSTED_ROUTE_GATE_OUTCOMES.ALLOWED);
  assert.ok(result.context);

  return result.context;
}

const GENUINE_CONTEXT = await createGenuineContext();

function genuineContext() {
  return GENUINE_CONTEXT;
}

test('gate issues minimal immutable trusted Hosted request context', () => {
  const context = genuineContext();

  assert.equal(isTrustedHostedRequestContext(context), true);
  assert.equal(requireTrustedHostedRequestContext(context), context);

  assert.deepEqual(context, {
    runtime: 'hosted',
    identity: {
      provider: 'github',
      subject: '123'
    },
    session: {
      createdAt: 100,
      rotatedAt: 120,
      expiresAt: 1000,
      lastSeenAt: 140
    }
  });

  assert.equal(Object.isFrozen(context), true);
  assert.equal(Object.isFrozen(context.identity), true);
  assert.equal(Object.isFrozen(context.session), true);
  assert.equal('sessionId' in context.session, false);
  assert.equal('csrfToken' in context, false);
  assert.equal('csrfToken' in context.session, false);
  assert.equal(
    JSON.stringify(context).includes(CSRF_TOKEN),
    false
  );
  assert.equal(
    getTrustedHostedRequestCsrfToken(context),
    CSRF_TOKEN
  );
});

test('trusted context cannot be forged by shape or prototype', () => {
  const trusted = genuineContext();

  const byShape = structuredClone(trusted);
  const byPrototype = Object.create(Object.getPrototypeOf(trusted));

  Object.assign(byPrototype, structuredClone(trusted));

  assert.equal(isTrustedHostedRequestContext(byShape), false);
  assert.equal(isTrustedHostedRequestContext(byPrototype), false);

  assert.throws(
    () => requireTrustedHostedRequestContext(byShape),
    HostedRequestContextTrustError
  );

  assert.throws(
    () => getTrustedHostedRequestCsrfToken(byShape),
    HostedRequestContextTrustError
  );

  assert.throws(
    () => getTrustedHostedRequestCsrfToken(byPrototype),
    HostedRequestContextTrustError
  );
});

test('trusted context module exposes no direct issuance primitive', async () => {
  const api = await import('./hosted-request-context.js');

  assert.equal(
    Object.prototype.hasOwnProperty.call(
      api,
      'issueTrustedHostedRequestContext'
    ),
    false
  );
});
