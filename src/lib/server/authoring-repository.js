import { createHash } from 'node:crypto';
import {
  lstatSync,
  readFileSync,
  realpathSync,
  unlinkSync,
  writeFileSync
} from 'node:fs';
import path from 'node:path';

import {
  AuthoringChangeSetError,
  AuthoringRepositoryPathError,
  AuthoringRevisionConflictError,
  normalizeAuthoringChanges,
  normalizeAuthoringPath
} from './authoring-repository-boundary.js';

export {
  AuthoringChangeSetError,
  AuthoringRepositoryPathError,
  AuthoringRevisionConflictError,
  normalizeAuthoringChanges,
  normalizeAuthoringPath
} from './authoring-repository-boundary.js';

/** @param {Buffer} content */
export function authoringRevision(content) {
  return `sha256:${createHash('sha256').update(content).digest('hex')}`;
}

/**
 * Build one deterministic revision for an explicit path/revision snapshot.
 *
 * @param {Array<{
 *   path: string,
 *   revision: string | null
 * }>} entries
 * @returns {string}
 */
export function authoringChangeSetRevision(entries) {
  if (
    !Array.isArray(entries) ||
    entries.length === 0
  ) {
    throw new AuthoringChangeSetError(
      'Authoring change-set revision requires at least one path.'
    );
  }

  const normalized =
    entries.map((entry) => {
      if (
        entry === null ||
        typeof entry !== 'object'
      ) {
        throw new AuthoringChangeSetError(
          'Authoring change-set revision entries must be objects.'
        );
      }

      const normalizedPath =
        normalizeAuthoringPath(
          entry.path
        );

      if (
        entry.revision !== null &&
        typeof entry.revision !==
          'string'
      ) {
        throw new TypeError(
          'Authoring snapshot revision must be a string or null.'
        );
      }

      return {
        path: normalizedPath,
        revision: entry.revision
      };
    });

  const paths =
    normalized.map(
      (entry) => entry.path
    );

  if (
    new Set(paths).size !==
    paths.length
  ) {
    throw new AuthoringChangeSetError(
      'Authoring change-set revision paths must be unique.'
    );
  }

  const digest =
    createHash('sha256');

  for (const entry of
    [...normalized].sort(
      (left, right) =>
        left.path.localeCompare(
          right.path
        )
    )) {
    digest.update(entry.path);
    digest.update('\0');
    digest.update(
      entry.revision === null
        ? 'absent'
        : entry.revision
    );
    digest.update('\0');
  }

  return `changeset-sha256:${digest.digest('hex')}`;
}

/**
 * Local Studio filesystem implementation of the ADR 0008 AuthoringRepository
 * boundary.
 *
 * This adapter is intentionally local-only. Hosted Studio must receive a
 * different adapter explicitly; there is no runtime fallback from hosted
 * authoring to this filesystem implementation.
 *
 * Multi-file Local mutations use a deterministic snapshot revision over only
 * the paths participating in the logical change set. The filesystem cannot
 * provide a true multi-path transactional visibility primitive, so writes are
 * applied with rollback-on-failure semantics. A successful call leaves the
 * complete change set applied; a synchronous failure attempts to restore every
 * touched path to its pre-mutation state.
 */
export class LocalFilesystemAuthoringRepository {
  /**
   * @param {string} projectRoot
   */
  constructor(projectRoot) {
    this.projectRoot = realpathSync(projectRoot);
  }

  /**
   * @param {string} relativePath
   * @returns {{ relativePath: string, absolutePath: string }}
   */
  resolve(relativePath) {
    const normalized = normalizeAuthoringPath(relativePath);
    const segments = normalized.split('/');
    const absolutePath = path.resolve(this.projectRoot, ...segments);
    const relativeToRoot = path.relative(this.projectRoot, absolutePath);

    if (
      relativeToRoot === '..' ||
      relativeToRoot.startsWith(`..${path.sep}`) ||
      path.isAbsolute(relativeToRoot)
    ) {
      throw new AuthoringRepositoryPathError('Authoring path escapes the project root.');
    }

    let cursor = this.projectRoot;

    for (const segment of segments) {
      cursor = path.join(cursor, segment);

      try {
        const stat = lstatSync(cursor);

        if (stat.isSymbolicLink()) {
          throw new AuthoringRepositoryPathError(
            `Authoring path must not traverse symbolic links: ${normalized}`
          );
        }
      } catch (error) {
        const code = /** @type {NodeJS.ErrnoException} */ (error).code;

        if (
          error instanceof AuthoringRepositoryPathError ||
          code !== 'ENOENT'
        ) {
          throw error;
        }

        break;
      }
    }

    return {
      relativePath: normalized,
      absolutePath
    };
  }

