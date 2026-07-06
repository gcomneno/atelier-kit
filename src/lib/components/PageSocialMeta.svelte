<script>
  /** @type {{ title?: string, description?: string, image?: string }} */
  let { title = '', description = '', image = '' } = $props();
</script>

<svelte:head>
  {#if title}
    <meta property="og:title" content={title} />
  {/if}
  {#if description}
    <meta property="og:description" content={description} />
  {/if}
  {#if image}
    <meta property="og:image" content={image} />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:image" content={image} />
  {/if}
</svelte:head>
