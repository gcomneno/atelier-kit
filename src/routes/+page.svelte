<script>
  import ItemCard from '$lib/components/ItemCard.svelte';

  let { data } = $props();
</script>

<svelte:head>
  <title>{data.site.name}</title>
  <meta name="description" content={data.site.tagline} />
</svelte:head>

<main>
  <section class="hero">
    <p class="eyebrow">Configurable showcase kit</p>
    <h1>{data.site.name}</h1>
    <p class="tagline">{data.site.tagline}</p>

    {#if data.site.notice}
      <p class="notice">{data.site.notice}</p>
    {/if}
  </section>

  <section class="catalog" aria-labelledby="catalog-title">
    <div class="section-heading">
      <p class="eyebrow">Catalog</p>
      <h2 id="catalog-title">{data.items.length} {data.catalog.item_name_plural}</h2>
    </div>

    <div class="grid">
      {#each data.items as item}
        <ItemCard {item} catalog={data.catalog} />
      {/each}
    </div>
  </section>

  <footer>
    {data.site.footer_note}
  </footer>
</main>

<style>
  main {
    width: min(1120px, calc(100% - 2rem));
    margin: 0 auto;
    padding: 4rem 0 2rem;
  }

  .hero {
    display: grid;
    gap: 1rem;
    min-height: 48vh;
    align-content: center;
    padding: 4rem 0;
  }

  .eyebrow {
    margin: 0;
    color: #7d684f;
    font-size: 0.8rem;
    font-weight: 800;
    letter-spacing: 0.14em;
    text-transform: uppercase;
  }

  h1 {
    max-width: 12ch;
    margin: 0;
    font-size: clamp(4rem, 16vw, 9rem);
    line-height: 0.9;
    letter-spacing: -0.08em;
  }

  .tagline {
    max-width: 42rem;
    margin: 0;
    color: #4f4236;
    font-size: clamp(1.2rem, 4vw, 1.9rem);
    line-height: 1.35;
  }

  .notice {
    width: fit-content;
    max-width: 46rem;
    margin: 1rem 0 0;
    padding: 1rem 1.2rem;
    border: 1px solid #dfc9aa;
    border-radius: 20px;
    color: #5d4a36;
    background: rgb(255 250 242 / 0.72);
  }

  .catalog {
    padding: 2rem 0 4rem;
  }

  .section-heading {
    margin-bottom: 1.6rem;
  }

  .section-heading h2 {
    margin: 0.25rem 0 0;
    font-size: clamp(2rem, 7vw, 4rem);
  }

  .grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(min(100%, 18rem), 1fr));
    gap: 1.2rem;
  }

  footer {
    border-top: 1px solid #e3d4bf;
    padding-top: 1.5rem;
    color: #7b6a58;
  }
</style>
