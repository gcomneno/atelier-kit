import { dev } from '$app/environment';
import {
  error,
  redirect
} from '@sveltejs/kit';
import {
  HOSTED_PRIVATE_POC_AUTH_HTTP_OUTCOMES,
  beginHostedPrivatePocLogin
} from '$lib/server/hosted-private-poc-auth-http.js';
import {
  resolveStudioRuntimeMode
} from '$lib/studio-runtime.js';

/** @type {import('./$types').RequestHandler} */
export async function GET({ url }) {
  const runtimeMode =
    resolveStudioRuntimeMode(
      dev,
      process.env
    );

  const outcome =
    await beginHostedPrivatePocLogin({
      runtimeMode,
      returnTo:
        url.searchParams.get('returnTo') ??
        undefined
    });

  switch (outcome.outcome) {
    case HOSTED_PRIVATE_POC_AUTH_HTTP_OUTCOMES
      .REDIRECT:
      if (typeof outcome.location !== 'string') {
        error(500, 'Hosted authentication response invalid.');
      }
      redirect(302, outcome.location);

    case HOSTED_PRIVATE_POC_AUTH_HTTP_OUTCOMES
      .AUTHENTICATION_FAILED:
      error(400, 'Authentication request rejected.');

    default:
      error(404, 'Not found');
  }
}
