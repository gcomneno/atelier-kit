// @ts-nocheck

/**
 * @typedef {{ resetBaseline?: () => void, checkDirty?: () => void }} StudioFormDirtyControl
 */

/**
 * @param {HTMLFormElement} form
 */
export function serializeStudioForm(form) {
  const data = new FormData(form);
  /** @type {string[]} */
  const parts = [];

  for (const [key, value] of data.entries()) {
    if (value instanceof File) {
      parts.push(`${key}\0file:${value.name}:${value.size}`);
      continue;
    }

    parts.push(`${key}\0${String(value)}`);
  }

  return JSON.stringify(parts);
}

/**
 * @param {HTMLFormElement} node
 * @param {{ setDirty: (dirty: boolean) => void, dirtyControl: { resetBaseline?: () => void, checkDirty?: () => void } }} params
 */
export function studioFormDirty(node, params) {
  let baseline = '';

  function captureBaseline() {
    baseline = serializeStudioForm(node);
    params.setDirty(false);
  }

  function checkDirty() {
    params.setDirty(serializeStudioForm(node) !== baseline);
  }

  node.addEventListener('input', checkDirty);
  node.addEventListener('change', checkDirty);
  params.dirtyControl.resetBaseline = captureBaseline;
  params.dirtyControl.checkDirty = checkDirty;
  queueMicrotask(captureBaseline);

  return {
    update(next) {
      params = next;
      params.dirtyControl.resetBaseline = captureBaseline;
      params.dirtyControl.checkDirty = checkDirty;
    },
    destroy() {
      node.removeEventListener('input', checkDirty);
      node.removeEventListener('change', checkDirty);
      delete params.dirtyControl.resetBaseline;
      delete params.dirtyControl.checkDirty;
    }
  };
}

/**
 * @param {{ resetBaseline?: () => void, checkDirty?: () => void }} dirtyControl
 * @param {(input: { update: Function }) => Promise<void>} [afterUpdate]
 */
export function studioFormEnhanceDirty(dirtyControl, afterUpdate) {
  return async ({ update }) => {
    await update({ reset: false });
    await afterUpdate?.({ update });
    dirtyControl.resetBaseline?.();
  };
}
