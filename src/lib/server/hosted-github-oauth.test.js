import assert from 'node:assert/strict';
import test from 'node:test';
import {
  DEFAULT_HOSTED_OAUTH_TRANSACTION_LIFETIME_MS,
  derivePkceS256Challenge,
  GitHubOAuthTransport,
  HostedGitHubOAuthAuthenticationError,
  HostedGitHubOAuthConfigurationError,
  HostedGitHubOAuthProvider,
  HostedGitHubOAuthProviderError,
  isCanonicalHostedOAuthSecret,
  normalizeHostedOAuthReturnTo,
  parseHostedGitHubOAuthConfig
} from './hosted-github-oauth.js';
import {
  InMemoryHostedOAuthTransactionStore
} from './hosted-oauth-transaction-store.js';
import {
  HOSTED_SECURITY_EVENT_REASONS,
  HOSTED_SECURITY_EVENT_TYPES,
  HostedSecurityEventRecorder,
  serializeHostedSecurityEvent
} from './hosted-security-events.js';

const MINUTE = 60 * 1000;

/**
 * @typedef {{
 *   url: string,
 *   options: {
 *     method: 'GET' | 'POST',
 *     headers: Record<string, string>,
 *     body?: string
 *   }
 * }} RecordedFetchCall
 */

/**
 * @param {number} byte
 */
function fixedSecret(byte) {
  return Buffer.alloc(32, byte).toString('base64url');
}

function oauthConfig() {
  return parseHostedGitHubOAuthConfig({
    ATELIER_STUDIO_GITHUB_CLIENT_ID:
      'Iv1.0123456789abcdef',
    ATELIER_STUDIO_GITHUB_CLIENT_SECRET:
      'client-secret-value',
    ATELIER_STUDIO_GITHUB_CALLBACK_URL:
      'https://studio.example.com/auth/github/callback'
  });
}

function githubUser(overrides = {}) {
  return {
    id: 123456789,
    login: 'operator',
    name: 'Operator Name',
    avatar_url: 'https://avatars.example/operator.png',
    email: 'ignored@example.com',
    future_field: 'ignored',
    ...overrides
  };
}

/**
 * @param {{
 *   now?: number,
 *   secrets?: string[],
 *   transactionStore?: InMemoryHostedOAuthTransactionStore,
 *   transport?: any,
 *   transactionLifetimeMs?: number,
 *   securityEventRecorder?: any
 * }} [options]
 */
function fixture({
  now = 1_000_000,
  secrets = [
    fixedSecret(1),
    fixedSecret(2),
    fixedSecret(3),
    fixedSecret(4)
  ],
  transactionStore =
    new InMemoryHostedOAuthTransactionStore(),
  transport = {
    exchangeAuthorizationCode: async () =>
      'provider-access-token',
    fetchAuthenticatedUser: async () =>
      githubUser()
  },
  transactionLifetimeMs =
    DEFAULT_HOSTED_OAUTH_TRANSACTION_LIFETIME_MS,
  securityEventRecorder
} = {}) {
  let currentTime = now;
  let secretIndex = 0;

  const provider = new HostedGitHubOAuthProvider({
    config: oauthConfig(),
    transactionStore,
    transport,
    clock: () => currentTime,
    secretGenerator: () =>
      secrets[secretIndex++] ?? secrets.at(-1),
    transactionLifetimeMs,
    ...(securityEventRecorder === undefined
      ? {}
      : { securityEventRecorder })
  });

  return {
    provider,
    transactionStore,
    /**
     * @param {number} value
     */
    setNow(value) {
      currentTime = value;
    }
  };
}

