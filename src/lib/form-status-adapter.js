/** @typedef {import('giadaware-ui-components').FormStatusTone} FormStatusTone */

/**
 * @param {string | undefined} status
 * @returns {FormStatusTone}
 */
export function resolveAtelierFormStatusTone(status) {
  if (status === 'success' || status === 'warning' || status === 'error') return status;
  return 'info';
}

/**
 * Preserve explicit caller durations while keeping transient legacy feedback
 * and making warnings and errors persistent by default.
 *
 * @param {FormStatusTone} tone
 * @param {number | null | undefined} durationMs
 * @returns {number | null}
 */
export function resolveAtelierFormStatusDuration(tone, durationMs) {
  if (durationMs !== undefined) return durationMs;
  return tone === 'success' || tone === 'info' ? 5000 : null;
}
