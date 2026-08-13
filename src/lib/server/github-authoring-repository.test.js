import assert from 'node:assert/strict';
import test from 'node:test';
import {
  AuthoringChangeSetError,
  AuthoringRepositoryPathError,
  AuthoringRevisionConflictError
} from './authoring-repository.js';
import {
  GitHubAuthoringConfigurationError,
  GitHubAuthoringPathScopeError,
  GitHubAuthoringRefConflictError,
  GitHubAuthoringRepository,
  GitHubRestAuthoringTransport,
  assertGitHubWritablePath,
  commitShaFromGitHubRevision,
  githubAuthoringRevision,
  normalizeWritableRoots,
  parseGitHubAuthoringRepositoryConfig
} from './github-authoring-repository.js';

const SHA_A = 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
const SHA_B = 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb';
const SHA_C = 'cccccccccccccccccccccccccccccccccccccccc';
const SHA_D = 'dddddddddddddddddddddddddddddddddddddddd';

/** @typedef {Array<[string, any]>} TransportCalls */

/**
 * @param {Record<string, any>} [overrides]
 * @returns {any}
 */
function createTransport(overrides = {}) {
  const calls = /** @type {TransportCalls} */ ([]);

  const transport = /** @type {any} */ ({
    calls,
    async getBranchHead(/** @type {any} */ input) {
      calls.push(['getBranchHead', input]);
      return SHA_A;
    },
    async readFile(/** @type {any} */ input) {
      calls.push(['readFile', input]);
      return Buffer.from('title: Example\n');
    },
    async getCommitTree(/** @type {any} */ input) {
      calls.push(['getCommitTree', input]);
      return SHA_B;
    },
    async createBlob(/** @type {any} */ input) {
      calls.push(['createBlob', {
        ...input,
        content: Buffer.from(input.content)
      }]);
      return SHA_C;
    },
    async createTree(/** @type {any} */ input) {
      calls.push(['createTree', input]);
      return SHA_C;
    },
    async createCommit(/** @type {any} */ input) {
      calls.push(['createCommit', input]);
      return SHA_D;
    },
    async updateBranch(/** @type {any} */ input) {
      calls.push(['updateBranch', input]);
    },
    ...overrides
  });

  return transport;
}

function createRepository(transport = createTransport()) {
  return new GitHubAuthoringRepository({
    repository: 'example/site',
    branch: 'main',
    writableRoots: ['config', 'content', 'static/images'],
    transport
  });
}

test('GitHub revision encodes exactly one commit SHA', () => {
  assert.equal(githubAuthoringRevision(SHA_A), `github:${SHA_A}`);
  assert.equal(commitShaFromGitHubRevision(`github:${SHA_B}`), SHA_B);

  assert.throws(() => githubAuthoringRevision('abc'), TypeError);
  assert.throws(() => commitShaFromGitHubRevision(SHA_A), TypeError);
});

test('configuration requires repository, branch, token and writable roots', () => {
  const complete = /** @type {Record<string, string>} */ ({
    ATELIER_STUDIO_GITHUB_REPOSITORY: 'example/site',
    ATELIER_STUDIO_GITHUB_BRANCH: 'main',
    ATELIER_STUDIO_GITHUB_TOKEN: 'secret-token',
    ATELIER_STUDIO_GITHUB_WRITABLE_ROOTS: 'config, content, static/images'
  });

  assert.deepEqual(parseGitHubAuthoringRepositoryConfig(complete), {
    repository: 'example/site',
    branch: 'main',
    token: 'secret-token',
    writableRoots: ['config', 'content', 'static/images']
  });

  for (const key of Object.keys(complete)) {
    const environment = { ...complete };
    delete environment[key];

    assert.throws(
      () => parseGitHubAuthoringRepositoryConfig(environment),
      GitHubAuthoringConfigurationError,
      key
    );
  }
});