test('OAuth configuration is explicit, server-side and fail-closed', () => {
  const config = oauthConfig();

  assert.deepEqual(config, {
    clientId: 'Iv1.0123456789abcdef',
    clientSecret: 'client-secret-value',
    callbackUrl:
      'https://studio.example.com/auth/github/callback'
  });
  assert.equal(Object.isFrozen(config), true);

  for (const environment of [
    undefined,
    null,
    [],
    'invalid',
    {},
    {
      ATELIER_STUDIO_GITHUB_CLIENT_ID: 'id',
      ATELIER_STUDIO_GITHUB_CLIENT_SECRET: 'secret',
      ATELIER_STUDIO_GITHUB_CALLBACK_URL:
        'http://studio.example.com/auth/github/callback'
    },
    {
      ATELIER_STUDIO_GITHUB_CLIENT_ID: 'id',
      ATELIER_STUDIO_GITHUB_CLIENT_SECRET: 'secret',
      ATELIER_STUDIO_GITHUB_CALLBACK_URL:
        'https://studio.example.com/wrong'
    },
    {
      ATELIER_STUDIO_GITHUB_CLIENT_ID: 'id',
      ATELIER_STUDIO_GITHUB_CLIENT_SECRET: 'secret',
      ATELIER_STUDIO_GITHUB_CALLBACK_URL:
        'https://user:pass@studio.example.com/auth/github/callback'
    },
    {
      ATELIER_STUDIO_GITHUB_CLIENT_ID: 'id',
      ATELIER_STUDIO_GITHUB_CLIENT_SECRET: 'secret',
      ATELIER_STUDIO_GITHUB_CALLBACK_URL:
        'https://studio.example.com/auth/github/callback?x=1'
    }
  ]) {
    assert.throws(
      () => parseHostedGitHubOAuthConfig(environment),
      HostedGitHubOAuthConfigurationError
    );
  }
});

test('provider constructor revalidates configuration and fails closed', () => {
  const store =
    new InMemoryHostedOAuthTransactionStore();

  assert.throws(
    () => new HostedGitHubOAuthProvider(),
    HostedGitHubOAuthConfigurationError
  );

  assert.throws(
    () => new HostedGitHubOAuthProvider({
      config: {
        clientId: 'client-id',
        clientSecret: 'client-secret',
        callbackUrl:
          'http://attacker.example/auth/github/callback'
      },
      transactionStore: store
    }),
    HostedGitHubOAuthConfigurationError
  );
});

test('configuration diagnostics never echo client secrets', () => {
  const secret = 'super-sensitive-client-secret';

  assert.throws(
    () => parseHostedGitHubOAuthConfig({
      ATELIER_STUDIO_GITHUB_CLIENT_ID: 'id',
      ATELIER_STUDIO_GITHUB_CLIENT_SECRET:
        ` ${secret}`,
      ATELIER_STUDIO_GITHUB_CALLBACK_URL:
        'https://studio.example.com/auth/github/callback'
    }),
    (error) => {
      assert.ok(
        error instanceof
          HostedGitHubOAuthConfigurationError
      );
      assert.equal(error.message.includes(secret), false);
      return true;
    }
  );
});

test('return targets accept only canonical local Studio paths', () => {
  assert.equal(
    normalizeHostedOAuthReturnTo(undefined),
    '/studio'
  );
  assert.equal(
    normalizeHostedOAuthReturnTo('/studio'),
    '/studio'
  );
  assert.equal(
    normalizeHostedOAuthReturnTo(
      '/studio/items/example?tab=content'
    ),
    '/studio/items/example?tab=content'
  );

  for (const target of [
    'https://evil.example/studio',
    '//evil.example/studio',
    '/other',
    '/studio\\evil',
    '/studio#fragment',
    ' /studio',
    '/studio '
  ]) {
    assert.throws(
      () => normalizeHostedOAuthReturnTo(target),
      HostedGitHubOAuthAuthenticationError
    );
  }
});

test('PKCE uses canonical independent 256-bit secrets and S256', () => {
  const verifier =
    'dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk';
  const expected =
    'E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM';

  assert.equal(
    isCanonicalHostedOAuthSecret(verifier),
    true
  );

  assert.equal(
    derivePkceS256Challenge(verifier),
    expected
  );

  assert.throws(
    () => derivePkceS256Challenge('invalid'),
    HostedGitHubOAuthAuthenticationError
  );
});

