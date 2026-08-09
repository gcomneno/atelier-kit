import { dev } from '$app/environment';
import {
  error
} from '@sveltejs/kit';
import {
  HOSTED_PRIVATE_POC_LOGOUT_OUTCOMES,
  performHostedPrivatePocLogout
} from '$lib/server/hosted-private-poc-logout-http.js';
import {
  resolveStudioRuntimeMode
} from '$lib/studio-runtime.js';

/** @type {import('./$types').RequestHandler} */
export async function POST({
  request,
  cookies
}) {
  let csrfToken;

  try {
    const form = await request.formData();
    csrfToken =
      form.get('csrfToken') ?? undefined;
  } catch {
    error(403, 'Forbidden');
  }

  const runtimeMode =
    resolveStudioRuntimeMode(
      dev,
      process.env
    );

  const result =
    performHostedPrivatePocLogout({
      runtimeMode,
      cookies,
      host:
        request.headers.get('host') ??
        undefined,
      origin:
        request.headers.get('origin') ??
        undefined,
      method: request.method,
      csrfToken
    });

  switch (result.outcome) {
    case HOSTED_PRIVATE_POC_LOGOUT_OUTCOMES
      .LOGGED_OUT:
      return new Response('Signed out.', {
        status: 200,
        headers: {
          'content-type':
            'text/plain; charset=utf-8',
          'cache-control': 'no-store'
        }
      });

    case HOSTED_PRIVATE_POC_LOGOUT_OUTCOMES
      .METHOD_NOT_ALLOWED:
      error(405, 'Method not allowed');

    case HOSTED_PRIVATE_POC_LOGOUT_OUTCOMES
      .FORBIDDEN:
      error(403, 'Forbidden');

    default:
      error(404, 'Not found');
  }
}
