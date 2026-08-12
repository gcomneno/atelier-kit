/**
 * Studio runtime modes.
 *
 * ADR 0007 keeps Local Studio development/local-first.
 * ADR 0008 introduces Hosted Studio as a separate authenticated authoring mode.
 *
 * Hosted mode is intentionally distinguishable before authentication exists,
 * but it is not accessible by default.
 */

export const STUDIO_RUNTIME_MODES = Object.freeze({
  VISITOR: 'visitor',
  LOCAL: 'local',
  HOSTED: 'hosted',
  DEMO: 'demo',
  INVALID: 'invalid'
});

/**
 * Resolve the Studio runtime mode from trusted server-side runtime inputs.
 *
 * `ATELIER_STUDIO=1` is the existing ADR 0007 local-authoring switch.
 * `ATELIER_STUDIO_MODE=hosted` requests the ADR 0008 Hosted boundary.
 * `ATELIER_STUDIO_MODE=demo` requests the ADR 0011 public-demo boundary.
 *
 * Explicit Hosted or Demo mode and local-authoring signals are deliberately
 * mutually exclusive.
 * Unknown, empty, or conflicting explicit mode configuration fails closed.
 *
 * @param {boolean} devMode
 * @param {NodeJS.ProcessEnv | Record<string, string | undefined>} [environment]
 * @returns {'visitor' | 'local' | 'hosted' | 'demo' | 'invalid'}
 */
export function resolveStudioRuntimeMode(devMode, environment = process.env) {
  const hasExplicitMode = Object.prototype.hasOwnProperty.call(
    environment,
    'ATELIER_STUDIO_MODE'
  );

  const localAuthoring = devMode || environment.ATELIER_STUDIO === '1';

  if (hasExplicitMode) {
    const explicitMode =
      environment.ATELIER_STUDIO_MODE;

    if (
      explicitMode !== STUDIO_RUNTIME_MODES.HOSTED &&
      explicitMode !== STUDIO_RUNTIME_MODES.DEMO
    ) {
      return STUDIO_RUNTIME_MODES.INVALID;
    }

    if (localAuthoring) {
      return STUDIO_RUNTIME_MODES.INVALID;
    }

    return explicitMode;
  }

  if (localAuthoring) {
    return STUDIO_RUNTIME_MODES.LOCAL;
  }

  return STUDIO_RUNTIME_MODES.VISITOR;
}

/**
 * Decide whether a resolved runtime is intrinsically allowed to expose Studio.
 *
 * Local Studio preserves ADR 0007 behavior.
 *
 * Hosted Studio is never authorized at this runtime-only boundary. Hosted
 * admission requires the server-only trusted request-context policy.
 *
 * @param {'visitor' | 'local' | 'hosted' | 'demo' | 'invalid'} mode
 * @returns {boolean}
 */
export function canAccessStudio(mode) {
  return mode === STUDIO_RUNTIME_MODES.LOCAL;
}