test('begin creates one-time state and deterministic GitHub authorization URL', async () => {
  const state = fixedSecret(1);
  const verifier = fixedSecret(2);

  const {
    provider,
    transactionStore
  } = fixture({
    secrets: [state, verifier]
  });

  const result = await provider.begin(
    '/studio/items/example?tab=content'
  );

  const url = new URL(result.authorizationUrl);

  assert.equal(
    url.origin + url.pathname,
    'https://github.com/login/oauth/authorize'
  );
  assert.equal(
    url.searchParams.get('client_id'),
    'Iv1.0123456789abcdef'
  );
  assert.equal(
    url.searchParams.get('redirect_uri'),
    'https://studio.example.com/auth/github/callback'
  );
  assert.equal(url.searchParams.get('state'), state);
  assert.equal(
    url.searchParams.get('code_challenge'),
    derivePkceS256Challenge(verifier)
  );
  assert.equal(
    url.searchParams.get('code_challenge_method'),
    'S256'
  );

  const stored = await transactionStore.read(state);

  assert.ok(stored !== null);
  assert.equal(stored.pkceVerifier, verifier);
  assert.equal(
    stored.returnTo,
    '/studio/items/example?tab=content'
  );
  assert.equal(stored.createdAt, 1_000_000);
  assert.equal(
    stored.expiresAt,
    1_000_000 + 10 * MINUTE
  );
  assert.notEqual(stored.state, stored.pkceVerifier);
});

test('state collision never overwrites and retries with fresh independent secrets', async () => {
  const store =
    new InMemoryHostedOAuthTransactionStore();
  const collision = fixedSecret(1);

  await store.create({
    state: collision,
    pkceVerifier: fixedSecret(9),
    returnTo: '/studio/original',
    createdAt: 1,
    expiresAt: 2
  });

  const freshState = fixedSecret(3);
  const freshVerifier = fixedSecret(4);

  const { provider } = fixture({
    transactionStore: store,
    secrets: [
      collision,
      fixedSecret(2),
      freshState,
      freshVerifier
    ]
  });

  const result = await provider.begin('/studio/new');
  const url = new URL(result.authorizationUrl);

  assert.equal(
    url.searchParams.get('state'),
    freshState
  );

  const original = await store.read(collision);

  assert.ok(original !== null);
  assert.equal(original.returnTo, '/studio/original');
});

test('valid callback state is consumed before malformed code is considered', async () => {
  let tokenRequests = 0;

  const { provider, transactionStore } = fixture({
    transport: {
      exchangeAuthorizationCode: async () => {
        tokenRequests += 1;
        return 'token';
      },
      fetchAuthenticatedUser: async () =>
        githubUser()
    }
  });

  const started = await provider.begin('/studio');
  const state =
    new URL(started.authorizationUrl)
      .searchParams.get('state');

  assert.ok(state !== null);

  await assert.rejects(
    () => provider.complete({
      state,
      code: ''
    }),
    HostedGitHubOAuthAuthenticationError
  );

  assert.equal(tokenRequests, 0);
  assert.equal(await transactionStore.read(state), null);

  await assert.rejects(
    () => provider.complete({
      state,
      code: 'second-attempt'
    }),
    HostedGitHubOAuthAuthenticationError
  );
});

test('missing callback input fails with controlled authentication error', async () => {
  const { provider } = fixture();

  await assert.rejects(
    () => provider.complete(),
    HostedGitHubOAuthAuthenticationError
  );
});

test('unknown or malformed state prevents token exchange', async () => {
  let tokenRequests = 0;

  const { provider } = fixture({
    transport: {
      exchangeAuthorizationCode: async () => {
        tokenRequests += 1;
        return 'token';
      },
      fetchAuthenticatedUser: async () =>
        githubUser()
    }
  });

  await assert.rejects(
    () => provider.complete({
      state: 'invalid',
      code: 'code'
    }),
    HostedGitHubOAuthAuthenticationError
  );

  await assert.rejects(
    () => provider.complete({
      state: fixedSecret(99),
      code: 'code'
    }),
    HostedGitHubOAuthAuthenticationError
  );

  assert.equal(tokenRequests, 0);
});

test('provider error callback consumes valid state and never exchanges a token', async () => {
  let tokenRequests = 0;

  const { provider, transactionStore } = fixture({
    transport: {
      exchangeAuthorizationCode: async () => {
        tokenRequests += 1;
        return 'token';
      },
      fetchAuthenticatedUser: async () =>
        githubUser()
    }
  });

  const started = await provider.begin('/studio');
  const state =
    new URL(started.authorizationUrl)
      .searchParams.get('state');

  assert.ok(state !== null);

  await assert.rejects(
    () => provider.complete({
      state,
      error: 'access_denied'
    }),
    HostedGitHubOAuthAuthenticationError
  );

  assert.equal(tokenRequests, 0);
  assert.equal(await transactionStore.read(state), null);
});

