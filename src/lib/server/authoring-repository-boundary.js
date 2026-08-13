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

export class AuthoringChangeSetError
  extends Error {
  /**
   * @param {string} message
   */
  constructor(message) {
    super(message);
    this.name =
      'AuthoringChangeSetError';
    this.code =
      'AUTHORING_CHANGE_SET_INVALID';
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

/**
 * Normalize one logical repository mutation before any adapter-specific
 * persistence work begins.
 *
 * Supported variants:
 *
 * - `{ type: 'text', path, content: string }`
 * - `{ type: 'binary', path, content: Buffer }`
 * - `{ type: 'delete', path }`
 *
 * Duplicate paths are rejected after path normalization so one logical
 * mutation can never contain conflicting instructions for the same file.
 *
 * @param {unknown} rawChanges
 * @returns {Array<
 *   | { type: 'text', path: string, content: string }
 *   | { type: 'binary', path: string, content: Buffer }
 *   | { type: 'delete', path: string }
 * >}
 */
export function normalizeAuthoringChanges(
  rawChanges
) {
  if (
    !Array.isArray(rawChanges) ||
    rawChanges.length === 0
  ) {
    throw new AuthoringChangeSetError(
      'Authoring change set must contain at least one change.'
    );
  }

  const paths = new Set();

  /** @type {Array<
   *   | { type: 'text', path: string, content: string }
   *   | { type: 'binary', path: string, content: Buffer }
   *   | { type: 'delete', path: string }
   * >} */
  const normalized = [];

  for (const rawChange of rawChanges) {
    if (
      rawChange === null ||
      typeof rawChange !== 'object' ||
      Array.isArray(rawChange)
    ) {
      throw new AuthoringChangeSetError(
        'Every authoring change must be an object.'
      );
    }

    const change =
      /** @type {Record<string, unknown>} */ (
        rawChange
      );

    const normalizedPath =
      normalizeAuthoringPath(
        /** @type {string} */ (
          change.path
        )
      );

    if (paths.has(normalizedPath)) {
      throw new AuthoringChangeSetError(
        `Authoring change set contains duplicate path: ${normalizedPath}`
      );
    }

    paths.add(normalizedPath);

    if (change.type === 'text') {
      if (typeof change.content !== 'string') {
        throw new AuthoringChangeSetError(
          `Text authoring change requires string content: ${normalizedPath}`
        );
      }

      normalized.push({
        type: 'text',
        path: normalizedPath,
        content: change.content
      });

      continue;
    }

    if (change.type === 'binary') {
      if (!Buffer.isBuffer(change.content)) {
        throw new AuthoringChangeSetError(
          `Binary authoring change requires Buffer content: ${normalizedPath}`
        );
      }

      normalized.push({
        type: 'binary',
        path: normalizedPath,
        content: Buffer.from(change.content)
      });

      continue;
    }

    if (change.type === 'delete') {
      if (
        Object.prototype.hasOwnProperty.call(
          change,
          'content'
        )
      ) {
        throw new AuthoringChangeSetError(
          `Delete authoring change must not include content: ${normalizedPath}`
        );
      }

      normalized.push({
        type: 'delete',
        path: normalizedPath
      });

      continue;
    }

    throw new AuthoringChangeSetError(
      `Unsupported authoring change type for ${normalizedPath}.`
    );
  }

  return normalized;
}
