import { guardStudio } from '$lib/server/studio-guard.js';
import { isTrustedHostedRequestContext } from '$lib/server/hosted-request-context.js';
import { getOperatorLocale } from '$lib/i18n/server.js';

export function load({ locals }) {
  guardStudio(locals.hostedStudio);

  return {
    studio: true,
    locale: getOperatorLocale(),
    // Presentation only. The trusted context remains server-only; route
    // admission continues to be enforced by guardStudio and the Hosted gate.
    hostedAuthoring: isTrustedHostedRequestContext(
      locals.hostedStudio
    )
  };
}
