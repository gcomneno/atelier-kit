import {
  AuthoringRevisionConflictError
} from './authoring-repository-boundary.js';
import {
  commitShaFromGitHubRevision
} from './github-authoring-repository.js';
import {
  isTrustedDemoRequestContext
} from './demo-request-context.js';
import {
  createVerifiedDemoSandboxRepository
} from './demo-sandbox-target.js';
import {
  SOCIAL_AUTHORING_PATH,
  buildSocialAuthoringDocumentFromFormData,
  parseSocialAuthoringDocument,
  serializeSocialAuthoringDocument
} from './social-authoring.js';
import {
  STUDIO_RUNTIME_MODES
} from '../studio-runtime.js';

const DEMO_SOCIAL_COMMIT_MESSAGE =
  'demo: update social links';

export const DEMO_SOCIAL_RESET_COMMIT_MESSAGE =
  'demo: reset social links';

export const DEMO_SOCIAL_BASELINE =
  'social:\n  links: []\n';

export class DemoSocialAuthoringReadError
  extends Error {
  constructor() {
    super('Demo Social authoring is unavailable.');
    this.name =
      'DemoSocialAuthoringReadError';
    this.code =
      'DEMO_SOCIAL_AUTHORING_READ_FAILED';
  }
}

export class DemoSocialAuthoringValidationError
  extends Error {
  /**
   * @param {string} invalidId
   */
  constructor(invalidId) {
    super('Demo Social authoring input is invalid.');
    this.name =
      'DemoSocialAuthoringValidationError';
    this.code =
      'DEMO_SOCIAL_AUTHORING_VALIDATION_FAILED';
    this.invalidId = invalidId;
  }
}

export class DemoSocialAuthoringRevisionError
  extends Error {
  constructor() {
    super('Demo Social authoring revision is invalid.');
    this.name =
      'DemoSocialAuthoringRevisionError';
    this.code =
      'DEMO_SOCIAL_AUTHORING_REVISION_INVALID';
  }
}

export class DemoSocialAuthoringWriteError
  extends Error {
  constructor() {
    super('Demo Social authoring write failed.');
    this.name =
      'DemoSocialAuthoringWriteError';
    this.code =
      'DEMO_SOCIAL_AUTHORING_WRITE_FAILED';
  }
}

/**
 * @param {unknown} environment
 */
function isEnvironment(environment) {
  return (
    environment !== null &&
    typeof environment === 'object' &&
    !Array.isArray(environment)
  );
}

/**
 * Read the single Social document admitted by the public Demo.
 *
 * The marker verification revision and Social document revision must be
 * identical. This prevents target verification from becoming stale between
 * marker inspection and the browser-visible authoring snapshot.
 *
 * @param {{
 *   runtimeMode: unknown,
 *   demoContext: unknown,
 *   environment?: Record<string, string | undefined>,
 *   repositoryFactory?: (
 *     config: import('./demo-sandbox-target.js').DemoSandboxTargetConfig
 *   ) => {
 *     readText(path: string): Promise<{
 *       content: string,
 *       revision: string
 *     }>,
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
export async function loadDemoSocialAuthoringData({
  runtimeMode,
  demoContext,
  environment = process.env,
  repositoryFactory
}) {
  if (
    runtimeMode !== STUDIO_RUNTIME_MODES.DEMO ||
    !isTrustedDemoRequestContext(demoContext) ||
    !isEnvironment(environment) ||
    (
      repositoryFactory !== undefined &&
      typeof repositoryFactory !== 'function'
    )
  ) {
    throw new DemoSocialAuthoringReadError();
  }

  try {
    const target =
      await createVerifiedDemoSandboxRepository(
        /** @type {Record<string, string | undefined>} */ (
          environment
        ),
        repositoryFactory === undefined
          ? {}
          : { repositoryFactory }
      );

    if (
      target === null ||
      typeof target !== 'object' ||
      typeof target.verifiedRevision !==
        'string' ||
      target.repository === null ||
      typeof target.repository !==
        'object' ||
      typeof target.repository.readText !==
        'function'
    ) {
      throw new DemoSocialAuthoringReadError();
    }

    commitShaFromGitHubRevision(
      target.verifiedRevision
    );

    const result =
      await target.repository.readText(
        SOCIAL_AUTHORING_PATH
      );

    if (
      result === null ||
      typeof result !== 'object' ||
      typeof result.content !== 'string' ||
      typeof result.revision !== 'string'
    ) {
      throw new DemoSocialAuthoringReadError();
    }

    commitShaFromGitHubRevision(
      result.revision
    );

    if (
      result.revision !==
      target.verifiedRevision
    ) {
      throw new DemoSocialAuthoringReadError();
    }

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
    throw new DemoSocialAuthoringReadError();
  }
}