test('configuration rejects malformed repository, branch and roots', () => {
  assert.throws(
    () => parseGitHubAuthoringRepositoryConfig({
      ATELIER_STUDIO_GITHUB_REPOSITORY: 'example',
      ATELIER_STUDIO_GITHUB_BRANCH: 'main',
      ATELIER_STUDIO_GITHUB_TOKEN: 'token',
      ATELIER_STUDIO_GITHUB_WRITABLE_ROOTS: 'content'
    }),
    GitHubAuthoringConfigurationError
  );

  assert.throws(
    () => parseGitHubAuthoringRepositoryConfig({
      ATELIER_STUDIO_GITHUB_REPOSITORY: 'example/site',
      ATELIER_STUDIO_GITHUB_BRANCH: '../main',
      ATELIER_STUDIO_GITHUB_TOKEN: 'token',
      ATELIER_STUDIO_GITHUB_WRITABLE_ROOTS: 'content'
    }),
    GitHubAuthoringConfigurationError
  );

  assert.throws(
    () => normalizeWritableRoots(['../content']),
    GitHubAuthoringConfigurationError
  );
});

test('writable roots normalize deterministically and deduplicate', () => {
  assert.deepEqual(
    normalizeWritableRoots(['content/', 'config', 'content', 'static/images/']),
    ['config', 'content', 'static/images']
  );
});

test('mutation scope permits only configured writable roots', () => {
  const roots = ['config', 'content', 'static/images'];

  assert.equal(
    assertGitHubWritablePath('content/items/book.yaml', roots),
    'content/items/book.yaml'
  );
  assert.equal(
    assertGitHubWritablePath('static/images/cover.webp', roots),
    'static/images/cover.webp'
  );

  assert.throws(
    () => assertGitHubWritablePath('src/routes/+page.svelte', roots),
    GitHubAuthoringPathScopeError
  );
  assert.throws(
    () => assertGitHubWritablePath('.github/workflows/ci.yml', roots),
    GitHubAuthoringPathScopeError
  );
  assert.throws(
    () => assertGitHubWritablePath('../content/item.yaml', roots),
    AuthoringRepositoryPathError
  );
});

test('constructor fixes repository and branch independently from operations', async () => {
  const transport = createTransport();
  const repository = createRepository(transport);

  await repository.readText('content/item.yaml');

  assert.deepEqual(transport.calls[0], [
    'getBranchHead',
    {
      owner: 'example',
      repository: 'site',
      branch: 'main'
    }
  ]);

  assert.equal(transport.calls[1][1].revision, SHA_A);
});

test('text reads are pinned to the branch revision returned to the caller', async () => {
  const transport = createTransport();
  const repository = createRepository(transport);

  const result = await repository.readText('content/item.yaml');

  assert.deepEqual(result, {
    content: 'title: Example\n',
    revision: `github:${SHA_A}`
  });

  assert.deepEqual(transport.calls[1], [
    'readFile',
    {
      owner: 'example',
      repository: 'site',
      path: 'content/item.yaml',
      revision: SHA_A
    }
  ]);
});

test('binary reads preserve bytes and share branch revision semantics', async () => {
  const bytes = Buffer.from([0, 1, 128, 255]);
  const transport = createTransport({
    /**
     * @this {any}
     * @param {any} input
     */
    async readFile(input) {
      this.calls.push(['readFile', input]);
      return bytes;
    }
  });
  const repository = createRepository(transport);

  const result = await repository.readBinary('static/images/cover.webp');

  assert.deepEqual(result.content, bytes);
  assert.equal(result.revision, `github:${SHA_A}`);
});

test('write rejects stale expected revision before creating Git objects', async () => {
  const transport = createTransport({
    /**
     * @this {any}
     * @param {any} input
     */
    async getBranchHead(input) {
      this.calls.push(['getBranchHead', input]);
      return SHA_B;
    }
  });
  const repository = createRepository(transport);

  await assert.rejects(
    () => repository.writeText(
      'content/item.yaml',
      'title: Stale\n',
      { expectedRevision: `github:${SHA_A}` }
    ),
    AuthoringRevisionConflictError
  );

  assert.deepEqual(
    transport.calls.map((/** @type {[string, any]} */ [name]) => name),
    ['getBranchHead']
  );
});

