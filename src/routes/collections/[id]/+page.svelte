<script>
  import CatalogSidebar from '$lib/components/CatalogSidebar.svelte';
  import ItemCard from '$lib/components/ItemCard.svelte';
  import { useVisitorI18n } from '$lib/i18n/visitor-context.js';

  let { data } = $props();
  const t = useVisitorI18n();
</script>

<svelte:head>
  <title>{data.collection.title} · {data.site.name}</title>
  <meta name="description" content={data.collection.description} />
</svelte:head>

<div class="page-shell" class:with-sidebar={data.sidebarActive}>
  <main>
    <div class="page-intro">
      <div class="page-intro-main">
        <nav aria-label={t('common.breadcrumb')}>
          <a href="/">{t('common.home')}</a>
          <span aria-hidden="true">/</span>
          <a href="/collections">{t('collections.pageTitle')}</a>
        </nav>

        <header>
          <p class="eyebrow">{t('collections.collectionEyebrow')}</p>
          <h1>{data.collection.title}</h1>
          <p>{data.collection.description}</p>
        </header>
      </div>

      {#if data.sidebarActive && data.sidebar}
        <aside class="page-sidebar">
          <CatalogSidebar
            collections={data.sidebar.collections}
            about={data.sidebar.about}
            newsPosts={data.sidebar.newsPosts}
            catalogItems={data.sidebar.catalogItems}
            catalog={data.sidebar.catalog}
            site={data.site}
            blockLabels={data.blockLabels}
          />
        </aside>
      {/if}
    </div>

    <section aria-labelledby="collection-items-title">
      <div class="section-heading">
        <p class="eyebrow">{t('collections.selectedItemsEyebrow', { itemPlural: data.catalog.item_name_plural })}</p>
        <h2 id="collection-items-title">{data.collection.items.length} {data.collection.items.length === 1 ? data.catalog.item_name_singular : data.catalog.item_name_plural}</h2>
      </div>

      <div class="grid">
        {#each data.collection.items as item}
          <ItemCard {item} />
        {/each}
      </div>
    </section>
  </main>
</div>

<style>
  .page-shell {
    width: min(1120px, calc(100% - 2rem));
    margin: 0 auto;
    padding: 0.75rem 0 4rem;
  }

  .page-shell.with-sidebar .page-intro {
    display: grid;
    gap: 2rem;
    align-items: start;
    margin-bottom: 3rem;
  }

  @media (min-width: 960px) {
    .page-shell.with-sidebar .page-intro {
      grid-template-columns: minmax(0, 1fr) 280px;
    }
  }

  main {
    min-width: 0;
  }

  .page-intro-main {
    min-width: 0;
  }

  .page-sidebar {
    min-width: 0;
  }

  nav {
    display: flex;
    gap: 0.5rem;
    margin-bottom: 1.25rem;
  }

  a {
    color: inherit;
  }

  header {
    display: grid;
    gap: 1rem;
    margin-bottom: 0;
  }

  .eyebrow {
    margin: 0;
    color: color-mix(in srgb, var(--site-text-color, #2f281f) 68%, transparent);
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
    color: color-mix(in srgb, var(--site-text-color, #2f281f) 92%, transparent);
    font-size: clamp(1.1rem, 3vw, 1.5rem);
    line-height: 1.4;
    white-space: pre-line;
  }

  .section-heading {
    margin-bottom: 1.6rem;
    text-align: center;
  }

  .section-heading h2 {
    margin: 0.25rem 0 0;
    font-size: clamp(2rem, 7vw, 4rem);
  }

  .grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(min(100%, 18rem), 22rem));
    justify-content: center;
    align-items: start;
    gap: 1.2rem;
  }
</style>
