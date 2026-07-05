<script>
  import CatalogSidebar from '$lib/components/CatalogSidebar.svelte';
  import { useVisitorI18n } from '$lib/i18n/visitor-context.js';

  let { data } = $props();
  const t = useVisitorI18n();
</script>

<svelte:head>
  <title>{t('collections.pageTitle')} · {data.site.name}</title>
  <meta name="description" content={t('collections.metaDescription', { siteName: data.site.name })} />
</svelte:head>

<!-- Sidebar layout applies on `/collections` index only; see getCatalogSidebarPageData() in showcase.js -->
<div class="page-shell" class:with-sidebar={data.sidebarActive}>
  <main>
    <nav aria-label={t('common.breadcrumb')}>
      <a href="/">{t('common.home')}</a>
    </nav>

    <header>
      <p class="eyebrow">{t('collections.eyebrow')}</p>
      <h1>{t('collections.title')}</h1>
      <p>{t('collections.intro', { itemPlural: data.catalog.item_name_plural })}</p>
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
      <p>{t('collections.empty')}</p>
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
    padding: 3rem 0 4rem;
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
