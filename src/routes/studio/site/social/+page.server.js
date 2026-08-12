// @ts-nocheck

import {
  error,
  fail
} from '@sveltejs/kit';
import {
  AuthoringRevisionConflictError
} from '$lib/server/authoring-repository-boundary.js';
import {
  getHostedPrivatePocRuntime
} from '$lib/server/hosted-private-poc-http.js';
import {
  getDemoPublicRuntime
} from '$lib/server/demo-public-http.js';
import {
  DEMO_PUBLIC_SOCIAL_OUTCOMES,
  loadDemoPublicSocialRoute,
  saveDemoPublicSocialRoute
} from '$lib/server/demo-public-social-route.js';
import {
  isTrustedDemoRequestContext
} from '$lib/server/demo-request-context.js';
import {
  HOSTED_MUTATION_GUARD_OUTCOMES
} from '$lib/server/hosted-mutation-guard.js';
import {
  getTrustedHostedRequestCsrfToken,
  isTrustedHostedRequestContext
} from '$lib/server/hosted-request-context.js';
import {
  HostedSocialAuthoringRevisionError,
  HostedSocialAuthoringValidationError,
  loadHostedSocialAuthoringData,
  saveHostedSocialAuthoringData
} from '$lib/server/hosted-social-authoring.js';
import {
  getStudioRuntimeMode,
  guardStudio
} from '$lib/server/studio-guard.js';
import {
  loadSocialForm,
  saveSocialAction
} from '$lib/server/studio-site-server.js';
import {
  getOperatorTranslator
} from '$lib/i18n/server.js';

export async function load({ locals }) {
  const runtimeMode =
    getStudioRuntimeMode();

  if (runtimeMode === 'demo') {
    if (
      !isTrustedDemoRequestContext(
        locals.demoStudio
      )
    ) {
      error(404, 'Not found');
    }

    const result =
      await loadDemoPublicSocialRoute({
        runtimeMode,
        demoContext:
          locals.demoStudio
      });

    if (
      result.outcome ===
      DEMO_PUBLIC_SOCIAL_OUTCOMES.ALLOWED
    ) {
      return {
        socialForm:
          result.socialForm,
        hostedSocial: null,
        demoSocial:
          result.demoSocial
      };
    }

    if (
      result.outcome ===
      DEMO_PUBLIC_SOCIAL_OUTCOMES.NOT_FOUND
    ) {
      error(404, 'Not found');
    }

    error(
      503,
      'Demo authoring unavailable'
    );
  }

  guardStudio(locals.hostedStudio);

  if (runtimeMode === 'hosted') {
    if (
      !isTrustedHostedRequestContext(
        locals.hostedStudio
      )
    ) {
      error(404, 'Not found');
    }

    try {
      const hosted =
        await loadHostedSocialAuthoringData({
          runtimeMode,
          hostedContext:
            locals.hostedStudio
        });

      return {
        socialForm:
          hosted.socialForm,
        hostedSocial: {
          authoringRevision:
            hosted.authoringRevision,
          csrfToken:
            getTrustedHostedRequestCsrfToken(
              locals.hostedStudio
            )
        },
        demoSocial: null
      };
    } catch {
      error(
        503,
        'Hosted authoring unavailable'
      );
    }
  }

  return {
    socialForm: loadSocialForm(),
    hostedSocial: null,
    demoSocial: null
  };
}