test('write creates blob, tree and commit then advances only configured branch', async () => {
  const transport = createTransport();
  const repository = createRepository(transport);

  const result = await repository.writeText(
    'content/item.yaml',
    'title: Updated\n',
    {
      expectedRevision: `github:${SHA_A}`,
      message: 'studio: update item'
    }
  );

  assert.deepEqual(result, {
    revision: `github:${SHA_D}`
  });

  assert.deepEqual(
    transport.calls.map((/** @type {[string, any]} */ [name]) => name),
    [
      'getBranchHead',
      'getCommitTree',
      'createBlob',
      'createTree',
      'createCommit',
      'updateBranch'
    ]
  );

  assert.deepEqual(transport.calls.at(-1), [
    'updateBranch',
    {
      owner: 'example',
      repository: 'site',
      branch: 'main',
      commitSha: SHA_D
    }
  ]);

  assert.deepEqual(
    transport.calls.find((/** @type {[string, any]} */ [name]) => name === 'createTree')[1].changes,
    [
      {
        path: 'content/item.yaml',
        mode: '100644',
        type: 'blob',
        sha: SHA_C
      }
    ]
  );
});

test('delete creates one tree change with a null blob SHA', async () => {
  const transport = createTransport();
  const repository = createRepository(transport);

  const result = await repository.delete(
    'content/item.yaml',
    { expectedRevision: `github:${SHA_A}` }
  );

  assert.deepEqual(result, {
    revision: `github:${SHA_D}`
  });

  assert.deepEqual(
    transport.calls.find((/** @type {[string, any]} */ [name]) => name === 'createTree')[1].changes,
    [
      {
        path: 'content/item.yaml',
        mode: '100644',
        type: 'blob',
        sha: null
      }
    ]
  );

  assert.equal(
    transport.calls.some((/** @type {[string, any]} */ [name]) => name === 'createBlob'),
    false
  );
});

test('write and delete require explicit expected revision', async () => {
  const repository = createRepository();

  await assert.rejects(
    () => repository.writeText('content/item.yaml', 'title: No revision\n', /** @type {any} */ ({})),
    TypeError
  );

  await assert.rejects(
    () => repository.delete('content/item.yaml', /** @type {any} */ ({})),
    TypeError
  );
});

test('write never begins Git mutation outside the allow-list', async () => {
  const transport = createTransport();
  const repository = createRepository(transport);

  await assert.rejects(
    () => repository.writeText(
      'package.json',
      '{}\n',
      { expectedRevision: `github:${SHA_A}` }
    ),
    GitHubAuthoringPathScopeError
  );

  assert.equal(transport.calls.length, 0);
});

test('branch movement during ref update becomes an optimistic-concurrency conflict', async () => {
  let headReads = 0;

  const transport = createTransport({
    /**
     * @this {any}
     * @param {any} input
     */
    async getBranchHead(input) {
      this.calls.push(['getBranchHead', input]);
      headReads += 1;
      return headReads === 1 ? SHA_A : SHA_B;
    },
    /**
     * @this {any}
     * @param {any} input
     */
    async updateBranch(input) {
      this.calls.push(['updateBranch', input]);
      throw new GitHubAuthoringRefConflictError();
    }
  });

  const repository = createRepository(transport);

  await assert.rejects(
    () => repository.writeText(
      'content/item.yaml',
      'title: Racing writer\n',
      { expectedRevision: `github:${SHA_A}` }
    ),
    (error) => {
      assert.ok(error instanceof AuthoringRevisionConflictError);
      assert.equal(error.expectedRevision, `github:${SHA_A}`);
      assert.equal(error.actualRevision, `github:${SHA_B}`);
      return true;
    }
  );
});

