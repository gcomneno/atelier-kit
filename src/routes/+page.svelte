<script>
  import CatalogSidebar from '$lib/components/CatalogSidebar.svelte';
  import ItemCard from '$lib/components/ItemCard.svelte';
  import { useVisitorI18n } from '$lib/i18n/visitor-context.js';

  let { data } = $props();
  const t = useVisitorI18n();

  const placements = $derived(data.placements);
  const showBannerMain = $derived(Boolean(data.site.hero_banner));
  const showCollections = $derived(
    placements.collections === 'main' && data.collections.length > 0
  );
  const showCatalog = $derived(placements.catalog === 'main' && data.items.length > 0);
  const homeCatalogItems = $derived(
    data.catalog.home_limit > 0 ? data.items.slice(0, data.catalog.home_limit) : data.items
  );
  const showCatalogViewAll = $derived(
    data.catalog.home_limit > 0 && data.items.length > data.catalog.home_limit
  );
  const catalogEyebrow = $derived(data.catalog.eyebrow || t('home.catalogEyebrow'));
  const catalogIntro = $derived(data.catalog.intro.trim());
  const showAboutMain = $derived(Boolean(data.main?.about));
  const showNewsMain = $derived((data.main?.newsPosts?.length ?? 0) > 0);
</script>

<svelte:head>
  <title>{data.site.intro_title}</title>
  <meta name="description" content={data.site.tagline} />
</svelte:head>