/**
 * Validate and commit the one Social mutation admitted by the Demo.
 *
 * Input validation and canonical serialization happen before repository
 * authority is consulted. The repository, branch, writable path and commit
 * message are all fixed server-side.
 *
 * The sandbox marker must have been verified at exactly expectedRevision.
 * A marker verification from any other branch state cannot authorize a write.
 *
 * @param {{
 *   runtimeMode: unknown,
 *   demoContext: unknown,
 *   formData: unknown,
 *   expectedRevision: unknown,
 *   environment?: Record<string, string | undefined>,
 *   repositoryFactory?: (
 *     config: import('./demo-sandbox-target.js').DemoSandboxTargetConfig
 *   ) => {
 *     readText(path: string): Promise<{
 *       content: string,
 *       revision: string
 *     }>,
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
export async function saveDemoSocialAuthoringData({
  runtimeMode,
  demoContext,
  formData,
  expectedRevision,
  environment = process.env,
  repositoryFactory
}) {
  if (
    runtimeMode !== STUDIO_RUNTIME_MODES.DEMO ||
    !isTrustedDemoRequestContext(demoContext) ||
    !isEnvironment(environment) ||
    (
      repositoryFactory !== undefined &&
      typeof repositoryFactory !== 'function'
    )
  ) {
    throw new DemoSocialAuthoringWriteError();
  }

  let social;

  try {
    social =
      buildSocialAuthoringDocumentFromFormData(
        formData
      );
  } catch {
    throw new DemoSocialAuthoringValidationError('');
  }

  if (social.invalidId) {
    throw new DemoSocialAuthoringValidationError(
      social.invalidId
    );
  }

  if (social.document === null) {
    throw new DemoSocialAuthoringValidationError('');
  }

  const content =
    serializeSocialAuthoringDocument(
      social.document
    );

  if (typeof expectedRevision !== 'string') {
    throw new DemoSocialAuthoringRevisionError();
  }

  try {
    commitShaFromGitHubRevision(
      expectedRevision
    );
  } catch {
    throw new DemoSocialAuthoringRevisionError();
  }

  try {
    const target =
      await createVerifiedDemoSandboxRepository(
        /** @type {Record<string, string | undefined>} */ (
          environment
        ),
        repositoryFactory === undefined
          ? {}
          : { repositoryFactory }
      );

    if (
      target === null ||
      typeof target !== 'object' ||
      typeof target.verifiedRevision !==
        'string' ||
      target.repository === null ||
      typeof target.repository !==
        'object' ||
      typeof target.repository.writeText !==
        'function'
    ) {
      throw new DemoSocialAuthoringWriteError();
    }

    commitShaFromGitHubRevision(
      target.verifiedRevision
    );

    if (
      target.verifiedRevision !==
      expectedRevision
    ) {
      throw new AuthoringRevisionConflictError(
        SOCIAL_AUTHORING_PATH,
        expectedRevision,
        target.verifiedRevision
      );
    }

    const result =
      await target.repository.writeText(
        SOCIAL_AUTHORING_PATH,
        content,
        {
          expectedRevision,
          message:
            DEMO_SOCIAL_COMMIT_MESSAGE
        }
      );

    if (
      result === null ||
      typeof result !== 'object' ||
      typeof result.revision !== 'string'
    ) {
      throw new DemoSocialAuthoringWriteError();
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
        DemoSocialAuthoringWriteError
    ) {
      throw error;
    }

    throw new DemoSocialAuthoringWriteError();
  }
}


/**
 * Restore the shared public Demo Social sandbox to its canonical baseline.
 *
 * This is an operator-only primitive. It is deliberately not connected to
 * SvelteKit routes, guest contexts, browser state or the public mutation
 * budget. The configured sandbox marker is verified at the current branch
 * revision before the forward commit is attempted.
 *
 * The operation never rewrites history: reset is one ordinary Git commit
 * guarded by optimistic concurrency.
 *
 * @param {{
 *   environment?: Record<string, string | undefined>,
 *   repositoryFactory?: (
 *     config: import('./demo-sandbox-target.js').DemoSandboxTargetConfig
 *   ) => {
 *     readText(path: string): Promise<{
 *       content: string,
 *       revision: string
 *     }>,
 *     writeText(
 *       path: string,
 *       content: string,
 *       options: {
 *         expectedRevision: string,
 *         message: string
 *       }
 *     ): Promise<{ revision: string }>
 *   }
 * }} [input]
 */
export async function resetDemoSocialSandbox({
  environment = process.env,
  repositoryFactory
} = {}) {
  if (
    !isEnvironment(environment) ||
    (
      repositoryFactory !== undefined &&
      typeof repositoryFactory !== 'function'
    )
  ) {
    throw new DemoSocialAuthoringWriteError();
  }

  try {
    const target =
      await createVerifiedDemoSandboxRepository(
        /** @type {Record<string, string | undefined>} */ (
          environment
        ),
        repositoryFactory === undefined
          ? {}
          : { repositoryFactory }
      );

    if (
      target === null ||
      typeof target !== 'object' ||
      typeof target.verifiedRevision !== 'string' ||
      target.repository === null ||
      typeof target.repository !== 'object' ||
      typeof target.repository.writeText !== 'function'
    ) {
      throw new DemoSocialAuthoringWriteError();
    }

    commitShaFromGitHubRevision(
      target.verifiedRevision
    );

    const result =
      await target.repository.writeText(
        SOCIAL_AUTHORING_PATH,
        DEMO_SOCIAL_BASELINE,
        {
          expectedRevision:
            target.verifiedRevision,
          message:
            DEMO_SOCIAL_RESET_COMMIT_MESSAGE
        }
      );

    if (
      result === null ||
      typeof result !== 'object' ||
      typeof result.revision !== 'string'
    ) {
      throw new DemoSocialAuthoringWriteError();
    }

    commitShaFromGitHubRevision(
      result.revision
    );

    return Object.freeze({
      previousRevision:
        target.verifiedRevision,
      revision:
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
        DemoSocialAuthoringWriteError
    ) {
      throw error;
    }

    throw new DemoSocialAuthoringWriteError();
  }
}
