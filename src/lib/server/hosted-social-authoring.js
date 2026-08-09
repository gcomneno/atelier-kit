import {
  AuthoringRevisionConflictError
} from './authoring-repository-boundary.js';
import {
  commitShaFromGitHubRevision,
  createGitHubAuthoringRepositoryFromEnvironment
} from './github-authoring-repository.js';
import {
  isTrustedHostedRequestContext
} from './hosted-request-context.js';
import {
  SOCIAL_AUTHORING_PATH,
  buildSocialAuthoringDocumentFromFormData,
  parseSocialAuthoringDocument,
  serializeSocialAuthoringDocument
} from './social-authoring.js';
import {
  STUDIO_RUNTIME_MODES
} from '../studio-runtime.js';

export class HostedSocialAuthoringReadError
  extends Error {
  constructor() {
    super('Hosted Social authoring is unavailable.');
    this.name = 'HostedSocialAuthoringReadError';
    this.code =
      'HOSTED_SOCIAL_AUTHORING_READ_FAILED';
  }
}

/**
 * Read the one Hosted authoring document admitted by issue #273.
 *
 * The repository target remains entirely server-configured.
 * Browser-visible output is deliberately restricted to normalized
 * Social form data plus the opaque optimistic-concurrency revision.
 *
 * @param {{
 *   runtimeMode: unknown,
 *   hostedContext: unknown,
 *   environment?: Record<string, string | undefined>,
 *   repositoryFactory?: (
 *     environment: Record<string, string | undefined>
 *   ) => {
 *     readText(path: string): Promise<{
 *       content: string,
 *       revision: string
 *     }>
 *   }
 * }} input
 */
export async function loadHostedSocialAuthoringData({
  runtimeMode,
  hostedContext,
  environment = process.env,
  repositoryFactory =
    createGitHubAuthoringRepositoryFromEnvironment
}) {
  if (
    runtimeMode !== STUDIO_RUNTIME_MODES.HOSTED ||
    !isTrustedHostedRequestContext(hostedContext) ||
    environment === null ||
    typeof environment !== 'object' ||
    Array.isArray(environment) ||
    typeof repositoryFactory !== 'function'
  ) {
    throw new HostedSocialAuthoringReadError();
  }

  try {
    const repository =
      repositoryFactory(environment);

    if (
      repository === null ||
      typeof repository !== 'object' ||
      typeof repository.readText !== 'function'
    ) {
      throw new HostedSocialAuthoringReadError();
    }

    const result =
      await repository.readText(
        SOCIAL_AUTHORING_PATH
      );

    if (
      result === null ||
      typeof result !== 'object' ||
      typeof result.content !== 'string' ||
      typeof result.revision !== 'string'
    ) {
      throw new HostedSocialAuthoringReadError();
    }

    /*
     * Validate the revision before allowing it to cross the
     * browser boundary. The SHA itself is concurrency state,
     * not repository authority.
     */
    commitShaFromGitHubRevision(
      result.revision
    );

    const parsed =
      parseSocialAuthoringDocument(
        result.content
      );

    return Object.freeze({
      socialForm:
        Object.freeze({
          ...parsed.form
        }),
      authoringRevision:
        result.revision
    });
  } catch {
    /*
     * Never reflect repository configuration, token values,
     * transport payloads or parser diagnostics to route callers.
     */
    throw new HostedSocialAuthoringReadError();
  }
}

export class HostedSocialAuthoringValidationError
  extends Error {
  /**
   * @param {string} invalidId
   */
  constructor(invalidId) {
    super('Hosted Social authoring input is invalid.');
    this.name =
      'HostedSocialAuthoringValidationError';
    this.code =
      'HOSTED_SOCIAL_AUTHORING_VALIDATION_FAILED';
    this.invalidId = invalidId;
  }
}

export class HostedSocialAuthoringRevisionError
  extends Error {
  constructor() {
    super('Hosted Social authoring revision is invalid.');
    this.name =
      'HostedSocialAuthoringRevisionError';
    this.code =
      'HOSTED_SOCIAL_AUTHORING_REVISION_INVALID';
  }
}

export class HostedSocialAuthoringWriteError
  extends Error {
  constructor() {
    super('Hosted Social authoring write failed.');
    this.name =
      'HostedSocialAuthoringWriteError';
    this.code =
      'HOSTED_SOCIAL_AUTHORING_WRITE_FAILED';
  }
}

/**
 * Validate and commit the one mutation admitted by issue #273.
 *
 * Validation and serialization complete before repository mutation
 * begins. Path, repository, branch and commit message are all fixed
 * server-side.
 *
 * AuthoringRevisionConflictError deliberately crosses this internal
 * boundary so the HTTP adapter can return a controlled 409 without
 * leaking GitHub transport/configuration details.
 *
 * @param {{
 *   runtimeMode: unknown,
 *   hostedContext: unknown,
 *   formData: unknown,
 *   expectedRevision: unknown,
 *   environment?: Record<string, string | undefined>,
 *   repositoryFactory?: (
 *     environment: Record<string, string | undefined>
 *   ) => {
 *     writeText(
 *       path: string,
 *       content: string,
 *       options: {
 *         expectedRevision: string,
 *         message: string
 *       }
 *     ): Promise<{ revision: string }>
 *   }
 * }} input
 */
export async function saveHostedSocialAuthoringData({
  runtimeMode,
  hostedContext,
  formData,
  expectedRevision,
  environment = process.env,
  repositoryFactory =
    createGitHubAuthoringRepositoryFromEnvironment
}) {
  if (
    runtimeMode !== STUDIO_RUNTIME_MODES.HOSTED ||
    !isTrustedHostedRequestContext(hostedContext) ||
    environment === null ||
    typeof environment !== 'object' ||
    Array.isArray(environment) ||
    typeof repositoryFactory !== 'function'
  ) {
    throw new HostedSocialAuthoringWriteError();
  }

  const social =
    buildSocialAuthoringDocumentFromFormData(
      formData
    );

  if (social.invalidId) {
    throw new HostedSocialAuthoringValidationError(
      social.invalidId
    );
  }

  if (social.document === null) {
    throw new HostedSocialAuthoringValidationError('');
  }

  /*
   * Canonical content is produced before repository/path/concurrency
   * authority is consulted.
   */
  const content =
    serializeSocialAuthoringDocument(
      social.document
    );

  if (typeof expectedRevision !== 'string') {
    throw new HostedSocialAuthoringRevisionError();
  }

  try {
    commitShaFromGitHubRevision(
      expectedRevision
    );
  } catch {
    throw new HostedSocialAuthoringRevisionError();
  }

  try {
    const repository =
      repositoryFactory(environment);

    if (
      repository === null ||
      typeof repository !== 'object' ||
      typeof repository.writeText !== 'function'
    ) {
      throw new HostedSocialAuthoringWriteError();
    }

    const result =
      await repository.writeText(
        SOCIAL_AUTHORING_PATH,
        content,
        {
          expectedRevision,
          message:
            'studio: update social links'
        }
      );

    if (
      result === null ||
      typeof result !== 'object' ||
      typeof result.revision !== 'string'
    ) {
      throw new HostedSocialAuthoringWriteError();
    }

    commitShaFromGitHubRevision(
      result.revision
    );

    return Object.freeze({
      socialForm:
        Object.freeze({
          ...social.form
        }),
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
        HostedSocialAuthoringWriteError
    ) {
      throw error;
    }

    throw new HostedSocialAuthoringWriteError();
  }
}
