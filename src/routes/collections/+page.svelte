<script>
  let { data } = $props();
</script>

<svelte:head>
  <title>Collections · {data.site.name}</title>
  <meta name="description" content={`Curated collections from ${data.site.name}.`} />
</svelte:head>

<main>
  <nav aria-label="Breadcrumb">
    <a href="/">Home</a>
  </nav>

  <header>
    <p class="eyebrow">Collections</p>
    <h1>Curated pages</h1>
    <p>Small file-based selections built from existing {data.catalog.item_name_plural}.</p>
  </header>

  {#if data.collections.length > 0}
    <div class="grid">
      {#each data.collections as collection}
        <a class="collection-card" href={`/collections/${collection.id}`}>
          <h2>{collection.title}</h2>
          <p>{collection.description}</p>
          <span>{collection.items.length} {collection.items.length === 1 ? data.catalog.item_name_singular : data.catalog.item_name_plural}</span>
        </a>
      {/each}
    </div>
  {:else}
    <p>No collections yet.</p>
  {/if}
</main>

<style>
  main {
    width: min(1120px, calc(100% - 2rem));
    margin: 0 auto;
    padding: 3rem 0 4rem;
  }

  nav {
    margin-bottom: 3rem;
  }

  a {
    color: inherit;
  }

  header {
    display: grid;
    gap: 1rem;
    margin-bottom: 2rem;
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

  .grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(min(100%, 18rem), 1fr));
    gap: 1.2rem;
  }

  .collection-card {
    display: grid;
    gap: 0.75rem;
    padding: 1.4rem;
    color: inherit;
    text-decoration: none;
    background: #fffaf2;
    border: 1px solid #e4d8c7;
    border-radius: 28px;
    box-shadow: 0 20px 70px rgb(36 27 18 / 0.08);
    transition:
      transform 160ms ease,
      box-shadow 160ms ease,
      border-color 160ms ease;
  }

  .collection-card:hover {
    transform: translateY(-3px);
    border-color: #c9ad89;
    box-shadow: 0 24px 90px rgb(36 27 18 / 0.14);
  }

  .collection-card h2 {
    margin: 0;
    font-size: clamp(1.35rem, 4vw, 1.75rem);
  }

  .collection-card p {
    margin: 0;
    color: #4f4236;
    line-height: 1.6;
  }

  .collection-card span {
    color: #7b6a58;
    font-size: 0.85rem;
    font-weight: 700;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }
</style>
