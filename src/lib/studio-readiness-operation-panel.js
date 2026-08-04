/**
 * @typedef {{
 *   prep?: {
 *     ok?: boolean,
 *     output?: unknown
 *   },
 *   message?: unknown
 * } | null | undefined} PrepOperationResult
 */

/**
 * @typedef {{
 *   live?: {
 *     ok?: boolean,
 *     outcome?: unknown,
 *     output?: unknown,
 *     deployedUrl?: unknown
 *   },
 *   message?: unknown
 * } | null | undefined} LiveOperationResult
 */

/**
 * @typedef {
 *   | { state: 'idle' }
 *   | { state: 'running', busyLabel: string }
 *   | {
 *       state: 'success' | 'warning' | 'error',
 *       message: string,
 *       technicalDetails: string,
 *       technicalDetailsLabel: string,
 *       technicalDetailsInitiallyExpanded: boolean
 *     }
 * } AsyncOperationPanelModel
 */

/**
 * @param {unknown} value
 * @returns {string}
 */
function text(value) {
  return typeof value === 'string' ? value : '';
}

/**
 * @param {{
 *   state: 'success' | 'warning' | 'error',
 *   message: unknown,
 *   technicalDetails: unknown,
 *   technicalDetailsLabel: string,
 *   technicalDetailsInitiallyExpanded: boolean
 * }} input
 * @returns {AsyncOperationPanelModel}
 */
function terminalModel(input) {
  return {
    state: input.state,
    message: text(input.message),
    technicalDetails: text(input.technicalDetails),
    technicalDetailsLabel: input.technicalDetailsLabel,
    technicalDetailsInitiallyExpanded: input.technicalDetailsInitiallyExpanded
  };
}

/**
 * Convert the consumer-owned build-test state into the public
 * AsyncOperationPanel presentation contract.
 *
 * A newly running operation deliberately hides any previous terminal result.
 *
 * @param {{
 *   running: boolean,
 *   result: PrepOperationResult,
 *   busyLabel: string,
 *   detailsLabel: string
 * }} input
 * @returns {AsyncOperationPanelModel}
 */
export function createPrepOperationPanelModel(input) {
  if (input.running) {
    return {
      state: 'running',
      busyLabel: input.busyLabel
    };
  }

  if (!input.result?.prep) {
    return {
      state: 'idle'
    };
  }

  const successful = input.result.prep.ok === true;

  return terminalModel({
    state: successful ? 'success' : 'error',
    message: input.result.message,
    technicalDetails: input.result.prep.output,
    technicalDetailsLabel: input.detailsLabel,
    technicalDetailsInitiallyExpanded: !successful
  });
}

/**
 * Convert the consumer-owned live-publication state into the public
 * AsyncOperationPanel presentation contract.
 *
 * A partial outcome is a warning because publication may have progressed
 * beyond the point where reporting a complete failure would be accurate.
 *
 * @param {{
 *   running: boolean,
 *   result: LiveOperationResult,
 *   busyLabel: string,
 *   detailsLabel: string
 * }} input
 * @returns {AsyncOperationPanelModel}
 */
export function createLiveOperationPanelModel(input) {
  if (input.running) {
    return {
      state: 'running',
      busyLabel: input.busyLabel
    };
  }

  if (!input.result?.live) {
    return {
      state: 'idle'
    };
  }

  /** @type {'success' | 'warning' | 'error'} */
  let state = 'error';

  if (input.result.live.ok === true) {
    state = 'success';
  } else if (input.result.live.outcome === 'partial') {
    state = 'warning';
  }

  return terminalModel({
    state,
    message: input.result.message,
    technicalDetails: input.result.live.output,
    technicalDetailsLabel: input.detailsLabel,
    technicalDetailsInitiallyExpanded: false
  });
}