/** @type {import('./$types').Actions} */
export const actions = {
  saveSocial: async ({
    request,
    locals
  }) => {
    const runtimeMode =
      getStudioRuntimeMode();

    /*
     * Local Studio deliberately retains its existing filesystem action.
     */
    if (runtimeMode === 'local') {
      return saveSocialAction({
        request
      });
    }

    if (runtimeMode === 'demo') {
      if (
        !isTrustedDemoRequestContext(
          locals.demoStudio
        )
      ) {
        error(404, 'Not found');
      }

      const runtime =
        getDemoPublicRuntime(
          runtimeMode
        );

      /*
       * Demo mutation authority is available only through the persistent
       * public Demo composition root.
       */
      if (
        runtime === null ||
        typeof runtime !== 'object' ||
        typeof runtime.evaluateMutation !==
          'function'
      ) {
        error(404, 'Not found');
      }

      const result =
        await saveDemoPublicSocialRoute({
          runtimeMode,
          demoContext:
            locals.demoStudio,
          request,
          runtime
        });

      const t =
        getOperatorTranslator();

      switch (result.outcome) {
        case DEMO_PUBLIC_SOCIAL_OUTCOMES.ALLOWED:
          return {
            socialStatus: 'success',
            socialMessage:
              t('server.saveSocialSuccess'),
            socialForm:
              result.socialForm,
            hostedSocial: null,
            demoSocial:
              result.demoSocial
          };

        case DEMO_PUBLIC_SOCIAL_OUTCOMES.VALIDATION_FAILED:
          return fail(400, {
            socialStatus: 'error',
            socialMessage:
              t(
                'errors.socialUrlInvalid',
                {
                  network:
                    result.invalidId
                }
              ),
            socialForm:
              result.socialForm,
            hostedSocial: null,
            demoSocial:
              result.demoSocial
          });

        case DEMO_PUBLIC_SOCIAL_OUTCOMES.REVISION_INVALID:
          return fail(400, {
            socialStatus: 'error',
            socialMessage:
              t('server.saveSocialError')
          });

        case DEMO_PUBLIC_SOCIAL_OUTCOMES.CONFLICT:
          return fail(409, {
            socialStatus: 'error',
            socialMessage:
              t('server.saveSocialConflict')
          });

        case DEMO_PUBLIC_SOCIAL_OUTCOMES.METHOD_NOT_ALLOWED:
          error(405, 'Method not allowed');

        case DEMO_PUBLIC_SOCIAL_OUTCOMES.FORBIDDEN:
          error(403, 'Forbidden');

        case DEMO_PUBLIC_SOCIAL_OUTCOMES.BUDGET_EXHAUSTED:
          error(
            429,
            'Demo mutation budget exhausted'
          );

        case DEMO_PUBLIC_SOCIAL_OUTCOMES.BUDGET_UNAVAILABLE:
          error(
            503,
            'Demo mutation budget unavailable'
          );

        case DEMO_PUBLIC_SOCIAL_OUTCOMES.NOT_FOUND:
          error(404, 'Not found');

        default:
          error(
            503,
            'Demo authoring unavailable'
          );
      }
    }

    guardStudio(locals.hostedStudio);

    if (
      !isTrustedHostedRequestContext(
        locals.hostedStudio
      )
    ) {
      error(404, 'Not found');
    }

    const runtime =
      getHostedPrivatePocRuntime(
        runtimeMode
      );

    if (runtime === null) {
      error(404, 'Not found');
    }

    const formData =
      await request.formData();

    const mutation =
      runtime.evaluateMutation({
        runtimeMode,
        trustedContext:
          locals.hostedStudio,
        host:
          request.headers.get('host'),
        origin:
          request.headers.get('origin'),
        method:
          request.method,
        csrfToken:
          formData.get(
            'hosted_csrf_token'
          )
      });

    if (
      mutation.outcome ===
      HOSTED_MUTATION_GUARD_OUTCOMES.NOT_FOUND
    ) {
      error(404, 'Not found');
    }

    if (
      mutation.outcome ===
      HOSTED_MUTATION_GUARD_OUTCOMES.METHOD_NOT_ALLOWED
    ) {
      error(405, 'Method not allowed');
    }

    if (
      mutation.outcome !==
      HOSTED_MUTATION_GUARD_OUTCOMES.ALLOWED
    ) {
      error(403, 'Forbidden');
    }

    const t =
      getOperatorTranslator();

    try {
      const saved =
        await saveHostedSocialAuthoringData({
          runtimeMode,
          hostedContext:
            locals.hostedStudio,
          formData,
          expectedRevision:
            formData.get(
              'authoring_revision'
            )
        });

      return {
        socialStatus: 'success',
        socialMessage:
          t('server.saveSocialSuccess'),
        socialForm:
          saved.socialForm,
        hostedSocial: {
          authoringRevision:
            saved.authoringRevision,
          csrfToken:
            getTrustedHostedRequestCsrfToken(
              locals.hostedStudio
            )
        }
      };
    } catch (saveError) {
      if (
        saveError instanceof
          HostedSocialAuthoringValidationError
      ) {
        return fail(400, {
          socialStatus: 'error',
          socialMessage:
            t(
              'errors.socialUrlInvalid',
              {
                network:
                  saveError.invalidId
              }
            ),
          socialForm:
            Object.fromEntries(
              [
                'instagram',
                'facebook',
                'x',
                'github'
              ].map((id) => [
                id,
                typeof formData.get(
                  `url_${id}`
                ) === 'string'
                  ? String(
                      formData.get(
                        `url_${id}`
                      )
                    ).trim()
                  : ''
              ])
            ),
          hostedSocial: {
            authoringRevision:
              String(
                formData.get(
                  'authoring_revision'
                ) ?? ''
              ),
            csrfToken:
              getTrustedHostedRequestCsrfToken(
                locals.hostedStudio
              )
          }
        });
      }

      if (
        saveError instanceof
          HostedSocialAuthoringRevisionError
      ) {
        return fail(400, {
          socialStatus: 'error',
          socialMessage:
            t('server.saveSocialError')
        });
      }

      if (
        saveError instanceof
          AuthoringRevisionConflictError
      ) {
        return fail(409, {
          socialStatus: 'error',
          socialMessage:
            t('server.saveSocialConflict')
        });
      }

      error(
        503,
        'Hosted authoring unavailable'
      );
    }
  }
};
