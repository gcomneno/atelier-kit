// @ts-nocheck

export function createReadinessActionState(initialForm) {
  return {
    pending: {
      prep: false,
      live: false
    },
    results: {
      prep: initialForm?.prep ? initialForm : null,
      live: initialForm?.live ? initialForm : null
    },
    start(action) {
      if (this.pending.prep || this.pending.live) return false;
      this.pending[action] = true;
      return true;
    },
    complete(action, actionResult) {
      const data = actionResult?.data;
      if ((actionResult?.type === 'success' || actionResult?.type === 'failure') && data?.[action]) {
        this.results[action] = data;
      }
      this.pending[action] = false;
    }
  };
}
