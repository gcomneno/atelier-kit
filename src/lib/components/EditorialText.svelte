<script>
  import {
    EDITORIAL_MARK_CLASSES,
    parseEditorialMarkup,
    resolveTaglineQuoteColor,
    resolveTaglineWrap
  } from '$lib/editorial-markup.js';

  /** @type {{ value?: string, display?: { wrap?: string, quote_color?: string } | null, tag?: string, class?: string }} */
  let { value = '', display = null, tag = 'span', class: className = '' } = $props();

  const parsed = $derived(parseEditorialMarkup(value));
  const wrap = $derived(resolveTaglineWrap(display?.wrap));
  const quoteColor = $derived(resolveTaglineQuoteColor(display?.quote_color));
  const quoteClass = $derived(EDITORIAL_MARK_CLASSES[quoteColor]);
  const useComponentQuotes = $derived(wrap === 'epigraph');
</script>

{#if parsed.ok}
  <svelte:element this={tag} class={className} class:hero-epigraph--component-quotes={useComponentQuotes}>
    {#if useComponentQuotes}
      <span class="epigraph-quote {quoteClass}" aria-hidden="true">«</span>
    {/if}
    {@html parsed.html}
    {#if useComponentQuotes}
      <span class="epigraph-quote {quoteClass}" aria-hidden="true">»</span>
    {/if}
  </svelte:element>
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

  :global(.hero-epigraph--component-quotes)::before,
  :global(.hero-epigraph--component-quotes)::after {
    content: none;
  }

  :global(.epigraph-quote) {
    font-style: inherit;
    font-weight: inherit;
  }
</style>