test('expired state and clock rollback fail closed after one-time consumption', async () => {
  const start = 1_000_000;

  {
    const {
      provider,
      transactionStore,
      setNow
    } = fixture({ now: start });

    const started = await provider.begin('/studio');
    const state =
      new URL(started.authorizationUrl)
        .searchParams.get('state');

    assert.ok(state !== null);

    setNow(start + 10 * MINUTE);

    await assert.rejects(
      () => provider.complete({
        state,
        code: 'code'
      }),
      HostedGitHubOAuthAuthenticationError
    );

    assert.equal(await transactionStore.read(state), null);
  }

  {
    const {
      provider,
      transactionStore,
      setNow
    } = fixture({ now: start });

    const started = await provider.begin('/studio');
    const state =
      new URL(started.authorizationUrl)
        .searchParams.get('state');

    assert.ok(state !== null);

    setNow(start - 1);

    await assert.rejects(
      () => provider.complete({
        state,
        code: 'code'
      }),
      HostedGitHubOAuthAuthenticationError
    );

    assert.equal(await transactionStore.read(state), null);
  }
});

test('successful completion uses matching verifier and returns canonical identity only', async () => {
  /** @type {Array<Record<string, string>>} */
  const observations = [];

  const transport = {
    /**
     * @param {{
     *   code: string,
     *   codeVerifier: string
     * }} input
     */
    async exchangeAuthorizationCode(input) {
      observations.push({
        operation: 'exchange',
        code: input.code,
        verifier: input.codeVerifier
      });

      return 'provider-access-token';
    },

    /**
     * @param {string} accessToken
     */
    async fetchAuthenticatedUser(accessToken) {
      observations.push({
        operation: 'user',
        accessToken
      });

      return githubUser();
    }
  };

  const state = fixedSecret(1);
  const verifier = fixedSecret(2);

  const { provider } = fixture({
    secrets: [state, verifier],
    transport
  });

  await provider.begin('/studio/items');

  const result = await provider.complete({
    state,
    code: 'authorization-code'
  });

  assert.deepEqual(observations, [
    {
      operation: 'exchange',
      code: 'authorization-code',
      verifier
    },
    {
      operation: 'user',
      accessToken: 'provider-access-token'
    }
  ]);

  assert.deepEqual(result.identity, {
    provider: 'github',
    subject: '123456789',
    login: 'operator',
    displayName: 'Operator Name',
    avatarUrl:
      'https://avatars.example/operator.png'
  });
  assert.equal(result.returnTo, '/studio/items');

  assert.equal('email' in result.identity, false);
  assert.equal('accessToken' in result, false);
  assert.equal('refreshToken' in result, false);
  assert.equal('authorized' in result, false);
  assert.equal('session' in result, false);
});

test('nullable optional GitHub metadata becomes absent identity metadata', async () => {
  const { provider } = fixture({
    transport: {
      exchangeAuthorizationCode: async () =>
        'provider-access-token',
      fetchAuthenticatedUser: async () =>
        githubUser({
          name: null,
          avatar_url: null
        })
    }
  });

  const started = await provider.begin();
  const state =
    new URL(started.authorizationUrl)
      .searchParams.get('state');

  assert.ok(state !== null);

  const result = await provider.complete({
    state,
    code: 'authorization-code'
  });

  assert.deepEqual(result.identity, {
    provider: 'github',
    subject: '123456789',
    login: 'operator'
  });
});

test('malformed GitHub user identity fails closed', async () => {
  for (const malformedUser of [
    null,
    {},
    githubUser({ id: 0 }),
    githubUser({ id: -1 }),
    githubUser({
      id: Number.MAX_SAFE_INTEGER + 1
    }),
    githubUser({ login: null }),
    githubUser({ name: 123 }),
    githubUser({ avatar_url: 123 })
  ]) {
    const { provider } = fixture({
      transport: {
        exchangeAuthorizationCode: async () =>
          'provider-access-token',
        fetchAuthenticatedUser: async () =>
          malformedUser
      }
    });

    const started = await provider.begin();
    const state =
      new URL(started.authorizationUrl)
        .searchParams.get('state');

    assert.ok(state !== null);

    await assert.rejects(
      () => provider.complete({
        state,
        code: 'authorization-code'
      }),
      HostedGitHubOAuthAuthenticationError
    );
  }
});

