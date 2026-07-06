// @ts-nocheck

/**
 * SvelteKit's default enhance resets the form after a successful save.
 * With Svelte 5 one-way `value={...}` bindings that clears fields in the UI
 * even though the action returns fresh data. Keep DOM values after save.
 */
export function studioFormEnhance() {
  return async ({ update }) => {
    await update({ reset: false });
  };
}
