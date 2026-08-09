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
  const runtimeMode = getStudioRuntimeMode();

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
        socialForm: hosted.socialForm,
        hostedSocial: {
          authoringRevision:
            hosted.authoringRevision,
          csrfToken:
            getTrustedHostedRequestCsrfToken(
              locals.hostedStudio
            )
        }
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
    hostedSocial: null
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
     * Local Studio deliberately retains its existing filesystem
     * action and requires no Hosted credentials or CSRF capability.
     */
    if (runtimeMode !== 'hosted') {
      return saveSocialAction({
        request
      });
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