test('transport posts only to fixed token endpoint with secret and PKCE verifier', async () => {
  /** @type {RecordedFetchCall[]} */
  const calls = [];

  const transport = new GitHubOAuthTransport({
    fetchImpl: async (url, options) => {
      calls.push({ url, options });

      return {
        ok: true,
        json: async () => ({
          access_token: 'provider-token',
          token_type: 'bearer'
        })
      };
    }
  });

  const token =
    await transport.exchangeAuthorizationCode({
      config: oauthConfig(),
      code: 'authorization-code',
      codeVerifier: fixedSecret(2)
    });

  assert.equal(token, 'provider-token');
  assert.equal(calls.length, 1);
  assert.equal(
    calls[0].url,
    'https://github.com/login/oauth/access_token'
  );
  assert.equal(calls[0].options.method, 'POST');

  const body =
    new URLSearchParams(calls[0].options.body);

  assert.equal(
    body.get('client_id'),
    'Iv1.0123456789abcdef'
  );
  assert.equal(
    body.get('client_secret'),
    'client-secret-value'
  );
  assert.equal(
    body.get('code'),
    'authorization-code'
  );
  assert.equal(
    body.get('redirect_uri'),
    'https://studio.example.com/auth/github/callback'
  );
  assert.equal(
    body.get('code_verifier'),
    fixedSecret(2)
  );
});

test('authenticated-user transport uses bearer token only server-side', async () => {
  /** @type {RecordedFetchCall[]} */
  const calls = [];

  const transport = new GitHubOAuthTransport({
    fetchImpl: async (url, options) => {
      calls.push({ url, options });

      return {
        ok: true,
        json: async () => githubUser()
      };
    }
  });

  const user =
    await transport.fetchAuthenticatedUser(
      'provider-secret-token'
    );

  assert.ok(
    user !== null &&
    typeof user === 'object'
  );

  assert.equal(
    /** @type {{ login?: unknown }} */ (user).login,
    'operator'
  );
  assert.equal(calls.length, 1);
  assert.equal(
    calls[0].url,
    'https://api.github.com/user'
  );
  assert.equal(calls[0].options.method, 'GET');
  assert.equal(
    calls[0].options.headers.Authorization,
    'Bearer provider-secret-token'
  );
  assert.equal(
    calls[0].options.headers.Accept,
    'application/vnd.github+json'
  );
  assert.equal(
    calls[0].options.headers['X-GitHub-Api-Version'],
    '2026-03-10'
  );
});

test('provider transport failures are generic and redact secrets and raw responses', async () => {
  const secrets = [
    'client-secret-value',
    'authorization-code-secret',
    'provider-access-token-secret'
  ];

  const transport = new GitHubOAuthTransport({
    fetchImpl: async () => ({
      ok: false,
      json: async () => ({
        error: 'bad_verification_code',
        secret:
          'provider-access-token-secret'
      })
    })
  });

  await assert.rejects(
    () => transport.exchangeAuthorizationCode({
      config: oauthConfig(),
      code: 'authorization-code-secret',
      codeVerifier: fixedSecret(2)
    }),
    (error) => {
      assert.ok(
        error instanceof HostedGitHubOAuthProviderError
      );

      for (const secret of secrets) {
        assert.equal(
          error.message.includes(secret),
          false
        );
      }

      return true;
    }
  );
});

