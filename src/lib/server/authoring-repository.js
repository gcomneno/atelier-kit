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
  AuthoringRepositoryPathError,
  AuthoringRevisionConflictError,
  normalizeAuthoringPath
} from './authoring-repository-boundary.js';

export {
  AuthoringRepositoryPathError,
  AuthoringRevisionConflictError,
  normalizeAuthoringPath
} from './authoring-repository-boundary.js';

/** @param {Buffer} content */
export function authoringRevision(content) {
  return `sha256:${createHash('sha256').update(content).digest('hex')}`;
}

/**
 * Local Studio filesystem implementation of the ADR 0008 AuthoringRepository
 * boundary.
 *
 * This adapter is intentionally local-only. Hosted Studio must receive a
 * different adapter explicitly; there is no runtime fallback from hosted
 * authoring to this filesystem implementation.
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
   * @param {string} relativePath
   * @param {string} content
   * @param {{ expectedRevision?: string | null }} [options]
   * @returns {{ revision: string }}
   */
  writeText(relativePath, content, options = {}) {
    if (typeof content !== 'string') {
      throw new TypeError('Authoring text content must be a string.');
    }

    const { absolutePath } = this.resolve(relativePath);

    if (Object.prototype.hasOwnProperty.call(options, 'expectedRevision')) {
      const expectedRevision = options.expectedRevision;

      if (
        expectedRevision !== null &&
        typeof expectedRevision !== 'string'
      ) {
        throw new TypeError('Expected authoring revision must be a string or null.');
      }

      this.assertExpectedRevision(relativePath, expectedRevision);
    }

    const bytes = Buffer.from(content, 'utf8');
    writeFileSync(absolutePath, bytes);

    return {
      revision: authoringRevision(bytes)
    };
  }

  /**
   * @param {string} relativePath
   * @param {{ expectedRevision?: string | null }} [options]
   * @returns {{ revision: null }}
   */
  delete(relativePath, options = {}) {
    const { absolutePath } = this.resolve(relativePath);

    if (Object.prototype.hasOwnProperty.call(options, 'expectedRevision')) {
      const expectedRevision = options.expectedRevision;

      if (
        expectedRevision !== null &&
        typeof expectedRevision !== 'string'
      ) {
        throw new TypeError('Expected authoring revision must be a string or null.');
      }

      this.assertExpectedRevision(relativePath, expectedRevision);
    }

    unlinkSync(absolutePath);

    return {
      revision: null
    };
  }
}
