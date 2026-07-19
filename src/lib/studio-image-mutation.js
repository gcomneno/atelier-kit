/**
 * @typedef {'none' | 'add' | 'replace' | 'remove'} StudioImageMutationState
 */

/**
 * Browser-independent state machine for one image upload/removal pair.
 * @param {{ hasExisting?: boolean }} [options]
 */
export function createStudioImageMutation(options = {}) {
  let hasExisting = options.hasExisting === true;
  let hasUpload = false;
  let remove = false;

  function snapshot() {
    /** @type {StudioImageMutationState} */
    const state = remove ? 'remove' : hasUpload ? (hasExisting ? 'replace' : 'add') : 'none';
    return { state, hasUpload, remove };
  }

  return {
    snapshot,
    /** @param {{ size?: number } | null | undefined} file */
    selectFile(file) {
      hasUpload = Boolean(file && typeof file.size === 'number' && file.size > 0);
      if (hasUpload) remove = false;
      return snapshot();
    },
    /** @param {boolean} checked */
    setRemove(checked) {
      remove = checked;
      if (remove) hasUpload = false;
      return snapshot();
    },
    /** @param {boolean} nextHasExisting */
    reset(nextHasExisting = hasExisting) {
      hasExisting = nextHasExisting;
      hasUpload = false;
      remove = false;
      return snapshot();
    }
  };
}

/**
 * Keep the Hero visibility value reversible while image removal is selected.
 * @param {boolean} initialShow
 */
export function createHeroBannerRemoval(initialShow = false) {
  let previousShow = initialShow;
  let removing = false;

  return {
    /** @param {boolean} remove @param {boolean} currentShow */
    update(remove, currentShow) {
      if (remove && !removing) previousShow = currentShow;
      const nextShow = remove ? false : removing ? previousShow : currentShow;
      removing = remove;
      return { remove: removing, show: nextShow };
    },
    /** @param {boolean} show */
    reset(show) {
      previousShow = show;
      removing = false;
      return { remove: false, show };
    }
  };
}