test('malformed token responses fail closed without prefix assumptions', async () => {
  for (const payload of [
    null,
    {},
    {
      access_token: '',
      token_type: 'bearer'
    },
    {
      access_token: 'opaque-token',
      token_type: 'mac'
    },
    {
      access_token: ' opaque-token ',
      token_type: 'bearer'
    }
  ]) {
    const transport = new GitHubOAuthTransport({
      fetchImpl: async () => ({
        ok: true,
        json: async () => payload
      })
    });

    await assert.rejects(
      () => transport.exchangeAuthorizationCode({
        config: oauthConfig(),
        code: 'authorization-code',
        codeVerifier: fixedSecret(2)
      }),
      HostedGitHubOAuthProviderError
    );
  }

  const transport = new GitHubOAuthTransport({
    fetchImpl: async () => ({
      ok: true,
      json: async () => ({
        access_token:
          'completely-opaque-token-with-no-prefix-contract',
        token_type: 'BEARER'
      })
    })
  });

  assert.equal(
    await transport.exchangeAuthorizationCode({
      config: oauthConfig(),
      code: 'authorization-code',
      codeVerifier: fixedSecret(2)
    }),
    'completely-opaque-token-with-no-prefix-contract'
  );
});


function securityEventCapture() {
  /** @type {any[]} */
  const events = [];

  return {
    events,
    recorder: new HostedSecurityEventRecorder({
      clock: () => 777777,
      sink(event) {
        events.push(event);
      }
    })
  };
}

test('OAuth state failures emit one specific safe event each', async () => {
  {
    const capture = securityEventCapture();
    const { provider } = fixture({
      securityEventRecorder: capture.recorder
    });

    await assert.rejects(
      () => provider.complete({
        state: 'OAUTH_STATE_SECRET_MALFORMED',
        code: 'AUTH_CODE_SECRET'
      }),
      HostedGitHubOAuthAuthenticationError
    );

    assert.deepEqual(capture.events, [{
      version: 1,
      type:
        HOSTED_SECURITY_EVENT_TYPES.OAUTH_STATE_REJECTED,
      occurredAt: 777777,
      reason:
        HOSTED_SECURITY_EVENT_REASONS.OAUTH_STATE_MALFORMED
    }]);
  }

  {
    const capture = securityEventCapture();
    const { provider } = fixture({
      securityEventRecorder: capture.recorder
    });

    await assert.rejects(
      () => provider.complete({
        state: fixedSecret(99),
        code: 'AUTH_CODE_SECRET'
      }),
      HostedGitHubOAuthAuthenticationError
    );

    assert.deepEqual(capture.events, [{
      version: 1,
      type:
        HOSTED_SECURITY_EVENT_TYPES.OAUTH_STATE_REJECTED,
      occurredAt: 777777,
      reason:
        HOSTED_SECURITY_EVENT_REASONS
          .OAUTH_STATE_UNKNOWN_OR_REPLAYED
    }]);
  }

  {
    const capture = securityEventCapture();
    const start = 1_000_000;
    const { provider, setNow } = fixture({
      now: start,
      securityEventRecorder: capture.recorder
    });

    const started = await provider.begin('/studio');
    const state =
      new URL(started.authorizationUrl)
        .searchParams.get('state');

    assert.ok(state !== null);

    setNow(start + 10 * MINUTE);

    await assert.rejects(
      () => provider.complete({
        state,
        code: 'AUTH_CODE_SECRET'
      }),
      HostedGitHubOAuthAuthenticationError
    );

    assert.deepEqual(capture.events, [{
      version: 1,
      type:
        HOSTED_SECURITY_EVENT_TYPES.OAUTH_STATE_REJECTED,
      occurredAt: 777777,
      reason:
        HOSTED_SECURITY_EVENT_REASONS.OAUTH_STATE_EXPIRED
    }]);
  }
});

