// @ts-nocheck

import {
  error,
  fail
} from '@sveltejs/kit';
import {
  AuthoringRevisionConflictError
} from '$lib/server/authoring-repository-boundary.js';
import {
  HostedHeroAuthoringRevisionError,
  HostedHeroAuthoringValidationError,
  loadHostedHeroAuthoringData,
  saveHostedHeroAuthoringData
} from '$lib/server/hosted-hero-authoring.js';
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
  getStudioRuntimeMode,
  guardStudio
} from '$lib/server/studio-guard.js';
import {
  loadAppearanceForm,
  loadHeroBannerForm,
  loadSiteForm,
  saveHeroBannerAction
} from '$lib/server/studio-site-server.js';
import {
  getOperatorTranslator
} from '$lib/i18n/server.js';

export async function load({ locals }) {
  const runtimeMode =
    getStudioRuntimeMode();

  if (runtimeMode === 'hosted') {
    guardStudio(
      locals.hostedStudio
    );

    if (
      !isTrustedHostedRequestContext(
        locals.hostedStudio
      )
    ) {
      error(404, 'Not found');
    }

    try {
      const hosted =
        await loadHostedHeroAuthoringData({
          runtimeMode,
          hostedContext:
            locals.hostedStudio
        });

      return {
        siteForm:
          hosted.siteForm,
        appearanceForm:
          hosted.appearanceForm,
        heroBannerForm:
          hosted.heroBannerForm,
        hostedHero: {
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

  /*
   * Local and all previously non-Hosted runtime behavior retain the
   * existing Studio guard and filesystem-backed form loaders.
   */
  guardStudio();

  return {
    siteForm:
      loadSiteForm(),
    appearanceForm:
      loadAppearanceForm(),
    heroBannerForm:
      loadHeroBannerForm(),
    hostedHero: null
  };
}

/** @type {import('./$types').Actions} */
export const actions = {
  saveHeroBanner: async ({
    request,
    locals
  }) => {
    const runtimeMode =
      getStudioRuntimeMode();

    /*
     * Local Studio deliberately retains its existing filesystem action.
     */
    if (runtimeMode === 'local') {
      return saveHeroBannerAction({
        request
      });
    }

    /*
     * No non-Local runtime gains filesystem mutation authority.
     * Visitor, Demo and invalid modes remain fail-closed through the
     * canonical Studio guard.
     */
    if (runtimeMode !== 'hosted') {
      guardStudio();

      return saveHeroBannerAction({
        request
      });
    }

    guardStudio(
      locals.hostedStudio
    );

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
          request.headers.get(
            'host'
          ),
        origin:
          request.headers.get(
            'origin'
          ),
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
      error(
        405,
        'Method not allowed'
      );
    }

    if (
      mutation.outcome !==
      HOSTED_MUTATION_GUARD_OUTCOMES.ALLOWED
    ) {
      error(
        403,
        'Forbidden'
      );
    }

    const t =
      getOperatorTranslator();

    try {
      const saved =
        await saveHostedHeroAuthoringData({
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
        heroBannerStatus:
          'success',
        heroBannerMessage:
          t(
            'server.saveHeroBannerSuccess'
          ),
        siteForm:
          saved.siteForm,
        appearanceForm:
          saved.appearanceForm,
        heroBannerForm:
          saved.heroBannerForm,
        hostedHero: {
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
          HostedHeroAuthoringValidationError ||
        saveError instanceof
          HostedHeroAuthoringRevisionError
      ) {
        return fail(400, {
          heroBannerStatus:
            'error',
          heroBannerMessage:
            t(
              'server.saveHeroBannerError'
            ),
          hostedHero: {
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
          AuthoringRevisionConflictError
      ) {
        return fail(409, {
          heroBannerStatus:
            'error',
          heroBannerMessage:
            t(
              'server.saveHeroBannerError'
            )
        });
      }

      error(
        503,
        'Hosted authoring unavailable'
      );
    }
  }
};
