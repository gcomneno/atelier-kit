import assert from 'node:assert/strict';
import test from 'node:test';
import {
  AuthorizedHostedIdentity,
  authorizeHostedIdentity,
  HostedAuthorizationConfigurationError,
  parseHostedAuthorizationConfig
} from './hosted-authorization.js';

/**
 * @param {string} subject
 * @param {string} [login]
 * @returns {{
 *   provider: 'github',
 *   subject: string,
 *   login: string
 * }}
 */
function githubIdentity(subject, login = 'operator') {
  return {
    provider: 'github',
    subject,
    login
  };
}

test('parses, trims and deduplicates canonical GitHub subject allow-list', () => {
  const config = parseHostedAuthorizationConfig({
    ATELIER_STUDIO_AUTHORIZED_GITHUB_IDS: '123, 456,123',
    ATELIER_STUDIO_BOOTSTRAP_GITHUB_LOGIN: ' operator '
  });

  assert.deepEqual(config.allowedGitHubSubjects, ['123', '456']);
  assert.equal(config.bootstrapGitHubLogin, 'operator');
  assert.equal(Object.isFrozen(config), true);
  assert.equal(Object.isFrozen(config.allowedGitHubSubjects), true);
});

test('invalid configuration containers fail closed with configuration error', () => {
  for (const environment of [
    undefined,
    null,
    [],
    'ATELIER_STUDIO_AUTHORIZED_GITHUB_IDS=123'
  ]) {
    assert.throws(
      () => parseHostedAuthorizationConfig(environment),
      HostedAuthorizationConfigurationError
    );
  }
});

test('missing, empty or malformed allow-list configuration fails closed', () => {
  for (const value of [
    undefined,
    '',
    '   ',
    '0',
    '01',
    '123,,456',
    '123,invalid'
  ]) {
    assert.throws(
      () => parseHostedAuthorizationConfig({
        ATELIER_STUDIO_AUTHORIZED_GITHUB_IDS: value
      }),
      HostedAuthorizationConfigurationError
    );
  }
});

test('exact stable GitHub subject match produces authorized identity', () => {
  const config = parseHostedAuthorizationConfig({
    ATELIER_STUDIO_AUTHORIZED_GITHUB_IDS: '123'
  });

  const result = authorizeHostedIdentity(
    githubIdentity('123'),
    config
  );

  assert.ok(result instanceof AuthorizedHostedIdentity);
  assert.deepEqual(result.identity, githubIdentity('123'));
});

test('non-allow-listed stable subject is denied', () => {
  const config = parseHostedAuthorizationConfig({
    ATELIER_STUDIO_AUTHORIZED_GITHUB_IDS: '123'
  });

  assert.equal(
    authorizeHostedIdentity(githubIdentity('456'), config),
    null
  );
});

test('GitHub login never grants authority by itself', () => {
  const config = parseHostedAuthorizationConfig({
    ATELIER_STUDIO_AUTHORIZED_GITHUB_IDS: '123',
    ATELIER_STUDIO_BOOTSTRAP_GITHUB_LOGIN: 'operator'
  });

  assert.equal(
    authorizeHostedIdentity(
      githubIdentity('456', 'operator'),
      config
    ),
    null
  );
});

test('login and display metadata do not affect an allowed subject decision', () => {
  const config = parseHostedAuthorizationConfig({
    ATELIER_STUDIO_AUTHORIZED_GITHUB_IDS: '123'
  });

  const first = authorizeHostedIdentity(
    {
      provider: 'github',
      subject: '123',
      login: 'first',
      displayName: 'First Operator'
    },
    config
  );

  const second = authorizeHostedIdentity(
    {
      provider: 'github',
      subject: '123',
      login: 'second',
      displayName: 'Completely Different Name'
    },
    config
  );

  assert.ok(first instanceof AuthorizedHostedIdentity);
  assert.ok(second instanceof AuthorizedHostedIdentity);
  assert.equal(first.identity.subject, second.identity.subject);
});

test('unsupported or malformed identities deny without granting authority', () => {
  const config = parseHostedAuthorizationConfig({
    ATELIER_STUDIO_AUTHORIZED_GITHUB_IDS: '123'
  });

  for (const identity of [
    {
      provider: 'gitlab',
      subject: '123',
      login: 'operator'
    },
    {
      provider: 'github',
      subject: '01',
      login: 'operator'
    },
    {
      provider: 'github',
      login: 'operator'
    },
    null
  ]) {
    assert.equal(
      authorizeHostedIdentity(identity, config),
      null
    );
  }
});

test('bootstrap login is metadata and is not consulted by authorization', () => {
  const first = parseHostedAuthorizationConfig({
    ATELIER_STUDIO_AUTHORIZED_GITHUB_IDS: '123',
    ATELIER_STUDIO_BOOTSTRAP_GITHUB_LOGIN: 'first-login'
  });

  const second = parseHostedAuthorizationConfig({
    ATELIER_STUDIO_AUTHORIZED_GITHUB_IDS: '123',
    ATELIER_STUDIO_BOOTSTRAP_GITHUB_LOGIN: 'second-login'
  });

  const identity = githubIdentity('123', 'unrelated-login');

  assert.ok(
    authorizeHostedIdentity(identity, first) instanceof AuthorizedHostedIdentity
  );
  assert.ok(
    authorizeHostedIdentity(identity, second) instanceof AuthorizedHostedIdentity
  );
});

test('invalid policy configuration is distinct from ordinary denial', () => {
  assert.throws(
    () => authorizeHostedIdentity(
      githubIdentity('123'),
      { allowedGitHubSubjects: [] }
    ),
    HostedAuthorizationConfigurationError
  );
});

test('configuration diagnostics do not echo identifiers or unrelated secrets', () => {
  const identifier = '00123456789';
  const secret = 'ghp_super_secret_value';

  assert.throws(
    () => parseHostedAuthorizationConfig({
      ATELIER_STUDIO_AUTHORIZED_GITHUB_IDS: identifier,
      ATELIER_STUDIO_GITHUB_TOKEN: secret
    }),
    (error) => {
      assert.ok(error instanceof HostedAuthorizationConfigurationError);
      assert.equal(error.message.includes(identifier), false);
      assert.equal(error.message.includes(secret), false);
      return true;
    }
  );
});

test('unknown identity fields cannot smuggle authorization-relevant state', () => {
  const config = parseHostedAuthorizationConfig({
    ATELIER_STUDIO_AUTHORIZED_GITHUB_IDS: '123'
  });

  assert.equal(
    authorizeHostedIdentity(
      {
        provider: 'github',
        subject: '123',
        login: 'operator',
        authorized: true
      },
      config
    ),
    null
  );
});
