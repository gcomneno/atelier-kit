<script>
  import ItemCard from '$lib/components/ItemCard.svelte';

  let { data } = $props();
</script>

<svelte:head>
  <title>{data.collection.title} · {data.site.name}</title>
  <meta name="description" content={data.collection.description} />
</svelte:head>

<main>
  <nav aria-label="Breadcrumb">
    <a href="/">Home</a>
    <span aria-hidden="true">/</span>
    <a href="/collections">Collections</a>
  </nav>

  <header>
    <p class="eyebrow">Collection</p>
    <h1>{data.collection.title}</h1>
    <p>{data.collection.description}</p>
  </header>

  <section aria-labelledby="collection-items-title">
    <div class="section-heading">
      <p class="eyebrow">Selected {data.catalog.item_name_plural}</p>
      <h2 id="collection-items-title">{data.collection.items.length} {data.collection.items.length === 1 ? data.catalog.item_name_singular : data.catalog.item_name_plural}</h2>
    </div>

    <div class="grid">
      {#each data.collection.items as item}
        <ItemCard {item} catalog={data.catalog} />
      {/each}
    </div>
  </section>
</main>

<style>
  main {
    width: min(1120px, calc(100% - 2rem));
    margin: 0 auto;
    padding: 3rem 0 4rem;
  }

  nav {
    display: flex;
    gap: 0.5rem;
    margin-bottom: 3rem;
  }

  a {
    color: inherit;
  }

  header {
    display: grid;
    gap: 1rem;
    margin-bottom: 3rem;
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
    font-size: clamp(3rem, 12vw, 7rem);
    line-height: 0.9;
    letter-spacing: -0.07em;
  }

  header p {
    max-width: 42rem;
    margin: 0;
    color: #4f4236;
    font-size: clamp(1.1rem, 3vw, 1.5rem);
    line-height: 1.4;
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
</style>
