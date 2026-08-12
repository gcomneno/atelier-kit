import {
  AuthoringRevisionConflictError
} from './authoring-repository-boundary.js';
import {
  DEMO_MUTATION_GUARD_OUTCOMES
} from './demo-mutation-guard.js';
import {
  getTrustedDemoRequestCsrfToken,
  isTrustedDemoRequestContext
} from './demo-request-context.js';
import {
  DemoSocialAuthoringRevisionError,
  DemoSocialAuthoringValidationError,
  DemoSocialAuthoringWriteError,
  loadDemoSocialAuthoringData,
  saveDemoSocialAuthoringData
} from './demo-social-authoring.js';
import {
  STUDIO_RUNTIME_MODES
} from '../studio-runtime.js';

export const DEMO_PUBLIC_SOCIAL_OUTCOMES =
  Object.freeze({
    NOT_FOUND: 'not-found',
    METHOD_NOT_ALLOWED: 'method-not-allowed',
    FORBIDDEN: 'forbidden',
    BUDGET_EXHAUSTED: 'budget-exhausted',
    BUDGET_UNAVAILABLE: 'budget-unavailable',
    VALIDATION_FAILED: 'validation-failed',
    REVISION_INVALID: 'revision-invalid',
    CONFLICT: 'conflict',
    UNAVAILABLE: 'unavailable',
    ALLOWED: 'allowed'
  });

export class DemoPublicSocialRouteError extends Error {
  constructor() {
    super('Demo public Social route boundary failed.');
    this.name = 'DemoPublicSocialRouteError';
    this.code = 'DEMO_PUBLIC_SOCIAL_ROUTE_ERROR';
  }
}

/**
 * @param {unknown} formData
 */
function submittedSocialForm(formData) {
  if (
    formData === null ||
    typeof formData !== 'object' ||
    typeof /** @type {Record<string, unknown>} */ (
      formData
    ).get !== 'function'
  ) {
    return Object.freeze({
      instagram: '',
      facebook: '',
      x: '',
      github: ''
    });
  }

  const input =
    /** @type {{
     *   get(name: string): unknown
     * }} */ (formData);

  return Object.freeze(
    Object.fromEntries(
      [
        'instagram',
        'facebook',
        'x',
        'github'
      ].map((id) => {
        const value =
          input.get(`url_${id}`);

        return [
          id,
          typeof value === 'string'
            ? value.trim()
            : ''
        ];
      })
    )
  );
}

/**
 * @param {unknown} value
 */
function outcome(value, data = {}) {
  return Object.freeze({
    outcome: value,
    ...data
  });
}

/**
 * Load the one Demo Social authoring document.
 *
 * @param {{
 *   runtimeMode: unknown,
 *   demoContext: unknown,
 *   environment?: Record<string, string | undefined>,
 *   authoringLoader?: typeof loadDemoSocialAuthoringData
 * }} input
 */
export async function loadDemoPublicSocialRoute({
  runtimeMode,
  demoContext,
  environment = process.env,
  authoringLoader =
    loadDemoSocialAuthoringData
}) {
  if (
    runtimeMode !== STUDIO_RUNTIME_MODES.DEMO ||
    !isTrustedDemoRequestContext(
      demoContext
    )
  ) {
    return outcome(
      DEMO_PUBLIC_SOCIAL_OUTCOMES.NOT_FOUND
    );
  }

  if (typeof authoringLoader !== 'function') {
    throw new DemoPublicSocialRouteError();
  }

  try {
    const loaded =
      await authoringLoader({
        runtimeMode,
        demoContext,
        environment
      });

    return outcome(
      DEMO_PUBLIC_SOCIAL_OUTCOMES.ALLOWED,
      {
        socialForm: loaded.socialForm,
        demoSocial: Object.freeze({
          authoringRevision:
            loaded.authoringRevision,
          csrfToken:
            getTrustedDemoRequestCsrfToken(
              demoContext
            )
        })
      }
    );
  } catch {
    return outcome(
      DEMO_PUBLIC_SOCIAL_OUTCOMES.UNAVAILABLE
    );
  }
}

/**
 * Integrity/budget must succeed before Demo authoring authority is invoked.
 *
 * @param {{
 *   runtimeMode: unknown,
 *   demoContext: unknown,
 *   request: {
 *     method: string,
 *     headers: { get(name: string): string | null },
 *     formData(): Promise<unknown>
 *   },
 *   runtime: {
 *     evaluateMutation(request: {
 *       runtimeMode: unknown,
 *       trustedContext: unknown,
 *       host: unknown,
 *       origin: unknown,
 *       method: unknown,
 *       csrfToken: unknown
 *     }): Promise<{
 *       outcome: unknown,
 *       remaining?: unknown
 *     }>
 *   },
 *   environment?: Record<string, string | undefined>,
 *   authoringSaver?: typeof saveDemoSocialAuthoringData
 * }} input
 */
