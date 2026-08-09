import {
  getTrustedHostedRequestCsrfToken,
  isTrustedHostedRequestContext
} from './hosted-request-context.js';

/**
 * Build the only browser-visible Hosted security capability required
 * by the private read-only PoC: the synchronizer token for the logout
 * form.
 *
 * Local Studio receives null. No session identifier, identity claim,
 * provider token, repository credential or event object is exposed.
 *
 * @param {unknown} hostedContext
 */
export function createHostedPrivatePocDashboardData(
  hostedContext
) {
  if (
    !isTrustedHostedRequestContext(hostedContext)
  ) {
    return null;
  }

  return Object.freeze({
    logoutCsrfToken:
      getTrustedHostedRequestCsrfToken(
        hostedContext
      )
  });
}
