import path from 'node:path';

export class AuthoringRepositoryPathError
  extends Error {
  /**
   * @param {string} message
   */
  constructor(message) {
    super(message);
    this.name =
      'AuthoringRepositoryPathError';
    this.code = 'AUTHORING_PATH_INVALID';
  }
}

export class AuthoringRevisionConflictError
  extends Error {
  /**
   * @param {string} relativePath
   * @param {string | null} expectedRevision
   * @param {string | null} actualRevision
   */
  constructor(
    relativePath,
    expectedRevision,
    actualRevision
  ) {
    super(
      `Stale authoring revision for ${relativePath}.`
    );
    this.name =
      'AuthoringRevisionConflictError';
    this.code =
      'AUTHORING_REVISION_CONFLICT';
    this.relativePath = relativePath;
    this.expectedRevision =
      expectedRevision;
    this.actualRevision =
      actualRevision;
  }
}

/**
 * Normalize an authoring path without permitting callers to
 * escape the project/repository namespace.
 *
 * This boundary is shared by Local and Hosted adapters and contains
 * no filesystem implementation or credential-bearing transport.
 *
 * @param {string} relativePath
 * @returns {string}
 */
export function normalizeAuthoringPath(
  relativePath
) {
  if (
    typeof relativePath !== 'string' ||
    relativePath.length === 0
  ) {
    throw new AuthoringRepositoryPathError(
      'Authoring path must be a non-empty string.'
    );
  }

  if (relativePath.includes('\0')) {
    throw new AuthoringRepositoryPathError(
      'Authoring path must not contain NUL bytes.'
    );
  }

  const portablePath =
    relativePath.replaceAll('\\', '/');

  if (
    portablePath.startsWith('/') ||
    portablePath.startsWith('//') ||
    /^[A-Za-z]:\//.test(portablePath) ||
    path.isAbsolute(relativePath)
  ) {
    throw new AuthoringRepositoryPathError(
      'Authoring path must be project-relative.'
    );
  }

  const segments =
    portablePath.split('/');

  if (
    segments.some(
      (segment) => segment === '..'
    ) ||
    segments.some(
      (segment) => segment === ''
    )
  ) {
    throw new AuthoringRepositoryPathError(
      'Authoring path must not contain traversal or empty segments.'
    );
  }

  const normalized =
    segments
      .filter(
        (segment) => segment !== '.'
      )
      .join('/');

  if (!normalized) {
    throw new AuthoringRepositoryPathError(
      'Authoring path must identify a project file.'
    );
  }

  return normalized;
}