test('transport never exposes token in HTTP failure diagnostics', async () => {
  const token = 'top-secret-token';

  const transport = new GitHubRestAuthoringTransport({
    token,
    fetchImpl: async () => new Response(
      JSON.stringify({ message: `server reflected ${token}` }),
      {
        status: 500,
        headers: { 'content-type': 'application/json' }
      }
    )
  });

  await assert.rejects(
    () => transport.getBranchHead({
      owner: 'example',
      repository: 'site',
      branch: 'main'
    }),
    (error) => {
      assert.ok(error instanceof Error);

      const transportError =
        /** @type {import('./github-authoring-repository.js').GitHubAuthoringTransportError} */ (
          error
        );

      assert.equal(transportError.message.includes(token), false);
      assert.equal(transportError.status, 500);
      return true;
    }
  );
});

test('REST transport sends non-force ref update and translates GitHub race status', async () => {
  /** @type {Array<{ url: string, init: RequestInit }>} */
  const requests = [];

  const transport = new GitHubRestAuthoringTransport({
    token: 'token',
    fetchImpl: async (url, init = {}) => {
      requests.push({
        url: String(url),
        init
      });

      return new Response(
        JSON.stringify({ message: 'Update is not a fast forward' }),
        {
          status: 422,
          headers: { 'content-type': 'application/json' }
        }
      );
    }
  });

  await assert.rejects(
    () => transport.updateBranch({
      owner: 'example',
      repository: 'site',
      branch: 'feature/authoring',
      commitSha: SHA_D
    }),
    GitHubAuthoringRefConflictError
  );

  assert.equal(requests.length, 1);
  assert.match(requests[0].url, /feature%2Fauthoring$/);

  const body = JSON.parse(String(requests[0].init.body));
  assert.deepEqual(body, {
    sha: SHA_D,
    force: false
  });
});


test('multi-file change set creates all blobs, one tree, one commit and one branch advancement', async () => {
  const transport = createTransport();
  const repository = createRepository(transport);

  const result =
    await repository.applyChanges(
      [
        {
          type: 'text',
          path: 'content/item.yaml',
          content: 'title: Updated\n'
        },
        {
          type: 'binary',
          path: 'static/images/cover.webp',
          content: Buffer.from([1, 2, 3])
        },
        {
          type: 'delete',
          path: 'config/legacy.yaml'
        }
      ],
      {
        expectedRevision:
          `github:${SHA_A}`,
        message:
          'studio: update item and image'
      }
    );

  assert.deepEqual(result, {
    revision: `github:${SHA_D}`
  });

  assert.deepEqual(
    transport.calls.map(
      (/** @type {[string, any]} */ [name]) =>
        name
    ),
    [
      'getBranchHead',
      'getCommitTree',
      'createBlob',
      'createBlob',
      'createTree',
      'createCommit',
      'updateBranch'
    ]
  );

  const treeCall =
    transport.calls.find(
      (/** @type {[string, any]} */ [name]) =>
        name === 'createTree'
    );

  assert.deepEqual(
    treeCall[1].changes,
    [
      {
        path: 'content/item.yaml',
        mode: '100644',
        type: 'blob',
        sha: SHA_C
      },
      {
        path: 'static/images/cover.webp',
        mode: '100644',
        type: 'blob',
        sha: SHA_C
      },
      {
        path: 'config/legacy.yaml',
        mode: '100644',
        type: 'blob',
        sha: null
      }
    ]
  );

  assert.equal(
    transport.calls.filter(
      (/** @type {[string, any]} */ [name]) =>
        name === 'createCommit'
    ).length,
    1
  );

  assert.equal(
    transport.calls.filter(
      (/** @type {[string, any]} */ [name]) =>
        name === 'updateBranch'
    ).length,
    1
  );
});

test('multi-file stale revision rejects the complete change set before Git object creation', async () => {
  const transport =
    createTransport({
      /**
       * @this {any}
       * @param {any} input
       */
      async getBranchHead(input) {
        this.calls.push([
          'getBranchHead',
          input
        ]);
        return SHA_B;
      }
    });

  const repository =
    createRepository(transport);

  await assert.rejects(
    () =>
      repository.applyChanges(
        [
          {
            type: 'text',
            path: 'content/a.yaml',
            content: 'a\n'
          },
          {
            type: 'text',
            path: 'content/b.yaml',
            content: 'b\n'
          }
        ],
        {
          expectedRevision:
            `github:${SHA_A}`
        }
      ),
    AuthoringRevisionConflictError
  );

  assert.deepEqual(
    transport.calls.map(
      (/** @type {[string, any]} */ [name]) =>
        name
    ),
    ['getBranchHead']
  );
});

