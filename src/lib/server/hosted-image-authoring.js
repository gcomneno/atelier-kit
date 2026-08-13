import {
  AuthoringRevisionConflictError,
  normalizeAuthoringChanges,
  normalizeAuthoringPath
} from './authoring-repository-boundary.js';
import {
  commitShaFromGitHubRevision
} from './github-authoring-repository.js';
import {
  validateHostedImageUpload
} from './hosted-image-upload.js';

const SLOT_BRAND =
  new WeakSet();

const ADMITTED_EXTENSIONS =
  Object.freeze([
    'jpg',
    'png',
    'webp'
  ]);

/**
 * @param {Record<string, unknown>} object
 * @param {string} property
 * @returns {unknown}
 */
function getOwnDataPropertyValue(
  object,
  property
) {
  const descriptor =
    Object.getOwnPropertyDescriptor(
      object,
      property
    );

  return descriptor &&
    'value' in descriptor
    ? descriptor.value
    : undefined;
}

/**
 * @typedef {(typeof HOSTED_IMAGE_SLOTS)[keyof typeof HOSTED_IMAGE_SLOTS]} HostedImageSlot
 * @typedef {(publicPath: string) => string | Promise<string>} BuildRelatedTextContent
 * @typedef {{
 *   applyChanges(
 *     changes: unknown,
 *     options: {
 *       expectedRevision: string,
 *       message: string
 *     }
 *   ): Promise<{
 *     revision: string
 *   }>
 * }} RepositoryWithApplyChanges
 */

export class HostedImageAuthoringPolicyError
  extends Error {
  constructor() {
    super(
      'Hosted image authoring policy is invalid.'
    );
    this.name =
      'HostedImageAuthoringPolicyError';
    this.code =
      'HOSTED_IMAGE_AUTHORING_POLICY_INVALID';
  }
}

export class HostedImageAuthoringValidationError
  extends Error {
  constructor() {
    super(
      'Hosted image authoring input is invalid.'
    );
    this.name =
      'HostedImageAuthoringValidationError';
    this.code =
      'HOSTED_IMAGE_AUTHORING_VALIDATION_FAILED';
  }
}

export class HostedImageAuthoringWriteError
  extends Error {
  constructor() {
    super(
      'Hosted image authoring write failed.'
    );
    this.name =
      'HostedImageAuthoringWriteError';
    this.code =
      'HOSTED_IMAGE_AUTHORING_WRITE_FAILED';
  }
}

/**
 * @param {{
 *   id: string,
 *   repositoryDirectory: string,
 *   publicDirectory: string,
 *   basename: string,
 *   relatedPath: string,
 *   commitMessage: string
 * }} input
 */
function createHostedImageSlot({
  id,
  repositoryDirectory,
  publicDirectory,
  basename,
  relatedPath,
  commitMessage
}) {
  if (
    typeof id !== 'string' ||
    !/^[a-z][a-z0-9-]*$/.test(id) ||
    typeof basename !== 'string' ||
    !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(
      basename
    ) ||
    typeof publicDirectory !== 'string' ||
    !/^\/images(?:\/[a-z0-9-]+)+$/.test(
      publicDirectory
    ) ||
    typeof commitMessage !== 'string' ||
    commitMessage.length === 0 ||
    commitMessage.trim() !==
      commitMessage
  ) {
    throw new HostedImageAuthoringPolicyError();
  }

  let normalizedRepositoryDirectory;
  let normalizedRelatedPath;

  try {
    normalizedRepositoryDirectory =
      normalizeAuthoringPath(
        repositoryDirectory
      );

    normalizedRelatedPath =
      normalizeAuthoringPath(
        relatedPath
      );
  } catch {
    throw new HostedImageAuthoringPolicyError();
  }

  if (
    !normalizedRepositoryDirectory.startsWith(
      'static/images/'
    )
  ) {
    throw new HostedImageAuthoringPolicyError();
  }

  const slot =
    Object.freeze({
      id,
      repositoryDirectory:
        normalizedRepositoryDirectory,
      publicDirectory,
      basename,
      relatedPath:
        normalizedRelatedPath,
      commitMessage
    });

  SLOT_BRAND.add(slot);

  return slot;
}

export const HOSTED_IMAGE_SLOTS =
  Object.freeze({
    siteHeaderLogo:
      createHostedImageSlot({
        id: 'site-header-logo',
        repositoryDirectory:
          'static/images/site',
        publicDirectory:
          '/images/site',
        basename:
          'header-logo',
        relatedPath:
          'config/site.yaml',
        commitMessage:
          'studio: update header logo'
      }),

    siteFavicon:
      createHostedImageSlot({
        id: 'site-favicon',
        repositoryDirectory:
          'static/images/site',
        publicDirectory:
          '/images/site',
        basename:
          'favicon',
        relatedPath:
          'config/site.yaml',
        commitMessage:
          'studio: update favicon'
      }),

    siteHeroBanner:
      createHostedImageSlot({
        id: 'site-hero-banner',
        repositoryDirectory:
          'static/images/site',
        publicDirectory:
          '/images/site',
        basename:
          'hero-banner',
        relatedPath:
          'config/site.yaml',
        commitMessage:
          'studio: update hero banner'
      }),

    siteBackground:
      createHostedImageSlot({
        id: 'site-background',
        repositoryDirectory:
          'static/images/site',
        publicDirectory:
          '/images/site',
        basename:
          'background',
        relatedPath:
          'config/site.yaml',
        commitMessage:
          'studio: update site background'
      })
  });