  /**
   * @param {string} relativePath
   * @returns {{ content: string, revision: string }}
   */
  readText(relativePath) {
    const { absolutePath } = this.resolve(relativePath);
    const content = readFileSync(absolutePath);

    return {
      content: content.toString('utf8'),
      revision: authoringRevision(content)
    };
  }

  /**
   * @param {string} relativePath
   * @returns {{ content: Buffer, revision: string }}
   */
  readBinary(relativePath) {
    const { absolutePath } = this.resolve(relativePath);
    const content = readFileSync(absolutePath);

    return {
      content,
      revision: authoringRevision(content)
    };
  }

  /**
   * Legacy single-file revision used by existing Local Studio callers.
   *
   * @param {string} relativePath
   * @returns {string | null}
   */
  revision(relativePath) {
    const { absolutePath } = this.resolve(relativePath);

    try {
      return authoringRevision(readFileSync(absolutePath));
    } catch (error) {
      const code = /** @type {NodeJS.ErrnoException} */ (error).code;

      if (code === 'ENOENT') {
        return null;
      }

      throw error;
    }
  }

  /**
   * Build one deterministic Local snapshot revision for exactly the paths
   * involved in a logical change set. Unrelated project files intentionally
   * do not affect this token.
   *
   * @param {string[]} relativePaths
   * @returns {string}
   */
  revisionForPaths(relativePaths) {
    if (
      !Array.isArray(relativePaths) ||
      relativePaths.length === 0
    ) {
      throw new AuthoringChangeSetError(
        'Local authoring snapshot requires at least one path.'
      );
    }

    const normalizedPaths =
      relativePaths.map(
        (relativePath) =>
          normalizeAuthoringPath(relativePath)
      );

    if (
      new Set(normalizedPaths).size !==
      normalizedPaths.length
    ) {
      throw new AuthoringChangeSetError(
        'Local authoring snapshot paths must be unique.'
      );
    }

    return authoringChangeSetRevision(
      normalizedPaths.map(
        (relativePath) => ({
          path: relativePath,
          revision:
            this.revision(
              relativePath
            )
        })
      )
    );
  }

  /**
   * @param {string} relativePath
   * @param {string | null} expectedRevision
   */
  assertExpectedRevision(relativePath, expectedRevision) {
    const actualRevision = this.revision(relativePath);

    if (actualRevision !== expectedRevision) {
      throw new AuthoringRevisionConflictError(
        relativePath,
        expectedRevision,
        actualRevision
      );
    }
  }

  /**
   * Apply one logical Local mutation.
   *
   * All paths and content variants are normalized before any write begins.
   * The expected revision covers the complete path set. Existing bytes are
   * captured before mutation so synchronous failures can be rolled back.
   *
   * @param {unknown} changes
   * @param {{ expectedRevision: string }} options
   * @returns {{ revision: string }}
   */
  applyChanges(changes, options) {
    const normalized =
      normalizeAuthoringChanges(changes);

    if (
      !options ||
      typeof options.expectedRevision !==
        'string'
    ) {
      throw new TypeError(
        'Local authoring change sets require an expected revision.'
      );
    }

    const paths =
      normalized.map(
        (change) => change.path
      );

    const actualRevision =
      this.revisionForPaths(paths);

    if (
      actualRevision !==
      options.expectedRevision
    ) {
      throw new AuthoringRevisionConflictError(
        paths.join(', '),
        options.expectedRevision,
        actualRevision
      );
    }

    const prepared =
      normalized.map((change) => {
        const resolved =
          this.resolve(change.path);

        let previousContent = null;
        let existed = true;

        try {
          previousContent =
            readFileSync(
              resolved.absolutePath
            );
        } catch (error) {
          const code =
            /** @type {NodeJS.ErrnoException} */ (
              error
            ).code;

          if (code !== 'ENOENT') {
            throw error;
          }

          existed = false;
        }

        if (
          change.type === 'delete' &&
          !existed
        ) {
          readFileSync(
            resolved.absolutePath
          );
        }

        return {
          change,
          absolutePath:
            resolved.absolutePath,
          existed,
          previousContent
        };
      });

    const applied = [];

    try {
      for (const entry of prepared) {
        const { change, absolutePath } =
          entry;

        /*
         * Include the current operation in rollback responsibility before
         * invoking the filesystem primitive. A failed write may have changed
         * bytes before reporting failure.
         */
        applied.push(entry);

        if (change.type === 'delete') {
          unlinkSync(absolutePath);
        } else if (
          change.type === 'text'
        ) {
          writeFileSync(
            absolutePath,
            Buffer.from(
              change.content,
              'utf8'
            )
          );
        } else {
          writeFileSync(
            absolutePath,
            change.content
          );
        }
      }
    } catch (error) {
      const rollbackErrors = [];

      for (const entry of
        [...applied].reverse()) {
        try {
          if (entry.existed) {
            writeFileSync(
              entry.absolutePath,
              /** @type {Buffer} */ (
                entry.previousContent
              )
            );
          } else {
            try {
              unlinkSync(
                entry.absolutePath
              );
            } catch (rollbackError) {
              const code =
                /** @type {NodeJS.ErrnoException} */ (
                  rollbackError
                ).code;

              if (code !== 'ENOENT') {
                throw rollbackError;
              }
            }
          }
        } catch (rollbackError) {
          rollbackErrors.push(
            rollbackError
          );
        }
      }

      if (rollbackErrors.length > 0) {
        throw new AggregateError(
          [error, ...rollbackErrors],
          'Local authoring change set failed and rollback was incomplete.'
        );
      }

      throw error;
    }

    return {
      revision:
        this.revisionForPaths(paths)
    };
  }

