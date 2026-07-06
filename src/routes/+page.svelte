<script>
  import CatalogSidebar from '$lib/components/CatalogSidebar.svelte';
  import ItemCard from '$lib/components/ItemCard.svelte';
  import { useVisitorI18n } from '$lib/i18n/visitor-context.js';

  let { data } = $props();
  const t = useVisitorI18n();

  const collectionsInSidebar = $derived(
    data.sidebarActive && data.layout.sidebar.collections
  );
  const showCollections = $derived(
    data.collections.length > 0 &&
      (data.layout.home.show === 'collections' || data.layout.home.show === 'both') &&
      !collectionsInSidebar
  );
  const showCatalog = $derived(
    data.layout.home.show === 'catalog' || data.layout.home.show === 'both'
  );
</script>

<svelte:head>
  <title>{data.site.name}</title>
  <meta name="description" content={data.site.tagline} />
</svelte:head>

<!-- Sidebar layout applies on home (`/`) only; see getCatalogSidebarPageData() in showcase.js -->
<div class="page-shell" class:with-sidebar={data.sidebarActive}>
  <main>
    <div class="home-intro">
      <section class="hero">
        <h1>{data.site.name}</h1>
        <p class="tagline hero-epigraph">{data.site.tagline}</p>

        {#if data.site.hero_intro}
          <p class="hero-intro">{data.site.hero_intro}</p>
        {:else if data.site.notice}
          <p class="notice">{data.site.notice}</p>
        {/if}

        {#if data.site.hero_banner}
          {@const banner = data.site.hero_banner}
          {#if banner.href}
            <a class="hero-banner" href={banner.href}>
              <img src={banner.image_file} alt={banner.image_alt} loading="lazy" width="960" height="360" />
              {#if banner.caption || banner.link_label}
                <span class="hero-banner-caption">
                  {banner.link_label ?? banner.caption}
                </span>
              {/if}
            </a>
          {:else}
            <figure class="hero-banner">
              <img src={banner.image_file} alt={banner.image_alt} loading="lazy" width="960" height="360" />
              {#if banner.caption}
                <figcaption class="hero-banner-caption">{banner.caption}</figcaption>
              {/if}
            </figure>
          {/if}
        {/if}
      </section>

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

    {#if showCollections}
      <section class="collections" aria-labelledby="collections-title">
        <div class="section-heading">
          <p class="eyebrow">{t('home.collectionsEyebrow')}</p>
          <h2 id="collections-title">{t('home.collectionsTitle')}</h2>
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
      <section class="catalog" aria-labelledby="catalog-title">
        <div class="section-heading">
          <p class="eyebrow">{t('home.catalogEyebrow')}</p>
          <h2 id="catalog-title">{data.items.length} {data.catalog.item_name_plural}</h2>
        </div>

        <div class="grid">
          {#each data.items as item}
            <ItemCard {item} catalog={data.catalog} />
          {/each}
        </div>
      </section>
    {/if}

    {#if !data.footerActive && (data.site.footer_note || data.aboutAvailable)}
      <footer>
        {#if data.site.footer_note}
          <p>{data.site.footer_note}</p>
        {/if}
        {#if data.aboutAvailable}
          <p class="footer-link"><a href="/about">{t('home.aboutStudio')}</a></p>
        {/if}
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
  }

  main {
    min-width: 0;
  }

  .hero {
    display: grid;
    gap: 1rem;
    align-content: start;
    padding: 0.5rem 0 2rem;
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

  .hero-banner::after {
    content: '';
    position: absolute;
    inset: 0;
    background: linear-gradient(
      180deg,
      rgb(0 0 0 / 0.04) 0%,
      rgb(0 0 0 / 0.12) 45%,
      color-mix(in srgb, var(--site-base-color, #f8f0e4) 65%, transparent) 100%
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
    z-index: 1;
    left: 0;
    right: 0;
    bottom: 0;
    padding: 0.85rem 1rem 0.9rem;
    font-size: 0.82rem;
    font-weight: 700;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    line-height: 1.35;
    text-shadow: 0 1px 10px rgb(0 0 0 / 0.45);
  }

  a.hero-banner:hover .hero-banner-caption {
    color: color-mix(in srgb, var(--site-accent-color, #8c3a44) 55%, var(--site-text-color, #2f281f));
  }

  .notice {
    width: fit-content;
    max-width: 46rem;
    margin: 1rem 0 0;
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
    line-height: 1.55;
    white-space: pre-line;
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

  @media (min-width: 960px) {
    .page-shell.with-sidebar .catalog .grid {
      grid-template-columns: repeat(3, minmax(0, 1fr));
      align-items: start;
    }
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
