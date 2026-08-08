import {
  AuthoringRepositoryPathError,
  AuthoringRevisionConflictError,
  normalizeAuthoringPath
} from './authoring-repository.js';

const GITHUB_REVISION_PATTERN = /^github:[0-9a-f]{40}$/i;
const REPOSITORY_PATTERN = /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/;
const BRANCH_PATTERN = /^(?!\/)(?!.*(?:^|\/)\.\.(?:\/|$))(?!.*\/\/)(?!.*\.$)[^\s~^:?*[\\]+$/;

/**
 * @typedef {{
 *   repository: string,
 *   branch: string,
 *   token: string,
 *   writableRoots: string[]
 * }} GitHubAuthoringRepositoryConfig
 */

/**
 * @typedef {{
 *   getBranchHead(input: {
 *     owner: string,
 *     repository: string,
 *     branch: string
 *   }): Promise<string>,
 *   readFile(input: {
 *     owner: string,
 *     repository: string,
 *     path: string,
 *     revision: string
 *   }): Promise<Buffer>,
 *   getCommitTree(input: {
 *     owner: string,
 *     repository: string,
 *     commitSha: string
 *   }): Promise<string>,
 *   createBlob(input: {
 *     owner: string,
 *     repository: string,
 *     content: Buffer
 *   }): Promise<string>,
 *   createTree(input: {
 *     owner: string,
 *     repository: string,
 *     baseTreeSha: string,
 *     changes: Array<{
 *       path: string,
 *       mode: '100644',
 *       type: 'blob',
 *       sha: string | null
 *     }>
 *   }): Promise<string>,
 *   createCommit(input: {
 *     owner: string,
 *     repository: string,
 *     message: string,
 *     treeSha: string,
 *     parentSha: string
 *   }): Promise<string>,
 *   updateBranch(input: {
 *     owner: string,
 *     repository: string,
 *     branch: string,
 *     commitSha: string
 *   }): Promise<void>
 * }} GitHubAuthoringTransport
 */

export class GitHubAuthoringConfigurationError extends Error {
  /**
   * @param {string} message
   */
  constructor(message) {
    super(message);
    this.name = 'GitHubAuthoringConfigurationError';
    this.code = 'GITHUB_AUTHORING_CONFIGURATION_INVALID';
  }
}

export class GitHubAuthoringPathScopeError extends AuthoringRepositoryPathError {
  /**
   * @param {string} relativePath
   */
  constructor(relativePath) {
    super(`Authoring path is outside configured writable roots: ${relativePath}`);
    this.name = 'GitHubAuthoringPathScopeError';
    this.code = 'GITHUB_AUTHORING_PATH_FORBIDDEN';
    this.relativePath = relativePath;
  }
}

export class GitHubAuthoringTransportError extends Error {
  /**
   * @param {string} message
   * @param {number | null} [status]
   */
  constructor(message, status = null) {
    super(message);
    this.name = 'GitHubAuthoringTransportError';
    this.code = 'GITHUB_AUTHORING_TRANSPORT_ERROR';
    this.status = status;
  }
}

export class GitHubAuthoringRefConflictError extends GitHubAuthoringTransportError {
  constructor() {
    super('Configured GitHub branch advanced during authoring mutation.', 409);
    this.name = 'GitHubAuthoringRefConflictError';
    this.code = 'GITHUB_AUTHORING_REF_CONFLICT';
  }
}

/**
 * @param {string} commitSha
 * @returns {string}
 */
export function githubAuthoringRevision(commitSha) {
  if (!/^[0-9a-f]{40}$/i.test(commitSha)) {
    throw new TypeError('GitHub commit SHA must contain exactly 40 hexadecimal characters.');
  }

  return `github:${commitSha.toLowerCase()}`;
}

/**
 * @param {string} revision
 * @returns {string}
 */
export function commitShaFromGitHubRevision(revision) {
  if (typeof revision !== 'string' || !GITHUB_REVISION_PATTERN.test(revision)) {
    throw new TypeError('Expected GitHub authoring revision must use github:<40-hex-sha>.');
  }

  return revision.slice('github:'.length).toLowerCase();
}

/**
 * @param {unknown} raw
 * @returns {string[]}
 */
export function normalizeWritableRoots(raw) {
  if (!Array.isArray(raw) || raw.length === 0) {
    throw new GitHubAuthoringConfigurationError(
      'At least one writable authoring root is required.'
    );
  }

  /** @type {string[]} */
  const roots = [];

  for (const candidate of raw) {
    if (typeof candidate !== 'string') {
      throw new GitHubAuthoringConfigurationError(
        'Writable authoring roots must be strings.'
      );
    }

    let normalized;

    try {
      normalized = normalizeAuthoringPath(candidate.replace(/\/+$/, ''));
    } catch {
      throw new GitHubAuthoringConfigurationError(
        'Writable authoring roots must be safe project-relative paths.'
      );
    }

    if (!roots.includes(normalized)) {
      roots.push(normalized);
    }
  }

  return roots.sort();
}

/**
 * @param {string} relativePath
 * @param {string[]} writableRoots
 * @returns {string}
 */
export function assertGitHubWritablePath(relativePath, writableRoots) {
  const normalized = normalizeAuthoringPath(relativePath);

  const allowed = writableRoots.some(
    (root) => normalized === root || normalized.startsWith(`${root}/`)
  );

  if (!allowed) {
    throw new GitHubAuthoringPathScopeError(normalized);
  }

  return normalized;
}

/**
 * @param {Record<string, string | undefined>} environment
 * @returns {GitHubAuthoringRepositoryConfig}
 */
export function parseGitHubAuthoringRepositoryConfig(environment) {
  const repository = environment.ATELIER_STUDIO_GITHUB_REPOSITORY?.trim() || '';
  const branch = environment.ATELIER_STUDIO_GITHUB_BRANCH?.trim() || '';
  const token = environment.ATELIER_STUDIO_GITHUB_TOKEN?.trim() || '';
  const rootsValue = environment.ATELIER_STUDIO_GITHUB_WRITABLE_ROOTS?.trim() || '';

  if (!REPOSITORY_PATTERN.test(repository)) {
    throw new GitHubAuthoringConfigurationError(
      'ATELIER_STUDIO_GITHUB_REPOSITORY must use owner/name.'
    );
  }

  if (!branch || !BRANCH_PATTERN.test(branch)) {
    throw new GitHubAuthoringConfigurationError(
      'ATELIER_STUDIO_GITHUB_BRANCH must contain a valid explicit branch name.'
    );
  }

  if (!token) {
    throw new GitHubAuthoringConfigurationError(
      'ATELIER_STUDIO_GITHUB_TOKEN is required.'
    );
  }

  const writableRoots = normalizeWritableRoots(
    rootsValue
      .split(',')
      .map((value) => value.trim())
      .filter(Boolean)
  );

  return {
    repository,
    branch,
    token,
    writableRoots
  };
}

/**
 * GitHub-backed AuthoringRepository adapter.
 *
 * Repository, branch and writable roots are constructor configuration. None of
 * them are accepted by read/write calls, preventing request data from changing
 * the authoring target.
 */
export class GitHubAuthoringRepository {
  /**
   * @param {{
   *   repository: string,
   *   branch: string,
   *   writableRoots: string[],
   *   transport: GitHubAuthoringTransport
   * }} input
   */
  constructor({ repository, branch, writableRoots, transport }) {
    if (!REPOSITORY_PATTERN.test(repository)) {
      throw new GitHubAuthoringConfigurationError(
        'GitHub authoring repository must use owner/name.'
      );
    }

    if (!branch || !BRANCH_PATTERN.test(branch)) {
      throw new GitHubAuthoringConfigurationError(
        'GitHub authoring branch must be explicit and valid.'
      );
    }

    if (!transport || typeof transport !== 'object') {
      throw new GitHubAuthoringConfigurationError(
        'GitHub authoring transport is required.'
      );
    }

    const [owner, repositoryName] = repository.split('/');

    this.owner = owner;
    this.repository = repositoryName;
    this.branch = branch;
    this.writableRoots = normalizeWritableRoots(writableRoots);
    this.transport = transport;
  }

  /**
   * @returns {Promise<string>}
   */
  async revision() {
    const commitSha = await this.transport.getBranchHead({
      owner: this.owner,
      repository: this.repository,
      branch: this.branch
    });

    return githubAuthoringRevision(commitSha);
  }

  /**
   * @param {string} relativePath
   * @returns {Promise<{ content: string, revision: string }>}
   */
  async readText(relativePath) {
    const normalized = normalizeAuthoringPath(relativePath);
    const revision = await this.revision();
    const commitSha = commitShaFromGitHubRevision(revision);

    const content = await this.transport.readFile({
      owner: this.owner,
      repository: this.repository,
      path: normalized,
      revision: commitSha
    });

    return {
      content: content.toString('utf8'),
      revision
    };
  }

  /**
   * @param {string} relativePath
   * @returns {Promise<{ content: Buffer, revision: string }>}
   */
  async readBinary(relativePath) {
    const normalized = normalizeAuthoringPath(relativePath);
    const revision = await this.revision();
    const commitSha = commitShaFromGitHubRevision(revision);

    const content = await this.transport.readFile({
      owner: this.owner,
      repository: this.repository,
      path: normalized,
      revision: commitSha
    });

    return {
      content,
      revision
    };
  }

  /**
   * @param {string} expectedRevision
   * @returns {Promise<string>}
   */
  async assertExpectedRevision(expectedRevision) {
    const expectedSha = commitShaFromGitHubRevision(expectedRevision);
    const actualRevision = await this.revision();

    if (actualRevision !== githubAuthoringRevision(expectedSha)) {
      throw new AuthoringRevisionConflictError(
        this.branch,
        expectedRevision,
        actualRevision
      );
    }

    return expectedSha;
  }

  /**
   * @param {string} relativePath
   * @param {string} content
   * @param {{ expectedRevision: string, message?: string }} options
   * @returns {Promise<{ revision: string }>}
   */
  async writeText(relativePath, content, options) {
    if (typeof content !== 'string') {
      throw new TypeError('Authoring text content must be a string.');
    }

    if (!options || typeof options.expectedRevision !== 'string') {
      throw new TypeError('GitHub authoring writes require an expected revision.');
    }

    const normalized = assertGitHubWritablePath(relativePath, this.writableRoots);
    const parentSha = await this.assertExpectedRevision(options.expectedRevision);

    return this.commitChange({
      path: normalized,
      content: Buffer.from(content, 'utf8'),
      parentSha,
      message: options.message || `studio: update ${normalized}`
    });
  }

  /**
   * @param {string} relativePath
   * @param {{ expectedRevision: string, message?: string }} options
   * @returns {Promise<{ revision: string }>}
   */
  async delete(relativePath, options) {
    if (!options || typeof options.expectedRevision !== 'string') {
      throw new TypeError('GitHub authoring deletes require an expected revision.');
    }

    const normalized = assertGitHubWritablePath(relativePath, this.writableRoots);
    const parentSha = await this.assertExpectedRevision(options.expectedRevision);

    return this.commitChange({
      path: normalized,
      content: null,
      parentSha,
      message: options.message || `studio: delete ${normalized}`
    });
  }

  /**
   * Deliberately models one change as a change-set of one element. A later
   * multi-file vertical can widen only this input without changing the Git
   * Data commit sequence.
   *
   * @param {{
   *   path: string,
   *   content: Buffer | null,
   *   parentSha: string,
   *   message: string
   * }} input
   * @returns {Promise<{ revision: string }>}
   */
  async commitChange({ path, content, parentSha, message }) {
    const baseTreeSha = await this.transport.getCommitTree({
      owner: this.owner,
      repository: this.repository,
      commitSha: parentSha
    });

    const blobSha = content === null
      ? null
      : await this.transport.createBlob({
          owner: this.owner,
          repository: this.repository,
          content
        });

    const treeSha = await this.transport.createTree({
      owner: this.owner,
      repository: this.repository,
      baseTreeSha,
      changes: [
        {
          path,
          mode: '100644',
          type: 'blob',
          sha: blobSha
        }
      ]
    });

    const commitSha = await this.transport.createCommit({
      owner: this.owner,
      repository: this.repository,
      message,
      treeSha,
      parentSha
    });

    try {
      await this.transport.updateBranch({
        owner: this.owner,
        repository: this.repository,
        branch: this.branch,
        commitSha
      });
    } catch (error) {
      if (error instanceof GitHubAuthoringRefConflictError) {
        const actualRevision = await this.revision();

        throw new AuthoringRevisionConflictError(
          this.branch,
          githubAuthoringRevision(parentSha),
          actualRevision
        );
      }

      throw error;
    }

    return {
      revision: githubAuthoringRevision(commitSha)
    };
  }
}

/**
 * Minimal GitHub REST transport using Git Data semantics.
 *
 * The token is private constructor state and is never included in returned
 * objects or diagnostic messages.
 */
export class GitHubRestAuthoringTransport {
  /**
   * @param {{ token: string, fetchImpl?: typeof fetch, apiBaseUrl?: string }} input
   */
  constructor({
    token,
    fetchImpl = fetch,
    apiBaseUrl = 'https://api.github.com'
  }) {
    if (typeof token !== 'string' || token.trim() === '') {
      throw new GitHubAuthoringConfigurationError(
        'GitHub authoring transport token is required.'
      );
    }

    if (typeof fetchImpl !== 'function') {
      throw new GitHubAuthoringConfigurationError(
        'GitHub authoring fetch implementation is required.'
      );
    }

    this.token = token;
    this.fetchImpl = fetchImpl;
    this.apiBaseUrl = apiBaseUrl.replace(/\/+$/, '');
  }

  /**
   * @param {string} pathname
   * @param {RequestInit} [options]
   * @returns {Promise<any>}
   */
  async request(pathname, options = {}) {
    const response = await this.fetchImpl(`${this.apiBaseUrl}${pathname}`, {
      ...options,
      headers: {
        Accept: 'application/vnd.github+json',
        Authorization: `Bearer ${this.token}`,
        'X-GitHub-Api-Version': '2022-11-28',
        ...(options.headers || {})
      }
    });

    if (!response.ok) {
      if (
        options.method === 'PATCH' &&
        (response.status === 409 || response.status === 422)
      ) {
        throw new GitHubAuthoringRefConflictError();
      }

      throw new GitHubAuthoringTransportError(
        `GitHub authoring request failed with HTTP ${response.status}.`,
        response.status
      );
    }

    if (response.status === 204) {
      return null;
    }

    return response.json();
  }

  /**
   * @param {{ owner: string, repository: string, branch: string }} input
   */
  async getBranchHead({ owner, repository, branch }) {
    const data = await this.request(
      `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repository)}` +
      `/git/ref/heads/${encodeURIComponent(branch)}`
    );

    return data.object.sha;
  }

  /**
   * @param {{ owner: string, repository: string, path: string, revision: string }} input
   */
  async readFile({ owner, repository, path, revision }) {
    const encodedPath = path.split('/').map(encodeURIComponent).join('/');
    const data = await this.request(
      `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repository)}` +
      `/contents/${encodedPath}?ref=${encodeURIComponent(revision)}`
    );

    if (
      !data ||
      data.type !== 'file' ||
      data.encoding !== 'base64' ||
      typeof data.content !== 'string'
    ) {
      throw new GitHubAuthoringTransportError(
        'GitHub authoring path did not resolve to a base64 file.'
      );
    }

    return Buffer.from(data.content.replace(/\s/g, ''), 'base64');
  }

  /**
   * @param {{ owner: string, repository: string, commitSha: string }} input
   */
  async getCommitTree({ owner, repository, commitSha }) {
    const data = await this.request(
      `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repository)}` +
      `/git/commits/${encodeURIComponent(commitSha)}`
    );

    return data.tree.sha;
  }

  /**
   * @param {{ owner: string, repository: string, content: Buffer }} input
   */
  async createBlob({ owner, repository, content }) {
    const data = await this.request(
      `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repository)}/git/blobs`,
      {
        method: 'POST',
        body: JSON.stringify({
          content: content.toString('base64'),
          encoding: 'base64'
        })
      }
    );

    return data.sha;
  }

  /**
   * @param {{
   *   owner: string,
   *   repository: string,
   *   baseTreeSha: string,
   *   changes: Array<{path: string, mode: '100644', type: 'blob', sha: string | null}>
   * }} input
   */
  async createTree({ owner, repository, baseTreeSha, changes }) {
    const data = await this.request(
      `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repository)}/git/trees`,
      {
        method: 'POST',
        body: JSON.stringify({
          base_tree: baseTreeSha,
          tree: changes
        })
      }
    );

    return data.sha;
  }

  /**
   * @param {{
   *   owner: string,
   *   repository: string,
   *   message: string,
   *   treeSha: string,
   *   parentSha: string
   * }} input
   */
  async createCommit({ owner, repository, message, treeSha, parentSha }) {
    const data = await this.request(
      `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repository)}/git/commits`,
      {
        method: 'POST',
        body: JSON.stringify({
          message,
          tree: treeSha,
          parents: [parentSha]
        })
      }
    );

    return data.sha;
  }

  /**
   * @param {{ owner: string, repository: string, branch: string, commitSha: string }} input
   */
  async updateBranch({ owner, repository, branch, commitSha }) {
    await this.request(
      `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repository)}` +
      `/git/refs/heads/${encodeURIComponent(branch)}`,
      {
        method: 'PATCH',
        body: JSON.stringify({
          sha: commitSha,
          force: false
        })
      }
    );
  }
}

/**
 * @param {Record<string, string | undefined>} environment
 * @param {{ fetchImpl?: typeof fetch }} [dependencies]
 */
export function createGitHubAuthoringRepositoryFromEnvironment(
  environment,
  dependencies = {}
) {
  const config = parseGitHubAuthoringRepositoryConfig(environment);
  const transport = new GitHubRestAuthoringTransport({
    token: config.token,
    fetchImpl: dependencies.fetchImpl
  });

  return new GitHubAuthoringRepository({
    repository: config.repository,
    branch: config.branch,
    writableRoots: config.writableRoots,
    transport
  });
}
