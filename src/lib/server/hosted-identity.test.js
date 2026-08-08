import assert from 'node:assert/strict';
import test from 'node:test';
import {
  canonicalGitHubSubject,
  createAuthenticatedIdentity,
  HostedIdentityValidationError
} from './hosted-identity.js';

test('constructs a canonical immutable GitHub authenticated identity', () => {
  const identity = createAuthenticatedIdentity({
    provider: 'github',
    subject: '126195429',
    login: 'operator',
    displayName: 'Operator',
    avatarUrl: 'https://avatars.example/operator.png'
  });

  assert.deepEqual(identity, {
    provider: 'github',
    subject: '126195429',
    login: 'operator',
    displayName: 'Operator',
    avatarUrl: 'https://avatars.example/operator.png'
  });
  assert.equal(Object.isFrozen(identity), true);
});

test('accepts only canonical positive decimal GitHub subjects', () => {
  assert.equal(canonicalGitHubSubject('1'), '1');
  assert.equal(canonicalGitHubSubject('126195429'), '126195429');
  assert.equal(
    canonicalGitHubSubject('999999999999999999999999999999999999999'),
    '999999999999999999999999999999999999999'
  );

  for (const candidate of [
    '',
    '0',
    '00',
    '01',
    '+1',
    '-1',
    '1.0',
    '1e3',
    ' 1',
    '1 ',
    1,
    126195429n,
    null,
    undefined
  ]) {
    assert.throws(
      () => canonicalGitHubSubject(candidate),
      HostedIdentityValidationError
    );
  }
});

test('rejects unsupported providers and malformed identity fields', () => {
  assert.throws(
    () => createAuthenticatedIdentity({
      provider: 'gitlab',
      subject: '123',
      login: 'operator'
    }),
    HostedIdentityValidationError
  );

  assert.throws(
    () => createAuthenticatedIdentity({
      provider: 'github',
      subject: '123',
      login: ''
    }),
    HostedIdentityValidationError
  );

  assert.throws(
    () => createAuthenticatedIdentity({
      provider: 'github',
      subject: '123',
      login: ' operator'
    }),
    HostedIdentityValidationError
  );
});

test('rejects fields outside the canonical identity contract', () => {
  assert.throws(
    () => createAuthenticatedIdentity({
      provider: 'github',
      subject: '123',
      login: 'operator',
      email: 'operator@example.com'
    }),
    HostedIdentityValidationError
  );

  assert.throws(
    () => createAuthenticatedIdentity({
      provider: 'github',
      subject: '123',
      login: 'operator',
      accessToken: 'secret'
    }),
    HostedIdentityValidationError
  );
});

test('optional informational metadata does not become required identity state', () => {
  assert.deepEqual(
    createAuthenticatedIdentity({
      provider: 'github',
      subject: '123',
      login: 'operator'
    }),
    {
      provider: 'github',
      subject: '123',
      login: 'operator'
    }
  );
});
