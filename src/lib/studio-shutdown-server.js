const DEFAULT_FALLBACK_EXIT_DELAY_MS = 10_000;
const DEFAULT_ACKNOWLEDGED_EXIT_DELAY_MS = 150;

/**
 * @typedef {ReturnType<typeof setTimeout> | number} ShutdownTimer
 * @typedef {(code: number) => unknown} ExitProcess
 * @typedef {(callback: () => void, delay: number) => ShutdownTimer} SetTimer
 * @typedef {(timer: ShutdownTimer) => void} ClearTimer
 */

/**
 * @param {{
 *   exit?: ExitProcess,
 *   setTimer?: SetTimer,
 *   clearTimer?: ClearTimer,
 *   fallbackExitDelayMs?: number,
 *   acknowledgedExitDelayMs?: number
 * }} [options]
 */
export function createStudioShutdownCoordinator({
  exit = (code) => process.exit(code),
  setTimer = setTimeout,
  clearTimer = clearTimeout,
  fallbackExitDelayMs = DEFAULT_FALLBACK_EXIT_DELAY_MS,
  acknowledgedExitDelayMs = DEFAULT_ACKNOWLEDGED_EXIT_DELAY_MS
} = {}) {
  let requested = false;
  /** @type {ShutdownTimer | undefined} */
  let exitTimer;

  /** @param {number} delay */
  function scheduleExit(delay) {
    if (exitTimer !== undefined) clearTimer(exitTimer);
    exitTimer = setTimer(() => exit(0), delay);
  }

  return {
    request() {
      if (requested) return false;
      requested = true;
      scheduleExit(fallbackExitDelayMs);
      return true;
    },
    acknowledgeRendered() {
      if (!requested) return false;
      scheduleExit(acknowledgedExitDelayMs);
      return true;
    },
    dispose() {
      if (exitTimer !== undefined) clearTimer(exitTimer);
      exitTimer = undefined;
      requested = false;
    }
  };
}

export const studioShutdownCoordinator = createStudioShutdownCoordinator();

/** @param {boolean} devMode @param {Record<string, string | undefined>} [environment] */
export function isStudioShutdownAllowed(devMode, environment = process.env) {
  return devMode || environment.ATELIER_STUDIO === '1';
}
