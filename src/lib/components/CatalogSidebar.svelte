<script>
  /** @typedef {{ id: string, title: string, description: string, items: unknown[] }} Collection */
  /** @typedef {{ title: string, intro: string, sections: { heading: string, body: string }[] }} AboutConfig */
  /** @typedef {{ id: string, title: string, date: string, excerpt?: string, body: string }} NewsPost */

  /**
   * @type {{
   *   collections?: Collection[],
   *   about?: AboutConfig | null,
   *   newsPosts?: NewsPost[],
   *   widgets?: {
   *     collections: boolean,
   *     about: boolean,
   *     latest_news: boolean,
   *     latest_news_count: number
   *   },
   *   site?: { language: string }
   * }}
   */
  let {
    collections = [],
    about = null,
    newsPosts = [],
    widgets = {
      collections: true,
      about: true,
      latest_news: true,
      latest_news_count: 3
    },
    site = { language: 'en' }
  } = $props();

  const showCollections = $derived(widgets.collections && collections.length > 0);
  const showAbout = $derived(Boolean(widgets.about && about));
  const showNews = $derived(widgets.latest_news && newsPosts.length > 0);

  const aboutSnippet = $derived.by(() => {
    if (!about) {
      return '';
    }

    if (about.intro) {
      return about.intro;
    }

    return about.sections[0]?.body ?? '';
  });

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

{#if showCollections || showAbout || showNews}
  <aside class="catalog-sidebar" aria-label="Catalog sidebar">
    {#if showCollections}
      <section class="widget">
        <h2 class="widget-title">Collections</h2>
        <ul class="link-list">
          {#each collections as collection (collection.id)}
            <li>
              <a href={`/collections/${collection.id}`}>{collection.title}</a>
            </li>
          {/each}
        </ul>
        <p class="widget-footer">
          <a href="/collections">View all collections</a>
        </p>
      </section>
    {/if}

    {#if showAbout && about}
      <section class="widget">
        <h2 class="widget-title">{about.title}</h2>
        {#if aboutSnippet}
          <p class="about-snippet">{aboutSnippet}</p>
        {/if}
        <p class="widget-footer">
          <a href="/about">Read more</a>
        </p>
      </section>
    {/if}

    {#if showNews}
      <section class="widget">
        <h2 class="widget-title">Latest news</h2>
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
          <a href="/news">All news</a>
        </p>
      </section>
    {/if}
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
  .widget-footer a {
    color: #5f4529;
    font-weight: 700;
    text-decoration: none;
  }

  .link-list a:hover,
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
  }
</style>
