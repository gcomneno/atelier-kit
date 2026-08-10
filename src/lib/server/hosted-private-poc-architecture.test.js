import assert from 'node:assert/strict';
import {
  readdir,
  readFile
} from 'node:fs/promises';
import path from 'node:path';
import {
  fileURLToPath
} from 'node:url';
import test from 'node:test';

const STUDIO_ROOT =
  fileURLToPath(
    new URL('../../routes/studio/', import.meta.url)
  );

const AUTH_ROOT =
  fileURLToPath(
    new URL('../../routes/auth/', import.meta.url)
  );

const HOOK_FILE =
  fileURLToPath(
    new URL('../../hooks.server.js', import.meta.url)
  );

const SOURCE_ROOT =
  fileURLToPath(
    new URL('../..', import.meta.url)
  );

/**
 * @param {string} root
 * @returns {Promise<string[]>}
 */
async function collectFiles(root) {
  const entries =
    await readdir(root, {
      withFileTypes: true
    });

  /** @type {string[]} */
  const files = [];

  for (const entry of entries) {
    const absolute =
      path.join(root, entry.name);

    if (entry.isDirectory()) {
      files.push(
        ...(await collectFiles(absolute))
      );
      continue;
    }

    if (entry.isFile()) {
      files.push(absolute);
    }
  }

  return files;
}

/**
 * @param {string} root
 * @param {string} file
 */
function relativePath(root, file) {
  return path
    .relative(root, file)
    .split(path.sep)
    .join('/');
}

/**
 * @param {string} file
 */
async function source(file) {
  return readFile(file, 'utf8');
}

test('only explicitly admitted Studio loaders/actions consume Hosted trusted locals', async () => {
  const serverFiles =
    (await collectFiles(STUDIO_ROOT))
      .filter((file) =>
        file.endsWith('.server.js')
      );

  /** @type {string[]} */
  const hostedContextConsumers = [];

  for (const file of serverFiles) {
    if (
      (await source(file))
        .includes('hostedStudio')
    ) {
      hostedContextConsumers.push(
        relativePath(STUDIO_ROOT, file)
      );
    }
  }

  assert.deepEqual(
    hostedContextConsumers.sort(),
    [
      '+layout.server.js',
      '+page.server.js',
      'site/social/+page.server.js'
    ]
  );

  for (const relative of
    hostedContextConsumers) {
    const contents =
      await source(
        path.join(STUDIO_ROOT, relative)
      );

    assert.match(
      contents,
      /guardStudio\s*\(\s*locals\.hostedStudio\s*\)/
    );
  }
});

