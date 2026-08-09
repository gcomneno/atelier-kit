import {
  STUDIO_RUNTIME_MODES
} from '../studio-runtime.js';
import {
  isTrustedHostedRequestContext
} from './hosted-request-context.js';

/**
 * Server-only Studio route admission policy.
 *
 * Local Studio is admitted by runtime mode.
 * Hosted Studio requires a context genuinely issued by the trusted Hosted
 * request gate. Public object shape and legacy booleans are not authority.
 *
 * @param {unknown} runtimeMode
 * @param {unknown} [hostedContext]
 * @returns {boolean}
 */
export function canAccessStudioRoute(runtimeMode, hostedContext) {
  if (runtimeMode === STUDIO_RUNTIME_MODES.LOCAL) {
    return true;
  }

  if (runtimeMode === STUDIO_RUNTIME_MODES.HOSTED) {
    return isTrustedHostedRequestContext(hostedContext);
  }

  return false;
}
