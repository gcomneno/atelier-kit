import assert from 'node:assert/strict';
import test from 'node:test';
import {
  HOSTED_SECURITY_EVENT_REASONS,
  HOSTED_SECURITY_EVENT_TYPES,
  HostedSecurityEventConfigurationError,
  HostedSecurityEventRecorder,
  NOOP_HOSTED_SECURITY_EVENT_RECORDER,
  serializeHostedSecurityEvent
} from './hosted-security-events.js';

const SECRET_SENTINELS = Object.freeze([
  'CLIENT_SECRET_DO_NOT_LOG',
  'ACCESS_TOKEN_DO_NOT_LOG',
  'AUTH_CODE_DO_NOT_LOG',
  'OAUTH_STATE_DO_NOT_LOG',
  'PKCE_VERIFIER_DO_NOT_LOG',
  'RAW_PROVIDER_BODY_DO_NOT_LOG',
  'SESSION_COOKIE_DO_NOT_LOG',
  'SESSION_IDENTIFIER_DO_NOT_LOG',
  'CSRF_TOKEN_DO_NOT_LOG',
  'AUTHORIZATION_HEADER_DO_NOT_LOG',
  'REPOSITORY_CREDENTIAL_DO_NOT_LOG',
  'ENVIRONMENT_SECRET_DO_NOT_LOG'
]);

function captureRecorder(clock = () => 123456) {
  /** @type {any[]} */
  const events = [];

  return {
    events,
    recorder: new HostedSecurityEventRecorder({
      clock,
      sink(event) {
        events.push(event);
      }
    })
  };
}

test('accepts only the finite Hosted security event taxonomy', () => {
  const { recorder, events } = captureRecorder();

  for (
    const type of Object.values(HOSTED_SECURITY_EVENT_TYPES)
  ) {
    assert.equal(recorder.record(type), true);
  }

  assert.equal(events.length, 8);

  for (const type of [
    undefined,
    null,
    '',
    'login-success',
    'custom-security-event',
    SECRET_SENTINELS[0],
    {},
    []
  ]) {
    assert.equal(recorder.record(type), false);
  }

  assert.equal(events.length, 8);
});

test('normalizes immutable allow-listed records with server time', () => {
  const { recorder, events } = captureRecorder(
    () => 987654321
  );

  assert.equal(
    recorder.record(
      HOSTED_SECURITY_EVENT_TYPES.OAUTH_STATE_REJECTED,
      HOSTED_SECURITY_EVENT_REASONS.OAUTH_STATE_EXPIRED
    ),
    true
  );

  assert.equal(events.length, 1);

  const [event] = events;

  assert.deepEqual(event, {
    version: 1,
    type: 'oauth-state-rejected',
    occurredAt: 987654321,
    reason: 'oauth-state-expired'
  });

  assert.equal(Object.isFrozen(event), true);
  assert.deepEqual(
    Object.keys(event),
    ['version', 'type', 'occurredAt', 'reason']
  );

  assert.throws(() => {
    event.type = 'tampered';
  }, TypeError);
});

test('reason codes are finite and valid only for their event type', () => {
  const { recorder, events } = captureRecorder();

  assert.equal(
    recorder.record(
      HOSTED_SECURITY_EVENT_TYPES.OAUTH_STATE_REJECTED,
      HOSTED_SECURITY_EVENT_REASONS.OAUTH_STATE_MALFORMED
    ),
    true
  );

  assert.equal(
    recorder.record(
      HOSTED_SECURITY_EVENT_TYPES.AUTHENTICATION_FAILED,
      HOSTED_SECURITY_EVENT_REASONS.OAUTH_PROVIDER_FAILED
    ),
    true
  );

  assert.equal(
    recorder.record(
      HOSTED_SECURITY_EVENT_TYPES.SESSION_REJECTED,
      HOSTED_SECURITY_EVENT_REASONS.SESSION_INVALID
    ),
    true
  );

  const beforeInvalid = events.length;

  for (const [type, reason] of [
    [
      HOSTED_SECURITY_EVENT_TYPES.HOST_REJECTED,
      'evil.example.com'
    ],
    [
      HOSTED_SECURITY_EVENT_TYPES.CSRF_REJECTED,
      SECRET_SENTINELS[8]
    ],
    [
      HOSTED_SECURITY_EVENT_TYPES.OAUTH_STATE_REJECTED,
      SECRET_SENTINELS[3]
    ],
    [
      HOSTED_SECURITY_EVENT_TYPES.AUTHENTICATION_FAILED,
      HOSTED_SECURITY_EVENT_REASONS.OAUTH_STATE_EXPIRED
    ],
    [
      HOSTED_SECURITY_EVENT_TYPES.SESSION_REJECTED,
      {}
    ]
  ]) {
    assert.equal(recorder.record(type, reason), false);
  }

  assert.equal(events.length, beforeInvalid);
});

