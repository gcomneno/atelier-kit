<script>
  import EditorialText from '$lib/components/EditorialText.svelte';
  import { splitEditorialParagraphs } from '$lib/editorial-markup.js';
  import { LAYOUT_BLOCK_IDS } from '$lib/layout-blocks.js';
  import { useVisitorI18n } from '$lib/i18n/visitor-context.js';

  /** @typedef {{ id: string, title: string, description: string, items: unknown[] }} Collection */
  /** @typedef {{ title: string, intro: string, sections: { heading: string, body: string }[] }} AboutConfig */
  /** @typedef {{ id: string, title: string, date: string, excerpt?: string, body: string }} NewsPost */
  /** @typedef {{ id: string, title: string }} CatalogItem */
  /** @typedef {{ item_name_plural: string }} CatalogConfig */

  /**
   * @type {{
   *   collections?: Collection[],
   *   about?: AboutConfig | null,
   *   newsPosts?: NewsPost[],
   *   catalogItems?: CatalogItem[],
   *   catalog?: CatalogConfig | null,
   *   site?: { language: string },
   *   blockLabels?: Partial<Record<'about' | 'news' | 'collections' | 'catalog', string>>,
   *   variant?: 'light' | 'dark'
   * }}
   */
  let {
    collections = [],
    about = null,
    newsPosts = [],
    catalogItems = [],
    catalog = null,
    site = { language: 'en' },
    blockLabels = {},
    variant = 'light'
  } = $props();

  const t = useVisitorI18n();

  const aboutSnippet = $derived.by(() => {
    if (!about) {
      return '';
    }

    return aboutTeaser(about);
  });

  const showAbout = $derived(Boolean(about));
  const showNews = $derived(newsPosts.length > 0);
  const showCollections = $derived(collections.length > 0);
  const showCatalog = $derived(catalogItems.length > 0 && catalog);

  const hasWidgets = $derived(showAbout || showNews || showCollections || showCatalog);

  function formatDate(/** @type {string} */ value) {
    const parsed = new Date(`${value}T12:00:00`);

    if (Number.isNaN(parsed.getTime())) {
      return value;
    }

    return parsed.toLocaleDateString(site.language || 'en', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }

  function newsTeaser(/** @type {NewsPost} */ post) {
    if (post.excerpt) {
      return post.excerpt;
    }

    const firstLine = post.body.split('\n').find((/** @type {string} */ line) => line.trim() !== '');

    return firstLine?.trim() ?? '';
  }

  /** @param {AboutConfig} aboutConfig */
  function aboutTeaser(aboutConfig) {
    const source = aboutConfig.intro?.trim() || aboutConfig.sections[0]?.body?.trim() || '';

    if (!source) {
      return '';
    }

    const firstParagraph =
      source
        .split(/\n\s*\n/)
        .map((paragraph) => paragraph.trim())
        .find(Boolean) ?? source;

    return firstParagraph.replace(/\s*\n\s*/g, ' ').trim();
  }
</script>

{#if hasWidgets}
  <aside
    class="catalog-sidebar"
    class:catalog-sidebar--dark={variant === 'dark'}
    aria-label={t('catalog.sidebarAriaLabel')}
  >
    {#each LAYOUT_BLOCK_IDS as blockId (blockId)}
      {#if blockId === 'about' && showAbout && about}
        <section class="widget">
          <h2 class="widget-title">{blockLabels.about ?? about.title}</h2>
          <div class="widget-body">
            {#if aboutSnippet}
              <p class="about-snippet">{aboutSnippet}</p>
            {/if}
          </div>
          <p class="widget-footer">
            <a href="/about">{t('common.readMore')}</a>
          </p>
        </section>
      {:else if blockId === 'news' && showNews}
        <section class="widget">
          <h2 class="widget-title">{blockLabels.news ?? t('catalog.latestNews')}</h2>
          <div class="widget-body">
            <ul class="news-list">
              {#each newsPosts as post (post.id)}
                <li>
                  <a href={`/news/${post.id}`} class="news-link">
                    <time datetime={post.date}>{formatDate(post.date)}</time>
                    <EditorialText tag="span" class="news-title" value={post.title} />
                    {#if newsTeaser(post)}
                      <span class="news-teaser">{newsTeaser(post)}</span>
                    {/if}
                  </a>
                </li>
              {/each}
            </ul>
          </div>
          <p class="widget-footer">
            <a href="/news">{t('common.allNews')}</a>
          </p>
        </section>
      {:else if blockId === 'collections' && showCollections}
        <section class="widget">
          <h2 class="widget-title">{blockLabels.collections ?? t('catalog.collections')}</h2>
          <div class="widget-body">
            {#if collections.length === 1}
              {@const collection = collections[0]}
              <a class="collection-featured" href={`/collections/${collection.id}`}><EditorialText value={collection.title} /></a>
              {#if collection.description}
                {#each splitEditorialParagraphs(collection.description) as paragraph}
                  <EditorialText tag="p" class="collection-snippet" value={paragraph} />
                {/each}
              {/if}
            {:else}
              <ul class="link-list">
                {#each collections as collection (collection.id)}
                  <li>
                    <a href={`/collections/${collection.id}`}><EditorialText value={collection.title} /></a>
                  </li>
                {/each}
              </ul>
            {/if}
          </div>
          <p class="widget-footer">
            {#if collections.length === 1}
              {@const collection = collections[0]}
              <a href={`/collections/${collection.id}`}>{t('common.readMore')}</a>
            {:else}
              <a href="/collections">{t('common.viewAllCollections')}</a>
            {/if}
          </p>
        </section>
      {:else if blockId === 'catalog' && showCatalog && catalog}
        <section class="widget">
          <h2 class="widget-title">{blockLabels.catalog ?? catalog.item_name_plural}</h2>
          <div class="widget-body">
            <ul class="link-list">
              {#each catalogItems as item (item.id)}
                <li>
                  <a href={`/items/${item.id}`}><EditorialText value={item.title} /></a>
                </li>
              {/each}
            </ul>
          </div>
        </section>
      {/if}
    {/each}
  </aside>
{/if}

<style>
  .catalog-sidebar {
    --sidebar-title-size: 1.125rem;
    --sidebar-title-weight: 700;
    --sidebar-title-tracking: 0.03em;
    --sidebar-title-color: var(--site-heading-color, var(--site-text-color, #2f281f));
    --sidebar-link-size: 0.8125rem;
    --sidebar-link-weight: 600;
    --sidebar-link-color: var(--site-text-color, #2f281f);
    --sidebar-body-size: 0.8125rem;
    --sidebar-body-weight: 400;
    --sidebar-body-color: var(--site-muted-text-color, #7b6a58);
    --sidebar-meta-size: 0.6875rem;
    --sidebar-meta-color: color-mix(
      in srgb,
      var(--site-accent-color, #d6be9a) 28%,
      var(--site-muted-text-color, #7d684f)
    );
    --sidebar-footer-size: 0.8125rem;

    display: grid;
    gap: 1.5rem;
    align-content: start;
  }

  .widget {
    --sidebar-widget-height: 13rem;
    display: grid;
    grid-template-rows: auto minmax(0, 1fr) auto;
    height: var(--sidebar-widget-height);
    overflow: hidden;
    border: 1px solid var(--site-border-color, #e4d8c7);
    border-radius: 1.1rem;
    background: var(--site-card-color, #fffaf2);
    box-shadow:
      0 1px 0 color-mix(in srgb, var(--site-text-color, #2f281f) 6%, transparent) inset,
      0 18px 44px rgb(0 0 0 / 0.1);
  }

  .widget:not(:has(.widget-footer)) {
    grid-template-rows: auto minmax(0, 1fr);
  }

  .widget-title {
    margin: 0;
    padding: 0.82rem 1rem 0.72rem;
    border-bottom: 1px solid var(--site-border-color, #e4d8c7);
    background: color-mix(in srgb, var(--site-accent-color, #d6be9a) 14%, var(--site-card-color, #fffaf2));
    color: var(--sidebar-title-color);
    font-size: var(--sidebar-title-size);
    font-weight: var(--sidebar-title-weight);
    letter-spacing: var(--sidebar-title-tracking);
    line-height: 1.25;
    text-transform: none;
  }

  .widget-body {
    min-height: 0;
    overflow-y: auto;
    display: grid;
    gap: 0.45rem;
    align-content: start;
    padding: 0.65rem 0.85rem 0.3rem;
    color: var(--sidebar-body-color);
    font-size: var(--sidebar-body-size);
    font-weight: var(--sidebar-body-weight);
    line-height: 1.5;
    scrollbar-width: thin;
    scrollbar-color: color-mix(in srgb, var(--site-text-color, #2f281f) 24%, transparent) transparent;
  }

  .link-list,
  .news-list {
    list-style: none;
    margin: 0;
    padding: 0;
    display: grid;
    gap: 0.2rem;
  }

  .link-list a,
  .collection-featured {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.45rem;
    padding: 0.42rem 0.55rem;
    border-radius: 0.55rem;
    color: var(--sidebar-link-color);
    font-size: var(--sidebar-link-size);
    font-weight: var(--sidebar-link-weight);
    line-height: 1.35;
    text-decoration: none;
    transition:
      background-color 140ms ease,
      color 140ms ease;
  }

  .link-list a::after {
    content: '→';
    flex-shrink: 0;
    color: var(--site-accent-color, #8c3a44);
    font-size: 0.75rem;
    opacity: 0.45;
    transition: opacity 140ms ease;
  }

  .link-list a:hover,
  .collection-featured:hover {
    background: color-mix(in srgb, var(--site-accent-color, #d6be9a) 12%, var(--site-card-color, #fffaf2));
    text-decoration: none;
  }

  .link-list a:hover::after {
    opacity: 1;
  }

  .collection-featured {
    display: block;
    font-size: calc(var(--sidebar-link-size) + 0.0625rem);
    font-weight: 700;
    color: color-mix(
      in srgb,
      var(--sidebar-link-color) 82%,
      var(--site-accent-color, #d6be9a)
    );
  }

  :global(.collection-snippet) {
    margin: 0;
    padding: 0 0.55rem;
    color: var(--sidebar-body-color);
    font-size: calc(var(--sidebar-body-size) - 0.03125rem);
    font-weight: var(--sidebar-body-weight);
    line-height: 1.55;
    white-space: pre-line;
  }

  .widget-footer a {
    color: var(--site-accent-color, #8c3a44);
    font-size: var(--sidebar-footer-size);
    font-weight: 600;
    text-decoration: none;
  }

  .widget-footer a:hover {
    text-decoration: underline;
  }

  .about-snippet {
    margin: 0;
    padding: 0 0.2rem;
    color: var(--sidebar-body-color);
    font-size: var(--sidebar-body-size);
    font-weight: var(--sidebar-body-weight);
    line-height: 1.55;
    display: -webkit-box;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 3;
    line-clamp: 3;
    overflow: hidden;
  }

  .news-link {
    display: grid;
    gap: 0.18rem;
    padding: 0.45rem 0.55rem;
    border-radius: 0.55rem;
    color: inherit;
    text-decoration: none;
    transition: background-color 140ms ease;
  }

  .news-link:hover {
    background: color-mix(in srgb, var(--site-accent-color, #d6be9a) 12%, var(--site-card-color, #fffaf2));
    text-decoration: none;
  }

  time {
    color: var(--sidebar-meta-color);
    font-size: var(--sidebar-meta-size);
    font-weight: 600;
    letter-spacing: 0.05em;
    text-transform: uppercase;
  }

  :global(.news-title) {
    color: var(--sidebar-link-color);
    font-size: var(--sidebar-link-size);
    font-weight: var(--sidebar-link-weight);
    line-height: 1.35;
  }

  .news-teaser {
    color: var(--sidebar-body-color);
    font-size: calc(var(--sidebar-body-size) - 0.03125rem);
    font-weight: var(--sidebar-body-weight);
    line-height: 1.45;
  }

  .widget-footer {
    margin: 0;
    padding: 0.55rem 1rem 0.72rem;
    border-top: 1px solid var(--site-border-color, #e4d8c7);
    text-align: right;
  }

  .catalog-sidebar--dark {
    --sidebar-title-color: var(--site-heading-color, var(--site-text-color, #f8f4ec));
    --sidebar-meta-color: color-mix(
      in srgb,
      var(--site-accent-color, #e4c4a0) 34%,
      var(--site-muted-text-color, #c8bfb0)
    );
  }

  .catalog-sidebar--dark .widget {
    box-shadow:
      0 1px 0 color-mix(in srgb, var(--site-text-color, #f8f4ec) 8%, transparent) inset,
      0 18px 44px rgb(0 0 0 / 0.28);
  }

  .catalog-sidebar--dark .widget-title {
    background: color-mix(in srgb, var(--site-accent-color, #e4c4a0) 18%, var(--site-card-color, #2f2e2c));
  }

  .catalog-sidebar--dark .link-list a:hover,
  .catalog-sidebar--dark .collection-featured:hover,
  .catalog-sidebar--dark .news-link:hover {
    background: color-mix(in srgb, var(--site-accent-color, #e4c4a0) 14%, var(--site-card-color, #2f2e2c));
  }
</style>