test('current Studio mutation surface remains contextless and Hosted fail-closed', async () => {
  const serverFiles =
    (await collectFiles(STUDIO_ROOT))
      .filter((file) =>
        file.endsWith('.server.js')
      );

  /** @type {Array<{
   *   relative: string,
   *   contents: string
   * }>} */
  const actionFiles = [];

  for (const file of serverFiles) {
    const contents =
      await source(file);

    if (
      /export\s+const\s+actions\s*=/
        .test(contents)
    ) {
      actionFiles.push({
        relative:
          relativePath(STUDIO_ROOT, file),
        contents
      });
    }
  }

  assert.ok(
    actionFiles.length > 0,
    'Studio mutation surface must be enumerated'
  );

  const representativeGroups = [
    ['items', /(^|\/)items(\/|$)/],
    ['news', /(^|\/)news(\/|$)/],
    ['collections', /(^|\/)collections(\/|$)/],
    ['site configuration', /(^|\/)site(\/|$)/],
    ['readiness/publish', /(^|\/)readiness(\/|$)/],
    ['system', /(^|\/)system(\/|$)/]
  ];

  for (const [
    label,
    pattern
  ] of representativeGroups) {
    assert.ok(
      actionFiles.some(({ relative }) =>
        /** @type {RegExp} */ (pattern)
          .test(relative)
      ),
      `missing representative mutation group: ${label}`
    );
  }

  for (const {
    relative,
    contents
  } of actionFiles) {
    if (
      relative ===
      'site/social/+page.server.js'
    ) {
      assert.match(
        contents,
        /guardStudio\s*\(\s*locals\.hostedStudio\s*\)/,
        'Social loader must require genuine Hosted context'
      );

      assert.match(
        contents,
        /runtime\.evaluateMutation\s*\(/,
        'Social POST must delegate integrity authority to the existing Hosted mutation guard'
      );

      assert.match(
        contents,
        /saveHostedSocialAuthoringData\s*\(/,
        'Social POST must use the repository-backed Hosted mutation seam'
      );

      assert.match(
        contents,
        /runtimeMode\s*!==\s*'hosted'[\s\S]*saveSocialAction/,
        'Local Social must retain its existing Local action'
      );

      assert.equal(
        contents.includes(
          'GitHubAuthoringRepository'
        ),
        false,
        'Social route must not directly own repository authority'
      );

      continue;
    }

    assert.match(
      contents,
      /guardStudio\s*\(\s*\)/,
      `${relative} must retain contextless guardStudio()`
    );

    assert.equal(
      contents.includes('hostedStudio'),
      false,
      `${relative} must not consume Hosted trusted locals`
    );

    assert.equal(
      contents.includes(
        'HostedMutationGuard'
      ),
      false,
      `${relative} must not gain Hosted mutation authority`
    );

    assert.equal(
      contents.includes(
        'GitHubAuthoringRepository'
      ),
      false,
      `${relative} must not wire repository mutations`
    );
  }
});

test('live auth surface is exactly login callback and POST logout', async () => {
  const authFiles =
    (await collectFiles(AUTH_ROOT))
      .filter((file) =>
        file.endsWith('+server.js')
      )
      .map((file) =>
        relativePath(AUTH_ROOT, file)
      )
      .sort();

  assert.deepEqual(
    authFiles,
    [
      'github/callback/+server.js',
      'github/login/+server.js',
      'logout/+server.js'
    ]
  );

  const login =
    await source(
      path.join(
        AUTH_ROOT,
        'github/login/+server.js'
      )
    );

  const callback =
    await source(
      path.join(
        AUTH_ROOT,
        'github/callback/+server.js'
      )
    );

  const logout =
    await source(
      path.join(
        AUTH_ROOT,
        'logout/+server.js'
      )
    );

  assert.match(
    login,
    /export\s+async\s+function\s+GET\s*\(/
  );
  assert.match(
    callback,
    /export\s+async\s+function\s+GET\s*\(/
  );
  assert.match(
    logout,
    /export\s+async\s+function\s+POST\s*\(/
  );

  assert.doesNotMatch(
    logout,
    /export\s+(?:async\s+)?function\s+GET\s*\(/
  );
});

test('successful logout terminates on a non-authenticating response', async () => {
  const logout =
    await source(
      path.join(
        AUTH_ROOT,
        'logout/+server.js'
      )
    );

  assert.match(
    logout,
    /return\s+new\s+Response\s*\(/
  );

  assert.match(
    logout,
    /['"]cache-control['"]\s*:\s*['"]no-store['"]/
  );

  assert.doesNotMatch(
    logout,
    /redirect\s*\(/
  );

  assert.doesNotMatch(
    logout,
    /['"]\/studio['"]/
  );

  assert.doesNotMatch(
    logout,
    /auth\/github\/login/
  );
});

test('browser-facing dashboard exposes only logout CSRF capability', async () => {
  const rootServer =
    await source(
      path.join(
        STUDIO_ROOT,
        '+page.server.js'
      )
    );

  const rootComponent =
    await source(
      path.join(
        STUDIO_ROOT,
        '+page.svelte'
      )
    );

  assert.match(
    rootServer,
    /createHostedPrivatePocDashboardData/
  );

  assert.match(
    rootComponent,
    /action="\/auth\/logout"/
  );

  assert.match(
    rootComponent,
    /name="csrfToken"/
  );

  for (const forbidden of [
    'sessionId',
    'accessToken',
    'clientSecret',
    'authorizationConfig',
    'allowedGitHubSubjects',
    'oauthState',
    'pkceVerifier',
    'repositoryCredential',
    'securityEvent'
  ]) {
    assert.equal(
      rootComponent.includes(forbidden),
      false,
      `dashboard must not expose ${forbidden}`
    );
  }
});

test('live Hosted PoC wiring imports no repository filesystem or publish mutation service', async () => {
  const liveFiles = [
    HOOK_FILE,
    path.join(
      STUDIO_ROOT,
      '+page.server.js'
    ),
    ...(await collectFiles(AUTH_ROOT))
      .filter((file) =>
        file.endsWith('+server.js')
      )
  ];

  const forbiddenMutationDependencies = [
    'github-authoring-repository',
    'GitHubAuthoringRepository',
    'studio-io',
    'studio-publish-live',
    'node:fs',
    'node:child_process',
    'spawnSync'
  ];

  for (const file of liveFiles) {
    const contents =
      await source(file);

    for (const forbidden of
      forbiddenMutationDependencies) {
      assert.equal(
        contents.includes(forbidden),
        false,
        `${relativePath(
          path.dirname(HOOK_FILE),
          file
        )} must not wire ${forbidden}`
      );
    }
  }
});

test('Upstash state configuration and client remain in the server-only Hosted boundary', async () => {
  const allSourceFiles = await collectFiles(SOURCE_ROOT);
  const nonServerFiles = allSourceFiles.filter((file) =>
    !file.includes(`${path.sep}lib${path.sep}server${path.sep}`)
  );

  for (const file of nonServerFiles) {
    const contents = await source(file);
    for (const forbidden of [
      '@upstash/redis',
      'ATELIER_STUDIO_STATE_REDIS_REST_URL',
      'ATELIER_STUDIO_STATE_REDIS_REST_TOKEN',
      'ATELIER_STUDIO_STATE_NAMESPACE',
      'HostedUpstashRedisTransport'
    ]) {
      assert.equal(
        contents.includes(forbidden),
        false,
        `${relativePath(SOURCE_ROOT, file)} must not expose ${forbidden}`
      );
    }
  }

  const adapter = await source(
    path.join(
      SOURCE_ROOT,
      'lib/server/hosted-upstash-redis-transport.js'
    )
  );
  assert.match(adapter, /import\s+\{\s*Redis\s*\}\s+from\s+['"]@upstash\/redis['"]/);
  assert.doesNotMatch(adapter, /export\s+\{[^}]*Redis/);
  assert.doesNotMatch(adapter, /fromEnv\s*\(/);
});