test('ordinary callback and provider failures emit one authentication event', async () => {
  {
    const capture = securityEventCapture();
    const { provider } = fixture({
      securityEventRecorder: capture.recorder
    });

    const started = await provider.begin('/studio');
    const state =
      new URL(started.authorizationUrl)
        .searchParams.get('state');

    assert.ok(state !== null);

    await assert.rejects(
      () => provider.complete({
        state,
        code: ''
      }),
      HostedGitHubOAuthAuthenticationError
    );

    assert.deepEqual(capture.events, [{
      version: 1,
      type:
        HOSTED_SECURITY_EVENT_TYPES.AUTHENTICATION_FAILED,
      occurredAt: 777777,
      reason:
        HOSTED_SECURITY_EVENT_REASONS.OAUTH_CALLBACK_REJECTED
    }]);
  }

  {
    const capture = securityEventCapture();
    const { provider } = fixture({
      securityEventRecorder: capture.recorder,
      transport: {
        exchangeAuthorizationCode: async () => {
          throw new HostedGitHubOAuthProviderError();
        },
        fetchAuthenticatedUser: async () => {
          throw new Error('not reached');
        }
      }
    });

    const started = await provider.begin('/studio');
    const state =
      new URL(started.authorizationUrl)
        .searchParams.get('state');

    assert.ok(state !== null);

    await assert.rejects(
      () => provider.complete({
        state,
        code: 'AUTH_CODE_SECRET'
      }),
      HostedGitHubOAuthProviderError
    );

    assert.deepEqual(capture.events, [{
      version: 1,
      type:
        HOSTED_SECURITY_EVENT_TYPES.AUTHENTICATION_FAILED,
      occurredAt: 777777,
      reason:
        HOSTED_SECURITY_EVENT_REASONS.OAUTH_PROVIDER_FAILED
    }]);
  }
});

test('OAuth security events never serialize provider or callback secrets', async () => {
  const sentinels = [
    'CLIENT_SECRET_DO_NOT_LOG',
    'ACCESS_TOKEN_DO_NOT_LOG',
    'AUTH_CODE_DO_NOT_LOG',
    'RAW_PROVIDER_BODY_DO_NOT_LOG',
    'AUTHORIZATION_HEADER_DO_NOT_LOG',
    fixedSecret(1),
    fixedSecret(2)
  ];

  const capture = securityEventCapture();

  const config = parseHostedGitHubOAuthConfig({
    ATELIER_STUDIO_GITHUB_CLIENT_ID:
      'Iv1.0123456789abcdef',
    ATELIER_STUDIO_GITHUB_CLIENT_SECRET:
      sentinels[0],
    ATELIER_STUDIO_GITHUB_CALLBACK_URL:
      'https://studio.example.com/auth/github/callback'
  });

  const store =
    new InMemoryHostedOAuthTransactionStore();

  const provider = new HostedGitHubOAuthProvider({
    config,
    transactionStore: store,
    clock: () => 1_000_000,
    secretGenerator: (() => {
      const values = [sentinels[5], sentinels[6]];
      let index = 0;
      return () => values[index++] ?? values.at(-1);
    })(),
    securityEventRecorder: capture.recorder,
    transport: {
      exchangeAuthorizationCode: async () =>
        sentinels[1],
      fetchAuthenticatedUser: async () => {
        throw new Error(
          `${sentinels[3]} ${sentinels[4]} ${sentinels[1]}`
        );
      }
    }
  });

  await provider.begin('/studio');

  await assert.rejects(
    () => provider.complete({
      state: sentinels[5],
      code: sentinels[2]
    }),
    HostedGitHubOAuthProviderError
  );

  assert.equal(capture.events.length, 1);

  const serialized =
    serializeHostedSecurityEvent(capture.events[0]);

  for (const sentinel of sentinels) {
    assert.equal(
      serialized.includes(sentinel),
      false,
      `security event leaked sentinel: ${sentinel}`
    );
  }
});

test('security-event recorder failure never replaces OAuth rejection semantics', async () => {
  const { provider } = fixture({
    securityEventRecorder: {
      record() {
        throw new Error(
          'LOGGER_SECRET_SHOULD_NOT_ESCAPE'
        );
      }
    }
  });

  await assert.rejects(
    () => provider.complete({
      state: 'malformed',
      code: 'AUTH_CODE_SECRET'
    }),
    (error) => {
      assert.ok(
        error instanceof HostedGitHubOAuthAuthenticationError
      );
      assert.equal(
        error.message.includes(
          'LOGGER_SECRET_SHOULD_NOT_ESCAPE'
        ),
        false
      );
      return true;
    }
  );
});

test('successful OAuth completion emits no rejection telemetry', async () => {
  const capture = securityEventCapture();
  const { provider } = fixture({
    securityEventRecorder: capture.recorder
  });

  const started = await provider.begin('/studio');
  const state =
    new URL(started.authorizationUrl)
      .searchParams.get('state');

  assert.ok(state !== null);

  await provider.complete({
    state,
    code: 'authorization-code'
  });

  assert.deepEqual(capture.events, []);
});