  /**
   * Backward-compatible single-file text write.
   *
   * @param {string} relativePath
   * @param {string} content
   * @param {{ expectedRevision?: string | null }} [options]
   * @returns {{ revision: string }}
   */
  writeText(relativePath, content, options = {}) {
    if (typeof content !== 'string') {
      throw new TypeError('Authoring text content must be a string.');
    }

    const normalizedPath =
      normalizeAuthoringPath(
        relativePath
      );

    const hasExpectedRevision =
      Object.prototype.hasOwnProperty.call(
        options,
        'expectedRevision'
      );

    const fileExpectedRevision =
      hasExpectedRevision
        ? options.expectedRevision
        : this.revision(
            normalizedPath
          );

    if (
      fileExpectedRevision !== null &&
      typeof fileExpectedRevision !==
        'string'
    ) {
      throw new TypeError(
        'Expected authoring revision must be a string or null.'
      );
    }

    const expectedRevision =
      authoringChangeSetRevision([
        {
          path: normalizedPath,
          revision:
            fileExpectedRevision
        }
      ]);

    this.applyChanges(
      [
        {
          type: 'text',
          path: normalizedPath,
          content
        }
      ],
      { expectedRevision }
    );

    return {
      revision:
        /** @type {string} */ (
          this.revision(relativePath)
        )
    };
  }

  /**
   * Backward-compatible single-file binary write.
   *
   * @param {string} relativePath
   * @param {Buffer} content
   * @param {{ expectedRevision?: string | null }} [options]
   * @returns {{ revision: string }}
   */
  writeBinary(relativePath, content, options = {}) {
    if (!Buffer.isBuffer(content)) {
      throw new TypeError(
        'Authoring binary content must be a Buffer.'
      );
    }

    const normalizedPath =
      normalizeAuthoringPath(
        relativePath
      );

    const hasExpectedRevision =
      Object.prototype.hasOwnProperty.call(
        options,
        'expectedRevision'
      );

    const fileExpectedRevision =
      hasExpectedRevision
        ? options.expectedRevision
        : this.revision(
            normalizedPath
          );

    if (
      fileExpectedRevision !== null &&
      typeof fileExpectedRevision !==
        'string'
    ) {
      throw new TypeError(
        'Expected authoring revision must be a string or null.'
      );
    }

    const expectedRevision =
      authoringChangeSetRevision([
        {
          path: normalizedPath,
          revision:
            fileExpectedRevision
        }
      ]);

    this.applyChanges(
      [
        {
          type: 'binary',
          path: normalizedPath,
          content
        }
      ],
      { expectedRevision }
    );

    return {
      revision:
        /** @type {string} */ (
          this.revision(relativePath)
        )
    };
  }

  /**
   * Backward-compatible single-file delete.
   *
   * @param {string} relativePath
   * @param {{ expectedRevision?: string | null }} [options]
   * @returns {{ revision: null }}
   */
  delete(relativePath, options = {}) {
    const normalizedPath =
      normalizeAuthoringPath(
        relativePath
      );

    const hasExpectedRevision =
      Object.prototype.hasOwnProperty.call(
        options,
        'expectedRevision'
      );

    const fileExpectedRevision =
      hasExpectedRevision
        ? options.expectedRevision
        : this.revision(
            normalizedPath
          );

    if (
      fileExpectedRevision !== null &&
      typeof fileExpectedRevision !==
        'string'
    ) {
      throw new TypeError(
        'Expected authoring revision must be a string or null.'
      );
    }

    const expectedRevision =
      authoringChangeSetRevision([
        {
          path: normalizedPath,
          revision:
            fileExpectedRevision
        }
      ]);

    this.applyChanges(
      [
        {
          type: 'delete',
          path: normalizedPath
        }
      ],
      { expectedRevision }
    );

    return {
      revision: null
    };
  }
}
