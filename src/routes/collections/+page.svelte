<script>
  import CatalogSidebar from '$lib/components/CatalogSidebar.svelte';
  import EditorialText from '$lib/components/EditorialText.svelte';
  import { splitEditorialParagraphs } from '$lib/editorial-markup.js';
  import { formatPageTitle, resolveDocumentTitle } from '$lib/site-branding.js';
  import { useVisitorI18n } from '$lib/i18n/visitor-context.js';

  let { data } = $props();
  const t = useVisitorI18n();

  const siteLabel = $derived(resolveDocumentTitle(data.site));
  const pageTitle = $derived(formatPageTitle(t('collections.pageTitle'), data.site));
  const metaDescription = $derived(
    siteLabel
      ? t('collections.metaDescription', { siteName: siteLabel })
      : t('collections.intro', { itemPlural: data.catalog.item_name_plural })
  );
</script>

<svelte:head>
  <title>{pageTitle}</title>
  <meta name="description" content={metaDescription} />
</svelte:head>

<!-- Sidebar layout applies on `/collections` index only; see getCatalogSidebarPageData() in showcase.js -->
<div class="page-shell" class:with-sidebar={data.sidebarActive}>
  <main>
    <div class="page-intro">
      <div class="page-intro-main">
        <nav aria-label={t('common.breadcrumb')}>
          <a href="/">{t('common.home')}</a>
        </nav>

        <header>
          <p class="eyebrow">{data.pageEyebrow}</p>
          <h1>{t('collections.title')}</h1>
          <p>{t('collections.intro', { itemPlural: data.catalog.item_name_plural })}</p>
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

    {#if data.collections.length > 0}
      <div class="grid">
        {#each data.collections as collection}
          <a class="collection-card" href={`/collections/${collection.id}`}>
            <h2><EditorialText value={collection.title} /></h2>
            {#each splitEditorialParagraphs(collection.description) as paragraph}
              <EditorialText tag="p" value={paragraph} />
            {/each}
            <span>{collection.items.length} {collection.items.length === 1 ? data.catalog.item_name_singular : data.catalog.item_name_plural}</span>
          </a>
        {/each}
      </div>
    {:else}
      <p>{t('collections.empty')}</p>
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
    color: var(--site-heading-color, var(--site-text-color, #2f281f));
  }

  header p {
    max-width: 42rem;
    margin: 0;
    color: var(--site-text-color, #2f281f);
    color: color-mix(in srgb, var(--site-text-color, #2f281f) 82%, transparent);
    font-size: clamp(1.1rem, 3vw, 1.5rem);
    line-height: 1.4;
  }

  .grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(min(100%, 18rem), 1fr));
    justify-content: center;
    gap: 1.2rem;
  }

  .collection-card {
    display: grid;
    gap: 0.75rem;
    padding: 1.4rem;
    color: var(--site-text-color, #2f281f);
    text-decoration: none;
    background: var(--site-card-color, #fffaf2);
    border: 1px solid var(--site-border-color, #e4d8c7);
    border-radius: 28px;
    box-shadow: 0 20px 70px rgb(0 0 0 / 0.08);
    transition:
      transform 160ms ease,
      box-shadow 160ms ease,
      border-color 160ms ease;
    overflow: hidden;
  }

  .collection-card:hover {
    transform: translateY(-3px);
    border-color: color-mix(in srgb, var(--site-accent-color, #c9ad89) 70%, var(--site-border-color, #e4d8c7));
    box-shadow: 0 24px 90px rgb(0 0 0 / 0.14);
  }

  .collection-card h2 {
    margin: -1.4rem -1.4rem 0;
    padding: 0.82rem 1.4rem;
    border-radius: 28px 28px 0 0;
    background: color-mix(in srgb, var(--site-accent-color, #d6be9a) 14%, var(--site-card-color, #fffaf2));
    color: var(--site-heading-color, var(--site-text-color, #2f281f));
    font-size: clamp(1.35rem, 4vw, 1.75rem);
  }

  .collection-card :global(p) {
    margin: 0;
    color: var(--site-muted-text-color, #7b6a58);
    line-height: 1.6;
  }

  .collection-card span {
    color: var(--site-muted-text-color, #7b6a58);
    font-size: 0.85rem;
    font-weight: 700;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }
</style>
