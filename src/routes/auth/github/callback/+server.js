import { dev } from '$app/environment';
import {
  error,
  redirect
} from '@sveltejs/kit';
import {
  HOSTED_PRIVATE_POC_AUTH_HTTP_OUTCOMES,
  completeHostedPrivatePocCallback
} from '$lib/server/hosted-private-poc-auth-http.js';
import {
  resolveStudioRuntimeMode
} from '$lib/studio-runtime.js';

/** @type {import('./$types').RequestHandler} */
export async function GET({
  url,
  cookies
}) {
  const runtimeMode =
    resolveStudioRuntimeMode(
      dev,
      process.env
    );

  const outcome =
    await completeHostedPrivatePocCallback({
      runtimeMode,
      callback: {
        state:
          url.searchParams.get('state') ??
          undefined,
        code:
          url.searchParams.get('code') ??
          undefined,
        error:
          url.searchParams.get('error') ??
          undefined
      },
      cookies
    });

  switch (outcome.outcome) {
    case HOSTED_PRIVATE_POC_AUTH_HTTP_OUTCOMES
      .REDIRECT:
      if (typeof outcome.location !== 'string') {
        error(500, 'Hosted authentication response invalid.');
      }
      redirect(303, outcome.location);

    case HOSTED_PRIVATE_POC_AUTH_HTTP_OUTCOMES
      .FORBIDDEN:
      error(403, 'Forbidden');

    case HOSTED_PRIVATE_POC_AUTH_HTTP_OUTCOMES
      .AUTHENTICATION_FAILED:
      error(401, 'Authentication failed.');

    default:
      error(404, 'Not found');
  }
}
