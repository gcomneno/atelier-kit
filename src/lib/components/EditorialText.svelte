<script>
  import { parseEditorialMarkup } from '$lib/editorial-markup.js';

  /** @type {{ value?: string, tag?: string, class?: string }} */
  let { value = '', tag = 'span', class: className = '' } = $props();

  const parsed = $derived(parseEditorialMarkup(value));
</script>

{#if parsed.ok}
  <svelte:element this={tag} class={className}>{@html parsed.html}</svelte:element>
{:else}
  <svelte:element this={tag} class={className}>{value}</svelte:element>
{/if}

<style>
  :global(.mark-accent) {
    color: var(--site-accent-color, #d6be9a);
  }

  :global(.mark-intro) {
    color: var(--site-intro-title-color, var(--site-heading-color, var(--site-text-color, #2f281f)));
  }

  :global(.mark-heading) {
    color: var(--site-heading-color, var(--site-text-color, #2f281f));
  }

  :global(.mark-muted) {
    color: color-mix(in srgb, var(--site-text-color, #2f281f) 72%, transparent);
  }

  :global(.mark-text) {
    color: var(--site-text-color, #2f281f);
  }

</style>
