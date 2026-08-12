import {
  GitHubAuthoringRepository,
  GitHubRestAuthoringTransport,
  commitShaFromGitHubRevision
} from './github-authoring-repository.js';

export const DEMO_SANDBOX_MARKER_PATH =
  '.atelier/demo-sandbox.json';

export const DEMO_SANDBOX_MARKER_PURPOSE =
  'atelier-kit-public-demo-sandbox-v1';

const CANONICAL_REPOSITORY =
  'gcomneno/atelier-kit';

const REPOSITORY_PATTERN =
  /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/;

const BRANCH_PATTERN =
  /^(?!\/)(?!.*(?:^|\/)\.\.(?:\/|$))(?!.*\/\/)(?!.*\.$)[^\s~^:?*[\\]+$/;

const MARKER_PATTERN =
  /^[A-Za-z0-9_-]{43}$/;

/**
 * @typedef {{
 *   repository: string,
 *   branch: string,
 *   token: string,
 *   marker: string
 * }} DemoSandboxTargetConfig
 */

export class DemoSandboxTargetConfigurationError
  extends Error {
  constructor() {
    super('Demo sandbox target configuration is invalid.');
    this.name =
      'DemoSandboxTargetConfigurationError';
    this.code =
      'DEMO_SANDBOX_TARGET_CONFIGURATION_INVALID';
  }
}

export class DemoSandboxTargetVerificationError
  extends Error {
  constructor() {
    super('Demo sandbox target verification failed.');
    this.name =
      'DemoSandboxTargetVerificationError';
    this.code =
      'DEMO_SANDBOX_TARGET_VERIFICATION_FAILED';
  }
}

/**
 * @param {unknown} value
 */
function canonicalRepository(value) {
  if (
    typeof value !== 'string' ||
    !REPOSITORY_PATTERN.test(value)
  ) {
    throw new DemoSandboxTargetConfigurationError();
  }

  return value;
}

/**
 * @param {unknown} value
 */
function canonicalBranch(value) {
  if (
    typeof value !== 'string' ||
    value.length === 0 ||
    !BRANCH_PATTERN.test(value)
  ) {
    throw new DemoSandboxTargetConfigurationError();
  }

  return value;
}

/**
 * @param {unknown} value
 */
function canonicalMarker(value) {
  if (
    typeof value !== 'string' ||
    !MARKER_PATTERN.test(value)
  ) {
    throw new DemoSandboxTargetConfigurationError();
  }

  try {
    if (
      Buffer.from(value, 'base64url').length !== 32
    ) {
      throw new Error();
    }
  } catch {
    throw new DemoSandboxTargetConfigurationError();
  }

  return value;
}

/**
 * @param {Record<string, string | undefined>} environment
 * @returns {DemoSandboxTargetConfig}
 */
export function parseDemoSandboxTargetConfig(
  environment
) {
  if (
    environment === null ||
    typeof environment !== 'object' ||
    Array.isArray(environment)
  ) {
    throw new DemoSandboxTargetConfigurationError();
  }

  const repository =
    canonicalRepository(
      environment.ATELIER_DEMO_GITHUB_REPOSITORY
    );

  const branch =
    canonicalBranch(
      environment.ATELIER_DEMO_GITHUB_BRANCH
    );

  const token =
    environment.ATELIER_DEMO_GITHUB_TOKEN;

  const marker =
    canonicalMarker(
      environment.ATELIER_DEMO_SANDBOX_MARKER
    );

  if (
    typeof token !== 'string' ||
    token.trim() === ''
  ) {
    throw new DemoSandboxTargetConfigurationError();
  }

  /*
   * GitHub repository identity is case-insensitive.
   * The canonical Atelier-Kit repository is never a valid Demo target.
   */
  if (
    repository.toLowerCase() ===
    CANONICAL_REPOSITORY
  ) {
    throw new DemoSandboxTargetConfigurationError();
  }

  /*
   * If Hosted configuration is deliberately present beside Demo
   * configuration, reject equality explicitly as an additional fail-closed
   * boundary. Demo does not require Hosted configuration to exist.
   */
  const hostedRepository =
    environment.ATELIER_STUDIO_GITHUB_REPOSITORY;

  if (
    typeof hostedRepository === 'string' &&
    hostedRepository.trim().toLowerCase() ===
      repository.toLowerCase()
  ) {
    throw new DemoSandboxTargetConfigurationError();
  }

  return Object.freeze({
    repository,
    branch,
    token,
    marker
  });
}

/**
 * @param {DemoSandboxTargetConfig} config
 */
export function serializeExpectedDemoSandboxMarker(
  config
) {
  return `${JSON.stringify({
    purpose:
      DEMO_SANDBOX_MARKER_PURPOSE,
    repository: config.repository,
    branch: config.branch,
    marker: config.marker
  }, null, 2)}\n`;
}

/**
 * Verify the immutable Demo marker at the exact current branch revision.
 *
 * The marker is outside the Demo writable root. A repository must therefore
 * already have been intentionally provisioned as this exact sandbox target
 * before any authoring adapter can be returned.
 *
 * @param {{
 *   repository: {
 *     readText(path: string): Promise<{
 *       content: string,
 *       revision: string
 *     }>
 *   },
 *   config: DemoSandboxTargetConfig
 * }} input
 */
export async function verifyDemoSandboxTarget({
  repository,
  config
}) {
  if (
    repository === null ||
    typeof repository !== 'object' ||
    typeof repository.readText !== 'function'
  ) {
    throw new DemoSandboxTargetVerificationError();
  }

  let result;

  try {
    result =
      await repository.readText(
        DEMO_SANDBOX_MARKER_PATH
      );
  } catch {
    throw new DemoSandboxTargetVerificationError();
  }

  if (
    result === null ||
    typeof result !== 'object' ||
    typeof result.content !== 'string' ||
    typeof result.revision !== 'string' ||
    result.content !==
      serializeExpectedDemoSandboxMarker(config)
  ) {
    throw new DemoSandboxTargetVerificationError();
  }

  try {
    commitShaFromGitHubRevision(
      result.revision
    );
  } catch {
    throw new DemoSandboxTargetVerificationError();
  }

  return Object.freeze({
    revision: result.revision
  });
}

/**
 * Create a server-controlled Demo repository only after its marker proves
 * that the configured repository+branch was intentionally provisioned as
 * this sandbox.
 *
 * Writable authority is deliberately restricted to the one Social document.
 *
 * @param {Record<string, string | undefined>} environment
 * @param {{
 *   fetchImpl?: typeof fetch,
 *   repositoryFactory?: (
 *     config: DemoSandboxTargetConfig
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
 * }} [dependencies]
 */
export async function createVerifiedDemoSandboxRepository(
  environment,
  dependencies = {}
) {
  const config =
    parseDemoSandboxTargetConfig(environment);

  let repository;

  try {
    if (
      dependencies.repositoryFactory !== undefined
    ) {
      if (
        typeof dependencies.repositoryFactory !==
        'function'
      ) {
        throw new Error();
      }

      repository =
        dependencies.repositoryFactory(config);
    } else {
      const transport =
        new GitHubRestAuthoringTransport({
          token: config.token,
          fetchImpl: dependencies.fetchImpl
        });

      repository =
        new GitHubAuthoringRepository({
          repository: config.repository,
          branch: config.branch,
          writableRoots: [
            'config/social.yaml'
          ],
          transport
        });
    }

    if (
      repository === null ||
      typeof repository !== 'object' ||
      typeof repository.readText !==
        'function' ||
      typeof repository.writeText !==
        'function'
    ) {
      throw new Error();
    }

    const verification =
      await verifyDemoSandboxTarget({
        repository,
        config
      });

    return Object.freeze({
      repository,
      verifiedRevision:
        verification.revision
    });
  } catch (error) {
    if (
      error instanceof
        DemoSandboxTargetVerificationError
    ) {
      throw error;
    }

    throw new DemoSandboxTargetVerificationError();
  }
}