export async function saveDemoPublicSocialRoute({
  runtimeMode,
  demoContext,
  request,
  runtime,
  environment = process.env,
  authoringSaver =
    saveDemoSocialAuthoringData
}) {
  if (
    runtimeMode !== STUDIO_RUNTIME_MODES.DEMO ||
    !isTrustedDemoRequestContext(
      demoContext
    )
  ) {
    return outcome(
      DEMO_PUBLIC_SOCIAL_OUTCOMES.NOT_FOUND
    );
  }

  if (
    request === null ||
    typeof request !== 'object' ||
    typeof request.method !== 'string' ||
    request.headers === null ||
    typeof request.headers !== 'object' ||
    typeof request.headers.get !== 'function' ||
    typeof request.formData !== 'function' ||
    runtime === null ||
    typeof runtime !== 'object' ||
    typeof runtime.evaluateMutation !==
      'function' ||
    typeof authoringSaver !== 'function'
  ) {
    throw new DemoPublicSocialRouteError();
  }

  const formData =
    await request.formData();

  if (
    formData === null ||
    typeof formData !== 'object' ||
    typeof /** @type {Record<string, unknown>} */ (
      formData
    ).get !== 'function'
  ) {
    return outcome(
      DEMO_PUBLIC_SOCIAL_OUTCOMES.FORBIDDEN
    );
  }

  const input =
    /** @type {{
     *   get(name: string): unknown
     * }} */ (formData);

  const mutation =
    await runtime.evaluateMutation({
      runtimeMode,
      trustedContext:
        demoContext,
      host:
        request.headers.get('host'),
      origin:
        request.headers.get('origin'),
      method:
        request.method,
      csrfToken:
        input.get('demo_csrf_token')
    });

  if (
    mutation === null ||
    typeof mutation !== 'object'
  ) {
    throw new DemoPublicSocialRouteError();
  }

  switch (mutation.outcome) {
    case DEMO_MUTATION_GUARD_OUTCOMES.NOT_FOUND:
      return outcome(
        DEMO_PUBLIC_SOCIAL_OUTCOMES.NOT_FOUND
      );

    case DEMO_MUTATION_GUARD_OUTCOMES.METHOD_NOT_ALLOWED:
      return outcome(
        DEMO_PUBLIC_SOCIAL_OUTCOMES.METHOD_NOT_ALLOWED
      );

    case DEMO_MUTATION_GUARD_OUTCOMES.FORBIDDEN:
      return outcome(
        DEMO_PUBLIC_SOCIAL_OUTCOMES.FORBIDDEN
      );

    case DEMO_MUTATION_GUARD_OUTCOMES.BUDGET_EXHAUSTED:
      return outcome(
        DEMO_PUBLIC_SOCIAL_OUTCOMES.BUDGET_EXHAUSTED
      );

    case DEMO_MUTATION_GUARD_OUTCOMES.BUDGET_UNAVAILABLE:
      return outcome(
        DEMO_PUBLIC_SOCIAL_OUTCOMES.BUDGET_UNAVAILABLE
      );

    case DEMO_MUTATION_GUARD_OUTCOMES.ALLOWED:
      break;

    default:
      throw new DemoPublicSocialRouteError();
  }

  try {
    const saved =
      await authoringSaver({
        runtimeMode,
        demoContext,
        formData,
        expectedRevision:
          input.get(
            'authoring_revision'
          ),
        environment
      });

    return outcome(
      DEMO_PUBLIC_SOCIAL_OUTCOMES.ALLOWED,
      {
        socialForm:
          saved.socialForm,
        demoSocial:
          Object.freeze({
            authoringRevision:
              saved.authoringRevision,
            csrfToken:
              getTrustedDemoRequestCsrfToken(
                demoContext
              ),
            remainingMutations:
              mutation.remaining
          })
      }
    );
  } catch (error) {
    if (
      error instanceof
        DemoSocialAuthoringValidationError
    ) {
      return outcome(
        DEMO_PUBLIC_SOCIAL_OUTCOMES
          .VALIDATION_FAILED,
        {
          invalidId:
            error.invalidId,
          socialForm:
            submittedSocialForm(
              formData
            ),
          demoSocial:
            Object.freeze({
              authoringRevision:
                String(
                  input.get(
                    'authoring_revision'
                  ) ?? ''
                ),
              csrfToken:
                getTrustedDemoRequestCsrfToken(
                  demoContext
                )
            })
        }
      );
    }

    if (
      error instanceof
        DemoSocialAuthoringRevisionError
    ) {
      return outcome(
        DEMO_PUBLIC_SOCIAL_OUTCOMES
          .REVISION_INVALID
      );
    }

    if (
      error instanceof
        AuthoringRevisionConflictError
    ) {
      return outcome(
        DEMO_PUBLIC_SOCIAL_OUTCOMES.CONFLICT
      );
    }

    if (
      error instanceof
        DemoSocialAuthoringWriteError
    ) {
      return outcome(
        DEMO_PUBLIC_SOCIAL_OUTCOMES.UNAVAILABLE
      );
    }

    return outcome(
      DEMO_PUBLIC_SOCIAL_OUTCOMES.UNAVAILABLE
    );
  }
}
