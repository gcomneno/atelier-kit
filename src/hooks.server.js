import { dev } from '$app/environment';
import {
  error,
  redirect
} from '@sveltejs/kit';
import { resolveLocale } from '$lib/i18n/resolve-locale.js';
import {
  HOSTED_PRIVATE_POC_HTTP_OUTCOMES,
  applyHostedPrivatePocStudioAuthorizedRequest
} from '$lib/server/hosted-private-poc-http.js';
import { getSiteConfig } from '$lib/server/showcase.js';
import {
  resolveStudioRuntimeMode
} from '$lib/studio-runtime.js';

/** @type {import('@sveltejs/kit').Handle} */
export async function handle({ event, resolve }) {
  const runtimeMode =
    resolveStudioRuntimeMode(
      dev,
      process.env
    );

  const hostedPrivatePoc =
    await applyHostedPrivatePocStudioAuthorizedRequest({
      event,
      runtimeMode
    });

  if (
    hostedPrivatePoc ===
    HOSTED_PRIVATE_POC_HTTP_OUTCOMES.AUTHENTICATE
  ) {
    const returnTo =
      `${event.url.pathname}${event.url.search}`;

    redirect(
      302,
      `/auth/github/login?returnTo=${encodeURIComponent(returnTo)}`
    );
  }

  if (
    hostedPrivatePoc ===
    HOSTED_PRIVATE_POC_HTTP_OUTCOMES.FORBIDDEN
  ) {
    error(403, 'Forbidden');
  }

  let lang = 'en';

  try {
    const site = getSiteConfig();
    lang = resolveLocale(site.language);
  } catch {
    // Keep default during unusual build or missing config edge cases.
  }

  return resolve(event, {
    transformPageChunk: ({ html }) =>
      html.replaceAll('%lang%', lang)
  });
}
