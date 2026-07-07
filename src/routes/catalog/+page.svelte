<script>
  import CatalogSidebar from '$lib/components/CatalogSidebar.svelte';
  import ItemCard from '$lib/components/ItemCard.svelte';
  import { useVisitorI18n } from '$lib/i18n/visitor-context.js';

  let { data } = $props();
  const t = useVisitorI18n();

  const catalogEyebrow = $derived(data.catalog.eyebrow || t('home.catalogEyebrow'));
  const catalogIntro = $derived(
    data.catalog.intro.trim() ||
      t('catalogListing.intro', { itemPlural: data.catalog.item_name_plural })
  );
</script>

<svelte:head>
  <title>{data.blockLabels.catalog} · {data.site.name}</title>
  <meta
    name="description"
    content={t('catalogListing.metaDescription', {
      itemPlural: data.catalog.item_name_plural,
      siteName: data.site.name
    })}
  />
</svelte:head>

<div class="page-shell" class:with-sidebar={data.sidebarActive}>
  <main>
    <div class="page-intro">
      <div class="page-intro-main">
        <nav aria-label={t('common.breadcrumb')}>
          <a href="/">{t('common.home')}</a>
        </nav>

        <header>
          <p class="eyebrow">{catalogEyebrow}</p>
          <h1>{data.items.length} {data.items.length === 1 ? data.catalog.item_name_singular : data.catalog.item_name_plural}</h1>
          <p>
            {catalogIntro}
          </p>
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

    {#if data.items.length > 0}
      <div class="grid">
        {#each data.items as item}
          <ItemCard {item} />
        {/each}
      </div>
    {:else}
      <p class="empty">{t('catalogListing.empty')}</p>
    {/if}
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
    margin-bottom: 2rem;
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
    margin-bottom: 1.25rem;
  }

  nav a {
    color: color-mix(in srgb, var(--site-text-color, #2f281f) 72%, transparent);
    text-decoration: none;
    font-weight: 600;
  }

  nav a:hover {
    color: var(--site-text-color, #2f281f);
  }

  header {
    display: grid;
    gap: 1rem;
    margin-bottom: 0;
  }

  .eyebrow {
    margin: 0;
    color: color-mix(in srgb, var(--site-accent-color, #7d684f) 72%, var(--site-text-color, #2f281f));
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

  header p,
  .empty {
    max-width: 42rem;
    margin: 0;
    color: color-mix(in srgb, var(--site-text-color, #2f281f) 82%, transparent);
    font-size: clamp(1.1rem, 3vw, 1.5rem);
    line-height: 1.4;
    white-space: pre-line;
  }

  .grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(min(100%, 18rem), 22rem));
    justify-content: center;
    align-items: start;
    gap: 1.2rem;
  }
</style>
