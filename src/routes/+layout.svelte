<script>
  import SiteHeader from '$lib/components/SiteHeader.svelte';
  import { appearanceCssVariables } from '$lib/site-appearance.js';

  let { children, data } = $props();

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
  <SiteHeader site={data.site} socialLinks={data.socialLinks} />
  {@render children()}
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
</style>
