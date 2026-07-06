<script>
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
    variant = 'light'
  } = $props();

  const t = useVisitorI18n();

  const aboutSnippet = $derived.by(() => {
    if (!about) {
      return '';
    }

    if (about.intro) {
      return about.intro;
    }

    return about.sections[0]?.body ?? '';
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
          <h2 class="widget-title">{about.title}</h2>
          {#if aboutSnippet}
            <p class="about-snippet">{aboutSnippet}</p>
          {/if}
          <p class="widget-footer">
            <a href="/about">{t('common.readMore')}</a>
          </p>
        </section>
      {:else if blockId === 'news' && showNews}
        <section class="widget">
          <h2 class="widget-title">{t('catalog.latestNews')}</h2>
          <ul class="news-list">
            {#each newsPosts as post (post.id)}
              <li>
                <a href={`/news/${post.id}`} class="news-link">
                  <time datetime={post.date}>{formatDate(post.date)}</time>
                  <span class="news-title">{post.title}</span>
                  {#if newsTeaser(post)}
                    <span class="news-teaser">{newsTeaser(post)}</span>
                  {/if}
                </a>
              </li>
            {/each}
          </ul>
          <p class="widget-footer">
            <a href="/news">{t('common.allNews')}</a>
          </p>
        </section>
      {:else if blockId === 'collections' && showCollections}
        <section class="widget">
          <h2 class="widget-title">{t('catalog.collections')}</h2>
          {#if collections.length === 1}
            {@const collection = collections[0]}
            <a class="collection-featured" href={`/collections/${collection.id}`}>{collection.title}</a>
            {#if collection.description}
              <p class="collection-snippet">{collection.description}</p>
            {/if}
            <p class="widget-footer">
              <a href={`/collections/${collection.id}`}>{t('common.readMore')}</a>
            </p>
          {:else}
            <ul class="link-list">
              {#each collections as collection (collection.id)}
                <li>
                  <a href={`/collections/${collection.id}`}>{collection.title}</a>
                </li>
              {/each}
            </ul>
            <p class="widget-footer">
              <a href="/collections">{t('common.viewAllCollections')}</a>
            </p>
          {/if}
        </section>
      {:else if blockId === 'catalog' && showCatalog && catalog}
        <section class="widget">
          <h2 class="widget-title">{catalog.item_name_plural}</h2>
          <ul class="link-list">
            {#each catalogItems as item (item.id)}
              <li>
                <a href={`/items/${item.id}`}>{item.title}</a>
              </li>
            {/each}
          </ul>
        </section>
      {/if}
    {/each}
  </aside>
{/if}

<style>
  .catalog-sidebar {
    display: grid;
    gap: 1.25rem;
    align-content: start;
  }

  .widget {
    padding: 1.1rem 1.15rem;
    border: 1px solid #e4d8c7;
    border-radius: 1.25rem;
    background: rgb(255 250 242 / 0.88);
    box-shadow: 0 16px 50px rgb(36 27 18 / 0.06);
  }

  .widget-title {
    margin: 0 0 0.75rem;
    font-size: 0.85rem;
    font-weight: 800;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: #7d684f;
  }

  .link-list,
  .news-list {
    list-style: none;
    margin: 0;
    padding: 0;
    display: grid;
    gap: 0.55rem;
  }

  .link-list a,
  .collection-featured,
  .widget-footer a {
    color: #5f4529;
    font-weight: 700;
    text-decoration: none;
  }

  .collection-featured {
    display: block;
    margin-bottom: 0.65rem;
    font-size: 0.95rem;
  }

  .collection-snippet {
    margin: 0;
    color: #4f4236;
    font-size: 0.88rem;
    line-height: 1.55;
    white-space: pre-line;
  }

  .link-list a:hover,
  .collection-featured:hover,
  .widget-footer a:hover,
  .news-link:hover .news-title {
    text-decoration: underline;
  }

  .about-snippet {
    margin: 0;
    color: #4f4236;
    font-size: 0.95rem;
    line-height: 1.55;
  }

  .news-link {
    display: grid;
    gap: 0.2rem;
    color: inherit;
    text-decoration: none;
  }

  time {
    color: #7d684f;
    font-size: 0.75rem;
    letter-spacing: 0.04em;
    text-transform: uppercase;
  }

  .news-title {
    color: #5f4529;
    font-weight: 700;
    line-height: 1.35;
  }

  .news-teaser {
    color: #4f4236;
    font-size: 0.88rem;
    line-height: 1.45;
  }

  .widget-footer {
    margin: 0.85rem 0 0;
    font-size: 0.88rem;
    text-align: right;
  }

  .catalog-sidebar--dark .widget {
    border: 1px solid var(--site-border-color, rgb(232 224 212 / 0.14));
    border-radius: 1rem;
    background: color-mix(in srgb, var(--site-card-color, #1a1816) 82%, transparent);
    box-shadow: 0 16px 48px rgb(0 0 0 / 0.32);
  }

  .catalog-sidebar--dark .widget-title {
    color: color-mix(in srgb, var(--site-accent-color, #8c3a44) 78%, var(--site-text-color, #e8e0d4));
  }

  .catalog-sidebar--dark .link-list a,
  .catalog-sidebar--dark .collection-featured,
  .catalog-sidebar--dark .widget-footer a {
    color: var(--site-accent-color, #8c3a44);
  }

  .catalog-sidebar--dark .collection-snippet,
  .catalog-sidebar--dark .about-snippet,
  .catalog-sidebar--dark .news-teaser {
    color: var(--site-text-color, #e8e0d4);
    color: color-mix(in srgb, var(--site-text-color, #e8e0d4) 72%, transparent);
  }

  .catalog-sidebar--dark time {
    color: var(--site-text-color, #e8e0d4);
    color: color-mix(in srgb, var(--site-text-color, #e8e0d4) 52%, transparent);
  }

  .catalog-sidebar--dark .news-title {
    color: var(--site-text-color, #e8e0d4);
  }
</style>