/**
 * Plain objects cannot mint image-destination authority.
 *
 * @param {unknown} value
 * @returns {boolean}
 */
export function isHostedImageSlot(
  value
) {
  return (
    value !== null &&
    typeof value === 'object' &&
    SLOT_BRAND.has(
      /** @type {object} */ (
        value
      )
    )
  );
}

/**
 * @param {unknown} slot
 * @param {unknown} extension
 * @returns {{
 *   repositoryPath: string,
 *   publicPath: string
 * }}
 */
export function resolveHostedImageDestination(
  slot,
  extension
) {
  if (
    !isHostedImageSlot(slot) ||
    typeof extension !== 'string' ||
    !ADMITTED_EXTENSIONS.includes(
      extension
    )
  ) {
    throw new HostedImageAuthoringPolicyError();
  }

  const trustedSlot =
    /** @type {HostedImageSlot} */ (
      slot
    );

  const repositoryPath =
    normalizeAuthoringPath(
      `${trustedSlot.repositoryDirectory}/${trustedSlot.basename}.${extension}`
    );

  return Object.freeze({
    repositoryPath,
    publicPath:
      `${trustedSlot.publicDirectory}/${trustedSlot.basename}.${extension}`
  });
}

/**
 * An existing asset can become delete authority only when its public path
 * exactly identifies one admitted extension of the same server-owned slot.
 *
 * The caller must obtain this value from trusted repository state, not from
 * browser form data.
 *
 * @param {unknown} slot
 * @param {unknown} publicPath
 * @returns {{
 *   repositoryPath: string,
 *   publicPath: string
 * } | null}
 */
export function resolveHostedImageCurrentPath(
  slot,
  publicPath
) {
  if (
    !isHostedImageSlot(slot) ||
    typeof publicPath !== 'string' ||
    publicPath.length === 0
  ) {
    throw new HostedImageAuthoringValidationError();
  }

  for (const extension of
    ADMITTED_EXTENSIONS) {
    const destination =
      resolveHostedImageDestination(
        slot,
        extension
      );

    if (
      destination.publicPath ===
      publicPath
    ) {
      return destination;
    }
  }

  throw new HostedImageAuthoringValidationError();
}

/**
 * @param {unknown} value
 * @returns {boolean}
 */
function hasMeaningfulHostedImageCurrentPath(
  value
) {
  return (
    typeof value === 'string' &&
    value.length > 0
  );
}

/**
 * Apply one Hosted image-bearing logical mutation.
 *
 * Repository, branch and writable roots belong to the repository instance.
 * Destination directory, basename, related document path and commit message
 * belong to the branded server-side slot. The related document is produced by
 * a server-only callback after the authoritative next public image path has
 * been derived.
 *
 * @param {{
 *   repository: unknown,
 *   slot: unknown,
 *   operation: 'create' | 'replace' | 'remove',
 *   upload?: File | null,
 *   currentPublicPath?: unknown,
 *   expectedRevision: unknown,
 *   buildRelatedTextContent: unknown
 * }} input
 * @returns {Promise<Readonly<{
 *   publicPath: string,
 *   authoringRevision: string
 * }>>}
 */