test('event API admits no arbitrary message details context or source objects', () => {
  const { recorder, events } = captureRecorder();

  const attackerControlled = {
    message: SECRET_SENTINELS[0],
    details: {
      authorization: SECRET_SENTINELS[9]
    },
    headers: {
      authorization: SECRET_SENTINELS[9],
      cookie: SECRET_SENTINELS[6]
    },
    providerResponse: SECRET_SENTINELS[5],
    environment: {
      SECRET: SECRET_SENTINELS[11]
    }
  };

  assert.equal(
    recorder.record(
      HOSTED_SECURITY_EVENT_TYPES.AUTHENTICATION_FAILED,
      attackerControlled
    ),
    false
  );

  assert.deepEqual(events, []);
});

test('trusted event serialization contains only normalized fields', () => {
  const { recorder, events } = captureRecorder();

  assert.equal(
    recorder.record(
      HOSTED_SECURITY_EVENT_TYPES.AUTHENTICATION_FAILED,
      HOSTED_SECURITY_EVENT_REASONS.OAUTH_CALLBACK_REJECTED
    ),
    true
  );

  const serialized =
    serializeHostedSecurityEvent(events[0]);

  assert.equal(
    serialized,
    '{"version":1,"type":"authentication-failed","occurredAt":123456,"reason":"oauth-callback-rejected"}'
  );

  for (const secret of SECRET_SENTINELS) {
    assert.equal(serialized.includes(secret), false);
  }
});

test('serializer refuses caller-forged event objects', () => {
  assert.throws(
    () => serializeHostedSecurityEvent({
      version: 1,
      type: 'authentication-failed',
      occurredAt: 123456,
      message: SECRET_SENTINELS[0]
    }),
    HostedSecurityEventConfigurationError
  );
});

test('clock failures are contained and never reach the sink', () => {
  for (const clock of [
    () => {
      throw new Error(SECRET_SENTINELS[11]);
    },
    () => -1,
    () => Number.NaN,
    () => 1.5,
    () => Number.MAX_VALUE
  ]) {
    const { recorder, events } = captureRecorder(clock);

    assert.equal(
      recorder.record(
        HOSTED_SECURITY_EVENT_TYPES.SESSION_REJECTED
      ),
      false
    );

    assert.deepEqual(events, []);
  }
});

test('sink failures are contained without rethrowing secret-bearing errors', () => {
  const recorder = new HostedSecurityEventRecorder({
    clock: () => 123456,
    sink() {
      throw new Error(
        `sink failure ${SECRET_SENTINELS.join(' ')}`
      );
    }
  });

  assert.doesNotThrow(() => {
    assert.equal(
      recorder.record(
        HOSTED_SECURITY_EVENT_TYPES.CSRF_REJECTED
      ),
      false
    );
  });
});

test('constructor validates only recorder dependencies', () => {
  assert.throws(
    () => new HostedSecurityEventRecorder({
      clock: /** @type {any} */ (null)
    }),
    HostedSecurityEventConfigurationError
  );

  assert.throws(
    () => new HostedSecurityEventRecorder({
      sink: /** @type {any} */ ({})
    }),
    HostedSecurityEventConfigurationError
  );
});

test('no-op recorder is safe for components without operational logging', () => {
  assert.equal(
    NOOP_HOSTED_SECURITY_EVENT_RECORDER.record(
      HOSTED_SECURITY_EVENT_TYPES.AUTHORIZATION_REJECTED
    ),
    false
  );

  assert.equal(
    Object.isFrozen(
      NOOP_HOSTED_SECURITY_EVENT_RECORDER
    ),
    true
  );
});
