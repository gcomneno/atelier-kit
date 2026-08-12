import {
  guardStudioShell
} from '$lib/server/studio-guard.js';
import {
  isTrustedHostedRequestContext
} from '$lib/server/hosted-request-context.js';
import {
  isTrustedDemoRequestContext
} from '$lib/server/demo-request-context.js';
import {
  getOperatorLocale
} from '$lib/i18n/server.js';

export function load({ locals }) {
  guardStudioShell(
    locals.hostedStudio,
    locals.demoStudio
  );

  return {
    studio: true,
    locale: getOperatorLocale(),

    /*
     * Presentation-only capability booleans.
     * Trusted contexts and their secrets remain server-side.
     */
    hostedAuthoring:
      isTrustedHostedRequestContext(
        locals.hostedStudio
      ),
    demoAuthoring:
      isTrustedDemoRequestContext(
        locals.demoStudio
      )
  };
}