export async function applyHostedImageAuthoringMutation(input) {
  if (
    input === null ||
    typeof input !== 'object'
  ) {
    throw new HostedImageAuthoringValidationError();
  }

  const inputRecord =
    /** @type {Record<string, unknown>} */ (
      input
    );

  /** @param {string} property */
  const hasOwnProperty =
    (property) =>
      Object.prototype.hasOwnProperty.call(
        inputRecord,
        property
      );

  const repository =
    hasOwnProperty('repository')
      ? getOwnDataPropertyValue(
          inputRecord,
          'repository'
        )
      : undefined;

  const slot =
    hasOwnProperty('slot')
      ? getOwnDataPropertyValue(
          inputRecord,
          'slot'
        )
      : undefined;

  const operation =
    hasOwnProperty('operation')
      ? getOwnDataPropertyValue(
          inputRecord,
          'operation'
        )
      : undefined;

  const expectedRevision =
    hasOwnProperty('expectedRevision')
      ? getOwnDataPropertyValue(
          inputRecord,
          'expectedRevision'
        )
      : undefined;

  const buildRelatedTextContent =
    hasOwnProperty(
      'buildRelatedTextContent'
    )
      ? getOwnDataPropertyValue(
          inputRecord,
          'buildRelatedTextContent'
        )
      : undefined;

  const hasUpload =
    hasOwnProperty(
      'upload'
    );

  const upload =
    hasUpload
      ? getOwnDataPropertyValue(
          inputRecord,
          'upload'
        )
      : undefined;

  const hasCurrentPublicPath =
    hasOwnProperty(
      'currentPublicPath'
    );

  const currentPublicPath =
    hasCurrentPublicPath
      ? getOwnDataPropertyValue(
          inputRecord,
          'currentPublicPath'
        )
      : undefined;

  const hasRemoveProperty =
    hasOwnProperty(
      'remove'
    );

  if (
    !isHostedImageSlot(slot) ||
    typeof operation !== 'string' ||
    !['create', 'replace', 'remove'].includes(
      operation
    ) ||
    hasRemoveProperty ||
    typeof buildRelatedTextContent !==
      'function'
  ) {
    throw new HostedImageAuthoringValidationError();
  }

  if (
    operation === 'create'
      ? !hasUpload ||
        !(upload instanceof File) ||
        hasCurrentPublicPath
      : operation === 'replace'
        ? !hasUpload ||
          !(upload instanceof File) ||
          !hasCurrentPublicPath
        : hasUpload ||
          !hasCurrentPublicPath
  ) {
    throw new HostedImageAuthoringValidationError();
  }

  if (
    typeof expectedRevision !==
      'string'
  ) {
    throw new HostedImageAuthoringValidationError();
  }

  try {
    commitShaFromGitHubRevision(
      expectedRevision
    );
  } catch {
    throw new HostedImageAuthoringValidationError();
  }

  /*
   * Validation of untrusted bytes completes before repository mutation
   * authority is consulted.
   */
  const validated =
    upload === undefined
      ? null
      : await validateHostedImageUpload(
          /** @type {File} */ (
            upload
          )
        );

  const destination =
    validated === null
      ? null
      : resolveHostedImageDestination(
          slot,
          validated.extension
        );

  const nextPublicPath =
    destination?.publicPath ?? '';

  const current =
    operation === 'create'
      ? null
      : resolveHostedImageCurrentPath(
          slot,
          currentPublicPath
        );

  let relatedContent;

  try {
    const buildRelatedTextContentFn =
      /** @type {BuildRelatedTextContent} */ (
        buildRelatedTextContent
      );

    relatedContent =
      await buildRelatedTextContentFn(
        nextPublicPath
      );
  } catch {
    throw new HostedImageAuthoringValidationError();
  }

  if (
    typeof relatedContent !== 'string'
  ) {
    throw new HostedImageAuthoringValidationError();
  }

  const trustedSlot =
    /** @type {HostedImageSlot} */ (
      slot
    );

  /** @type {Array<
   *   | {
   *       type: 'text',
   *       path: string,
   *       content: string
   *     }
   *   | {
   *       type: 'binary',
   *       path: string,
   *       content: Buffer
   *     }
   *   | {
   *       type: 'delete',
   *       path: string
   *     }
   * >} */
  const changes = [
    {
      type: 'text',
      path:
        trustedSlot.relatedPath,
      content:
        relatedContent
    }
  ];

  if (
    validated !== null &&
    destination !== null
  ) {
    changes.push({
      type: 'binary',
      path:
        destination.repositoryPath,
      content:
        validated.copyBytes()
    });

    if (
      current !== null &&
      current.repositoryPath !==
        destination.repositoryPath
    ) {
      changes.push({
        type: 'delete',
        path:
          current.repositoryPath
      });
    }
  } else if (
    operation === 'remove'
  ) {
    if (current === null) {
      throw new HostedImageAuthoringValidationError();
    }

    changes.push({
      type: 'delete',
      path:
        current.repositoryPath
    });
  }

  let normalizedChanges;

  try {
    normalizedChanges =
      normalizeAuthoringChanges(
        changes
      );
  } catch {
    throw new HostedImageAuthoringValidationError();
  }

  if (
    repository === null ||
    typeof repository !== 'object'
  ) {
    throw new HostedImageAuthoringWriteError();
  }

  const repositoryRecord =
    /** @type {Record<string, unknown>} */ (
      repository
    );

  if (
    typeof repositoryRecord.applyChanges !==
      'function'
  ) {
    throw new HostedImageAuthoringWriteError();
  }

  const repositoryWithApplyChanges =
    /** @type {RepositoryWithApplyChanges} */ (
      repositoryRecord
    );

  try {
    const result =
      await repositoryWithApplyChanges.applyChanges(
        normalizedChanges,
        {
          expectedRevision,
          message:
            trustedSlot.commitMessage
        }
      );

    if (
      result === null ||
      typeof result !== 'object' ||
      typeof result.revision !==
        'string'
    ) {
      throw new HostedImageAuthoringWriteError();
    }

    commitShaFromGitHubRevision(
      result.revision
    );

    return Object.freeze({
      publicPath:
        nextPublicPath,
      authoringRevision:
        result.revision
    });
  } catch (error) {
    if (
      error instanceof
        AuthoringRevisionConflictError
    ) {
      throw error;
    }

    if (
      error instanceof
        HostedImageAuthoringWriteError
    ) {
      throw error;
    }

    throw new HostedImageAuthoringWriteError();
  }
}