test('multi-file path scope and duplicate validation fail before consulting GitHub', async () => {
  const transport = createTransport();
  const repository =
    createRepository(transport);

  await assert.rejects(
    () =>
      repository.applyChanges(
        [
          {
            type: 'text',
            path: 'content/item.yaml',
            content: 'safe\n'
          },
          {
            type: 'text',
            path: 'package.json',
            content: '{}\n'
          }
        ],
        {
          expectedRevision:
            `github:${SHA_A}`
        }
      ),
    GitHubAuthoringPathScopeError
  );

  assert.equal(
    transport.calls.length,
    0
  );

  await assert.rejects(
    () =>
      repository.applyChanges(
        [
          {
            type: 'text',
            path: 'content/item.yaml',
            content: 'first\n'
          },
          {
            type: 'delete',
            path: './content/item.yaml'
          }
        ],
        {
          expectedRevision:
            `github:${SHA_A}`
        }
      ),
    AuthoringChangeSetError
  );

  assert.equal(
    transport.calls.length,
    0
  );
});

test('binary single-file wrapper uses the same atomic Git change-set path', async () => {
  const transport = createTransport();
  const repository =
    createRepository(transport);

  const result =
    await repository.writeBinary(
      'static/images/cover.webp',
      Buffer.from([9, 8, 7]),
      {
        expectedRevision:
          `github:${SHA_A}`
      }
    );

  assert.deepEqual(result, {
    revision: `github:${SHA_D}`
  });

  assert.deepEqual(
    transport.calls.map(
      (/** @type {[string, any]} */ [name]) =>
        name
    ),
    [
      'getBranchHead',
      'getCommitTree',
      'createBlob',
      'createTree',
      'createCommit',
      'updateBranch'
    ]
  );
});


test('multi-file ref conflict leaves branch visibility atomic', async () => {
  let headReads = 0;

  const transport =
    createTransport({
      /**
       * @this {any}
       * @param {any} input
       */
      async getBranchHead(input) {
        this.calls.push([
          'getBranchHead',
          input
        ]);

        headReads += 1;

        return headReads === 1
          ? SHA_A
          : SHA_B;
      },

      /**
       * @this {any}
       * @param {any} input
       */
      async updateBranch(input) {
        this.calls.push([
          'updateBranch',
          input
        ]);

        throw new GitHubAuthoringRefConflictError();
      }
    });

  const repository =
    createRepository(transport);

  await assert.rejects(
    () =>
      repository.applyChanges(
        [
          {
            type: 'text',
            path: 'content/a.yaml',
            content: 'a\n'
          },
          {
            type: 'text',
            path: 'content/b.yaml',
            content: 'b\n'
          }
        ],
        {
          expectedRevision:
            `github:${SHA_A}`,
          message:
            'studio: update related files'
        }
      ),
    (error) => {
      assert.ok(
        error instanceof
          AuthoringRevisionConflictError
      );

      assert.equal(
        error.expectedRevision,
        `github:${SHA_A}`
      );

      assert.equal(
        error.actualRevision,
        `github:${SHA_B}`
      );

      return true;
    }
  );

  assert.equal(
    transport.calls.filter(
      (/** @type {[string, any]} */ [name]) =>
        name === 'createCommit'
    ).length,
    1
  );

  assert.equal(
    transport.calls.filter(
      (/** @type {[string, any]} */ [name]) =>
        name === 'updateBranch'
    ).length,
    1
  );

  /*
   * Git objects may already exist, but branch visibility changes only through
   * updateBranch. Its failure is therefore one optimistic-concurrency
   * conflict and never exposes a subset of the logical change set.
   */
});
