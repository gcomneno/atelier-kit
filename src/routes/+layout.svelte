<script>
  let { children } = $props();
</script>

{@render children()}

<style>
  :global(*) {
    box-sizing: border-box;
  }

  :global(body) {
    margin: 0;
    color: #2f281f;
    background:
      radial-gradient(circle at top left, rgb(214 190 154 / 0.35), transparent 32rem),
      #f8f0e4;
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
</style>
