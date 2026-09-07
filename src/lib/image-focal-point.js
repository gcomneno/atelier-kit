/**
 * @param {unknown} value
 * @returns {value is Record<string, unknown>}
 */
function isRecord(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

/**
 * @param {unknown} value
 */
function isValidCoordinate(value) {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 1;
}

/**
 * @param {number} value
 */
function formatPercentage(value) {
  return `${Number((value * 100).toFixed(6))}%`;
}

/**
 * @param {unknown} value
 */
function parseSerializedCoordinate(value) {
  if (typeof value !== 'string') {
    return null;
  }

  const trimmed = value.trim();

  if (!/^(?:0(?:\.\d+)?|1(?:\.0+)?|\.\d+)$/.test(trimmed)) {
    return null;
  }

  const coordinate = Number(trimmed);

  return isValidCoordinate(coordinate) ? coordinate : null;
}

/**
 * @param {unknown} value
 * @returns {value is { x: number, y: number }}
 */
export function isValidImageFocalPoint(value) {
  return (
    isRecord(value) &&
    'x' in value &&
    'y' in value &&
    isValidCoordinate(value.x) &&
    isValidCoordinate(value.y)
  );
}

/**
 * Defensive runtime parser for the persisted image focal-point contract.
 *
 * @param {unknown} value
 * @returns {{ x: number, y: number } | null}
 */
export function parseImageFocalPoint(value) {
  if (!isValidImageFocalPoint(value)) {
    return null;
  }

  return {
    x: value.x,
    y: value.y
  };
}

/**
 * @param {unknown} value
 * @returns {string}
 */
export function getImageFocalPointObjectPosition(value) {
  const focalPoint = parseImageFocalPoint(value);

  if (!focalPoint) {
    return 'center';
  }

  return `${formatPercentage(focalPoint.x)} ${formatPercentage(focalPoint.y)}`;
}


/**
 * Parse focal-point form state.
 *
 * Reset/default is represented by enabled=false with no coordinate values.
 * Enabled submissions must contain both strict normalized coordinates.
 *
 * @param {{ enabled: boolean, x: unknown, y: unknown }} input
 * @returns {{ x: number, y: number } | null}
 */
export function parseImageFocalPointFormFields(input) {
  if (input.enabled !== true) {
    if (input.x === null && input.y === null) {
      return null;
    }

    throw new TypeError('Invalid image focal point.');
  }

  const x = parseSerializedCoordinate(input.x);
  const y = parseSerializedCoordinate(input.y);

  if (x === null || y === null) {
    throw new TypeError('Invalid image focal point.');
  }

  return { x, y };
}
