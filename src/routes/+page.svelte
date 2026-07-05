<script>
  import CatalogSidebar from '$lib/components/CatalogSidebar.svelte';
  import ItemCard from '$lib/components/ItemCard.svelte';

  let { data } = $props();
</script>

<svelte:head>
  <title>{data.site.name}</title>
  <meta name="description" content={data.site.tagline} />
</svelte:head>

<!-- Sidebar layout applies on home (`/`) only; see getCatalogSidebarPageData() in showcase.js -->
<div class="page-shell" class:with-sidebar={data.sidebarActive}>
  <main>
    <section class="hero">
      <h1>{data.site.name}</h1>
      <p class="tagline">{data.site.tagline}</p>

      {#if data.site.notice}
        <p class="notice">{data.site.notice}</p>
      {/if}
    </section>

    {#if data.collections.length > 0}
      <section class="collections" aria-labelledby="collections-title">
        <div class="section-heading">
          <p class="eyebrow">Collections</p>
          <h2 id="collections-title">Curated pages</h2>
        </div>

        <div class="collection-grid">
          {#each data.collections as collection}
            <a class="collection-card" href={`/collections/${collection.id}`}>
              <h3>{collection.title}</h3>
              <p>{collection.description}</p>
              <span>{collection.items.length} {collection.items.length === 1 ? data.catalog.item_name_singular : data.catalog.item_name_plural}</span>
            </a>
          {/each}
        </div>

        <p class="text-link"><a href="/collections">View all collections</a></p>
      </section>
    {/if}

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

    {#if !data.footerActive}
      <footer>
        <p>{data.site.footer_note}</p>
        {#if data.aboutAvailable}
          <p class="footer-link"><a href="/about">About the studio</a></p>
        {/if}
      </footer>
    {/if}
  </main>

  {#if data.sidebarActive && data.sidebar}
    <CatalogSidebar
      collections={data.sidebar.collections}
      about={data.sidebar.about}
      newsPosts={data.sidebar.newsPosts}
      widgets={data.layout.sidebar}
      site={data.site}
    />
  {/if}
</div>

<style>
  .page-shell {
    width: min(1120px, calc(100% - 2rem));
    margin: 0 auto;
    padding: 4rem 0 2rem;
  }

  .page-shell.with-sidebar {
    display: grid;
    gap: 2rem;
    grid-template-columns: minmax(0, 1fr);
    align-items: start;
  }

  @media (min-width: 960px) {
    .page-shell.with-sidebar {
      grid-template-columns: minmax(0, 1fr) 280px;
    }
  }

  main {
    min-width: 0;
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

  .collections,
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

  .collection-grid,
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

  .collection-card h3 {
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

  .text-link {
    margin: 1.4rem 0 0;
  }

  .text-link a {
    color: #5f4529;
    font-weight: 800;
  }

  footer {
    border-top: 1px solid #e3d4bf;
    padding-top: 1.5rem;
    color: #7b6a58;
  }

  footer p {
    margin: 0;
  }

  .footer-link {
    margin-top: 0.65rem;
  }

  .footer-link a {
    color: #5f4529;
    font-weight: 700;
  }
</style>