<!-- Sidebar layout applies on home (`/`) only; see getCatalogSidebarPageData() in showcase.js -->
<div class="page-shell" class:with-sidebar={data.sidebarActive}>
  <main>
    <div class="home-intro">
      <section class="hero hero-head">
        <h1>{data.site.intro_title}</h1>
        <p class="tagline hero-epigraph">{data.site.tagline}</p>

        {#if data.site.hero_intro}
          <p class="hero-intro">{data.site.hero_intro}</p>
        {/if}
        {#if data.site.hero_signature}
          <p class="hero-signature">{data.site.hero_signature}</p>
        {/if}
      </section>

      {#if data.sidebarActive && data.sidebar}
        <div class="home-sidebar">
          <CatalogSidebar
            collections={data.sidebar.collections}
            about={data.sidebar.about}
            newsPosts={data.sidebar.newsPosts}
            catalogItems={data.sidebar.catalogItems}
            catalog={data.sidebar.catalog}
            site={data.site}
            blockLabels={data.blockLabels}
          />
        </div>
      {/if}

      {#if showBannerMain && data.site.hero_banner}
        {@const banner = data.site.hero_banner}
        <div class="hero-banner-slot">
          {#if banner.href}
            <a class="hero-banner" href={banner.href}>
              <img src={banner.image_file} alt={banner.image_alt} loading="lazy" width="960" height="360" />
              {#if banner.description}
                <span class="hero-banner-description">{banner.description}</span>
              {/if}
              {#if banner.caption}
                <span class="hero-banner-caption">{banner.caption}</span>
              {/if}
            </a>
          {:else}
            <figure class="hero-banner">
              <img src={banner.image_file} alt={banner.image_alt} loading="lazy" width="960" height="360" />
              {#if banner.description}
                <span class="hero-banner-description">{banner.description}</span>
              {/if}
              {#if banner.caption}
                <figcaption class="hero-banner-caption">{banner.caption}</figcaption>
              {/if}
            </figure>
          {/if}
        </div>
      {/if}
    </div>

    {#if showAboutMain && data.main?.about}
      {@const about = data.main.about}
      <section class="home-about" aria-labelledby="home-about-title">
        <h2 id="home-about-title">{data.blockLabels.about}</h2>
        {#if about.intro}
          <p>{about.intro}</p>
        {:else if about.sections[0]?.body}
          <p>{about.sections[0].body}</p>
        {/if}
        <p class="text-link"><a href="/about">{t('common.readMore')}</a></p>
      </section>
    {/if}

    {#if showNewsMain && data.main?.newsPosts}
      <section class="home-news" aria-labelledby="home-news-title">
        <h2 id="home-news-title">{data.blockLabels.news}</h2>
        <ul class="home-news-list">
          {#each data.main.newsPosts as post (post.id)}
            <li>
              <a href={`/news/${post.id}`}>
                <time datetime={post.date}>{post.date}</time>
                <span>{post.title}</span>
              </a>
            </li>
          {/each}
        </ul>
        <p class="text-link"><a href="/news">{t('common.allNews')}</a></p>
      </section>
    {/if}

    {#if showCollections}
      <section class="collections" aria-labelledby="collections-title">
        <div class="section-heading">
          <p class="eyebrow">{t('home.collectionsEyebrow')}</p>
          <h2 id="collections-title">{data.blockLabels.collections}</h2>
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

        <p class="text-link"><a href="/collections">{t('common.viewAllCollections')}</a></p>
      </section>
    {/if}

    {#if showCatalog}
      <section id="catalog" class="catalog" aria-labelledby="catalog-title">
        <div class="section-heading">
          <p class="eyebrow">{catalogEyebrow}</p>
          <h2 id="catalog-title">{data.items.length} {data.items.length === 1 ? data.catalog.item_name_singular : data.catalog.item_name_plural}</h2>
          {#if catalogIntro}
            <p class="catalog-intro">{catalogIntro}</p>
          {/if}
        </div>

        <div class="grid">
          {#each homeCatalogItems as item}
            <ItemCard {item} />
          {/each}
        </div>

        {#if showCatalogViewAll}
          <p class="text-link">
            <a href="/catalog">{t('common.viewAllItems', { itemPlural: data.catalog.item_name_plural })}</a>
          </p>
        {/if}
      </section>
    {/if}

    {#if !data.footerActive && data.site.footer_note}
      <footer>
        <p>{data.site.footer_note}</p>
      </footer>
    {/if}
  </main>
</div>

<style>
  .page-shell {
    width: min(1120px, calc(100% - 2rem));
    margin: 0 auto;
    padding: 1.25rem 0 2rem;
  }

  .page-shell.with-sidebar .home-intro {
    display: grid;
    gap: 2rem;
    align-items: start;
  }

  @media (min-width: 960px) {
    .page-shell.with-sidebar .home-intro {
      grid-template-columns: minmax(0, 1fr) 280px;
    }

    .page-shell.with-sidebar .home-intro:has(.hero-banner-slot) {
      grid-template-rows: auto auto;
    }

    .page-shell.with-sidebar .hero-head {
      grid-column: 1;
      grid-row: 1;
    }

    .page-shell.with-sidebar .home-sidebar {
      grid-column: 2;
      grid-row: 1;
    }

    .page-shell.with-sidebar .hero-banner-slot {
      grid-column: 1 / -1;
      grid-row: 2;
    }
  }

  main {
    min-width: 0;
  }

  .hero-head {
    display: grid;
    gap: 1rem;
    align-content: start;
    padding: 0.5rem 0 2rem;
  }

  .page-shell:not(.with-sidebar) .hero-head {
    padding-bottom: 0;
  }

  .page-shell:not(.with-sidebar) .hero-banner-slot {
    padding-bottom: 2rem;
  }

  .page-shell.with-sidebar .hero-head {
    padding-bottom: 0;
  }

  .page-shell.with-sidebar .hero-banner-slot .hero-banner {
    margin-top: 0;
    max-width: none;
    max-height: 12rem;
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
    max-width: 16ch;
    margin: 0;
    font-size: clamp(2.8rem, 10vw, 6.5rem);
    line-height: 0.95;
    letter-spacing: -0.04em;
  }

  .tagline {
    max-width: 42rem;
    margin: 0;
    color: color-mix(in srgb, var(--site-text-color, #4f4236) 88%, transparent);
    font-size: clamp(1.2rem, 4vw, 1.9rem);
    line-height: 1.35;
  }

  .hero-epigraph {
    max-width: 22ch;
    margin: 0;
    font-style: italic;
    font-weight: 400;
    font-size: clamp(2.4rem, 7.5vw, 4.5rem);
    line-height: 1.45;
    letter-spacing: 0.01em;
    text-wrap: balance;
    color: color-mix(in srgb, var(--site-text-color, #4f4236) 92%, transparent);
  }

  .hero-epigraph::before {
    content: '«\202f';
  }

  .hero-epigraph::after {
    content: '\202f»';
  }

  .hero-intro {
    font-style: normal;
    width: fit-content;
    max-width: 46rem;
    margin: 1.25rem 0 0;
    padding: 1rem 1.2rem;
    border: 1px solid color-mix(in srgb, var(--site-accent-color, #dfc9aa) 55%, transparent);
    border-radius: 20px;
    color: var(--site-text-color, #5d4a36);
    background: color-mix(
      in srgb,
      var(--site-base-color, #fffaf2) 72%,
      var(--site-accent-color, #dfc9aa) 28%
    );
    box-shadow: 0 12px 40px rgb(0 0 0 / 0.12);
    font-size: clamp(1.05rem, 2.5vw, 1.2rem);
    line-height: 1.65;
    white-space: pre-line;
  }

  .hero-signature {
    font-style: normal;
    max-width: 46rem;
    margin: 0.85rem 0 0 auto;
    text-align: right;
    color: color-mix(in srgb, var(--site-text-color, #5d4a36) 72%, transparent);
    font-size: clamp(1rem, 2.2vw, 1.1rem);
    line-height: 1.5;
    white-space: pre-line;
  }

  .hero-banner {
    position: relative;
    display: block;
    margin: 1rem 0 0;
    overflow: hidden;
    width: 100%;
    max-width: 42rem;
    aspect-ratio: 21 / 8;
    max-height: 10.5rem;
    border-radius: 0.75rem;
    border: 1px solid color-mix(in srgb, var(--site-border-color, rgb(47 40 31 / 0.14)) 90%, transparent);
    background: color-mix(in srgb, var(--site-card-color, #fffaf2) 88%, transparent);
    box-shadow: 0 16px 45px rgb(0 0 0 / 0.12);
    color: var(--site-text-color, #2f281f);
    text-decoration: none;
  }

  .hero-banner-description {
    position: absolute;
    z-index: 2;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    box-sizing: border-box;
    width: 100%;
    margin: 0;
    padding: 1rem 1.35rem 2.75rem;
    text-align: center;
    font-size: clamp(1.35rem, 3.2vw, 1.95rem);
    font-weight: 500;
    line-height: 1.4;
    letter-spacing: 0.03em;
    text-wrap: balance;
    color: var(--site-heading-color, var(--site-text-color, #2f281f));
    text-shadow: 0 2px 18px color-mix(in srgb, var(--site-base-color, #f8f0e4) 72%, rgb(0 0 0 / 0.45));
    pointer-events: none;
  }

  .hero-banner:not(:has(.hero-banner-caption)) .hero-banner-description {
    padding-bottom: 1rem;
  }

  .hero-banner::after {
    content: '';
    position: absolute;
    inset: 0;
    z-index: 1;
    background:
      linear-gradient(
        180deg,
        color-mix(in srgb, var(--site-base-color, #f8f0e4) 12%, transparent) 0%,
        color-mix(in srgb, var(--site-base-color, #f8f0e4) 38%, rgb(0 0 0 / 0.14)) 52%,
        color-mix(in srgb, var(--site-base-color, #f8f0e4) 68%, rgb(0 0 0 / 0.22)) 100%
      );
    pointer-events: none;
  }

  .hero-banner img {
    display: block;
    width: 100%;
    height: 100%;
    object-fit: cover;
    object-position: center;
  }

  .hero-banner-caption {
    position: absolute;
    z-index: 2;
    left: 0;
    right: 0;
    bottom: 0;
    margin: 0;
    padding: 0.85rem 1.35rem 0.9rem;
    text-align: right;
    font-size: 0.82rem;
    font-weight: 700;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    line-height: 1.35;
    color: var(--site-text-color, #2f281f);
    text-shadow: 0 1px 10px color-mix(in srgb, var(--site-base-color, #f8f0e4) 65%, rgb(0 0 0 / 0.4));
  }

  a.hero-banner:hover .hero-banner-caption {
    color: color-mix(in srgb, var(--site-accent-color, #8c3a44) 62%, var(--site-text-color, #2f281f));
  }

  .collections,
  .catalog {
    padding: 2rem 0 4rem;
  }

  .collections .section-heading,
  .catalog .section-heading {
    text-align: center;
  }

  .collections > .text-link,
  .catalog > .text-link {
    text-align: center;
  }

  .section-heading {
    margin-bottom: 1.6rem;
  }

  .section-heading h2 {
    margin: 0.25rem 0 0;
    font-size: clamp(2rem, 7vw, 4rem);
  }

  .catalog-intro {
    max-width: 42rem;
    margin: 0.75rem auto 0;
    color: color-mix(in srgb, var(--site-text-color, #2f281f) 82%, transparent);
    font-size: clamp(1.05rem, 2.5vw, 1.35rem);
    line-height: 1.5;
    white-space: pre-line;
  }

  .collection-grid,
  .grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(min(100%, 18rem), 22rem));
    justify-content: center;
    align-items: start;
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
    border-color: color-mix(in srgb, var(--site-accent-color, #c9ad89) 70%, var(--site-border-color));
    box-shadow: 0 24px 90px rgb(0 0 0 / 0.14);
  }

  .collection-card h3 {
    margin: -1.4rem -1.4rem 0;
    padding: 0.82rem 1.4rem;
    border-radius: 28px 28px 0 0;
    background: color-mix(in srgb, var(--site-accent-color, #d6be9a) 14%, var(--site-card-color, #fffaf2));
    color: var(--site-heading-color, var(--site-text-color, #2f281f));
    font-size: clamp(1.35rem, 4vw, 1.75rem);
  }

  .collection-card p {
    margin: 0;
    color: color-mix(in srgb, var(--site-text-color, #4f4236) 84%, transparent);
    line-height: 1.6;
  }

  .collection-card span {
    color: var(--site-muted-text-color, #7b6a58);
    font-size: 0.85rem;
    font-weight: 700;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }

  .home-about,
  .home-news {
    margin-top: 2rem;
  }

  .home-about h2,
  .home-news h2 {
    margin: 0 0 0.85rem;
  }

  .home-news-list {
    list-style: none;
    margin: 0;
    padding: 0;
    display: grid;
    gap: 0.75rem;
  }

  .home-news-list a {
    display: grid;
    gap: 0.2rem;
    text-decoration: none;
    color: inherit;
  }

  .text-link {
    margin: 1.4rem 0 0;
  }

  .text-link a {
    color: color-mix(in srgb, var(--site-accent-color, #5f4529) 62%, var(--site-text-color, #2f281f));
    font-weight: 800;
  }

  footer {
    border-top: 1px solid var(--site-border-color, #e3d4bf);
    padding-top: 1.5rem;
    color: var(--site-muted-text-color, #7b6a58);
  }

  footer p {
    margin: 0;
  }
</style>
