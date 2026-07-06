<script>
  import SiteFooter from '$lib/components/SiteFooter.svelte';
  import KitCredit from '$lib/components/KitCredit.svelte';
  import SiteHeader from '$lib/components/SiteHeader.svelte';
  import { setVisitorI18nContext } from '$lib/i18n/visitor-context.js';
  import { appearanceCssVariables } from '$lib/site-appearance.js';

  let { children, data } = $props();

  setVisitorI18nContext(() => data.locale);

  const appearanceStyle = $derived(
    Object.entries(appearanceCssVariables(data.appearance))
      .map(([key, value]) => `${key}: ${value}`)
      .join('; ')
  );
  const hasBackgroundImage = $derived(Boolean(data.appearance?.background_image));
</script>

<div
  class="site-root"
  class:has-background-image={hasBackgroundImage}
  style={`${appearanceStyle}${hasBackgroundImage ? `; --site-bg-url: url(${data.appearance.background_image})` : ''}`}
>
  <SiteHeader
    site={data.site}
    socialLinks={data.socialLinks}
    footer={data.footerActive ? data.footer : null}
  />
  {@render children()}
  {#if data.footerActive && data.footer}
    <SiteFooter
      footer={data.footer}
      socialLinks={data.footer.show_social ? data.socialLinks : []}
      locale={data.locale}
    />
  {:else}
    <footer class="site-kit-credit-bar">
      <KitCredit locale={data.locale} />
    </footer>
  {/if}
</div>

<style>
  :global(*) {
    box-sizing: border-box;
  }

  :global(body) {
    margin: 0;
    font-family:
      Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI",
      sans-serif;
  }

  :global(a) {
    color: inherit;
  }

  :global(img) {
    max-width: 100%;
  }

  .site-root {
    display: flex;
    flex-direction: column;
    min-height: 100vh;
    color: var(--site-text-color, #2f281f);
    background:
      radial-gradient(
        circle at top left,
        color-mix(in srgb, var(--site-accent-color, #d6be9a) 35%, transparent),
        transparent 32rem
      ),
      var(--site-base-color, #f8f0e4);
  }

  .site-root.has-background-image {
    background:
      radial-gradient(
        circle at top left,
        color-mix(in srgb, var(--site-accent-color, #d6be9a) 35%, transparent),
        transparent 32rem
      ),
      var(--site-bg-url) center top / cover no-repeat,
      var(--site-base-color, #f8f0e4);
  }

  .site-kit-credit-bar {
    width: min(1120px, calc(100% - 2rem));
    margin: 0 auto;
    padding: 0 0 1.25rem;
  }
</style>
