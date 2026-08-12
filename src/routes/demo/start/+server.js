import {
  error,
  redirect
} from '@sveltejs/kit';
import {
  applyDemoSessionBootstrapRequest,
  DEMO_SESSION_BOOTSTRAP_OUTCOMES
} from '$lib/server/demo-session-bootstrap-http.js';
import {
  getStudioRuntimeMode
} from '$lib/server/studio-guard.js';

/** @type {import('./$types').RequestHandler} */
export async function POST(event) {
  const result =
    await applyDemoSessionBootstrapRequest({
      event,
      runtimeMode:
        getStudioRuntimeMode()
    });

  switch (result.outcome) {
    case DEMO_SESSION_BOOTSTRAP_OUTCOMES.ALLOWED:
      redirect(
        303,
        '/studio/site/social'
      );

    case DEMO_SESSION_BOOTSTRAP_OUTCOMES.SUBJECT_EXHAUSTED:
    case DEMO_SESSION_BOOTSTRAP_OUTCOMES.GLOBAL_EXHAUSTED:
      error(
        429,
        'Demo session issuance limit reached'
      );

    case DEMO_SESSION_BOOTSTRAP_OUTCOMES.FORBIDDEN:
      error(403, 'Forbidden');

    case DEMO_SESSION_BOOTSTRAP_OUTCOMES.METHOD_NOT_ALLOWED:
      error(
        405,
        'Method not allowed'
      );

    case DEMO_SESSION_BOOTSTRAP_OUTCOMES.NOT_FOUND:
      error(404, 'Not found');

    default:
      error(
        503,
        'Demo session unavailable'
      );
  }
}
