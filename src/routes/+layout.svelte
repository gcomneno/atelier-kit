<script>
  import { appearanceCssVariables } from '$lib/site-appearance.js';

  let { children, data } = $props();

  const appearanceStyle = $derived(
    Object.entries(appearanceCssVariables(data.appearance))
      .map(([key, value]) => `${key}: ${value}`)
      .join('; ')
  );
</script>

<div class="site-root" style={appearanceStyle}>
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
</style>
