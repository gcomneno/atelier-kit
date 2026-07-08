<script>
  /** @type {{ data: Record<string, unknown> }} */
  let { data } = $props();

  const serialized = $derived(
    JSON.stringify(data).replace(/</g, '\\u003c').replace(/>/g, '\\u003e')
  );
</script>

<svelte:head>
  {@html `<script type="application/ld+json">${serialized}</script>`}
</svelte:head>
