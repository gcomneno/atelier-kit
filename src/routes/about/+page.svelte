<script>
  import JsonLd from '$lib/components/JsonLd.svelte';
  import EditorialText from '$lib/components/EditorialText.svelte';
  import { splitEditorialParagraphs } from '$lib/editorial-markup.js';
  import { markedTextToPlainText } from '$lib/marked-text.js';
  import { formatPageTitle, resolveDocumentTitle } from '$lib/site-branding.js';
  import { useVisitorI18n } from '$lib/i18n/visitor-context.js';

  let { data } = $props();
  const t = useVisitorI18n();

  const introParagraphs = $derived(splitEditorialParagraphs(data.about.intro));
  const siteLabel = $derived(resolveDocumentTitle(data.site));
  const pageTitle = $derived(formatPageTitle(markedTextToPlainText(data.about.title), data.site));
  const metaDescription = $derived(
    markedTextToPlainText(data.about.intro) ||
      (siteLabel ? t('about.metaDescription', { siteName: siteLabel }) : markedTextToPlainText(data.about.title))
  );
</script>

<svelte:head>
  <title>{pageTitle}</title>
  <meta name="description" content={metaDescription} />
</svelte:head>

<JsonLd data={data.jsonLd} />

<main class="about-page">
  <a class="back-link" href="/">{t('common.backToShowcase')}</a>

  <article>
    <header class:has-portrait={Boolean(data.about.portrait)}>
      {#if data.about.portrait}
        <figure class="about-portrait">
          <div class="portrait-image">
            <img
              src={data.about.portrait.image_file}
              alt={data.about.portrait.image_alt}
              width="320"
              height="320"
              loading="lazy"
            />
          </div>
          {#if data.about.portrait.caption}
            <EditorialText value={data.about.portrait.caption} tag="figcaption" />
          {/if}
        </figure>
      {/if}

      <div class="page-heading">
        <p class="eyebrow">{data.pageEyebrow}</p>
        <h1><EditorialText value={data.about.title} /></h1>
      </div>

      {#if introParagraphs.length > 0}
        <div class="intro-block">
          {#each introParagraphs as paragraph}
            <EditorialText tag="p" value={paragraph} />
          {/each}
        </div>
      {/if}
    </header>

    {#each data.about.sections as section}
      <section class="about-section">
        <h2><EditorialText value={section.heading} /></h2>
        <div class="section-body">
          {#each splitEditorialParagraphs(section.body) as paragraph}
            <EditorialText tag="p" value={paragraph} />
          {/each}
        </div>
      </section>
    {/each}
  </article>
</main>

<style>
  .about-page {
    width: min(760px, calc(100% - 2rem));
    margin: 0 auto;
    padding: 1.25rem 0 4rem;
  }

  .back-link {
    display: inline-flex;
    margin-bottom: 1.25rem;
    color: color-mix(in srgb, var(--site-text-color, #2f281f) 72%, transparent);
    text-decoration: none;
    font-weight: 600;
  }

  .back-link:hover {
    color: var(--site-text-color, #2f281f);
  }

  article {
    display: grid;
    gap: 1.25rem;
  }

  header {
    display: flow-root;
  }

  .page-heading {
    display: grid;
    gap: 0.45rem;
  }

  .about-portrait {
    float: right;
    width: min(10.5rem, 34vw);
    margin: 0.15rem 0 1rem 1.5rem;
  }

  .portrait-image {
    aspect-ratio: 1;
    overflow: hidden;
    border-radius: 1rem;
    border: 1px solid var(--site-border-color, #e4d8c7);
    background: color-mix(in srgb, var(--site-card-color, #fffaf2) 88%, transparent);
    box-shadow: 0 18px 50px rgb(0 0 0 / 0.12);
  }

  .portrait-image img {
    display: block;
    width: 100%;
    height: 100%;
    object-fit: cover;
    object-position: center top;
  }

  .about-portrait :global(figcaption) {
    margin-top: 0.55rem;
    color: color-mix(in srgb, var(--site-text-color, #2f281f) 76%, transparent);
    font-size: 0.82rem;
    line-height: 1.45;
    text-wrap: pretty;
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
    max-width: 16ch;
    font-size: clamp(2.4rem, 8vw, 4rem);
    line-height: 0.95;
    letter-spacing: -0.05em;
  }

  .intro-block,
  .section-body {
    display: grid;
    gap: 0.75rem;
  }

  .intro-block {
    margin-top: 1rem;
    padding: 1rem 1.2rem;
    border: 1px solid color-mix(in srgb, var(--site-accent-color, #dfc9aa) 55%, transparent);
    border-radius: 1.25rem;
    background: color-mix(
      in srgb,
      var(--site-card-color, #fffaf2) 82%,
      var(--site-accent-color, #dfc9aa) 18%
    );
    box-shadow: 0 12px 40px rgb(0 0 0 / 0.1);
  }

  .intro-block :global(p),
  .section-body :global(p) {
    margin: 0;
    color: color-mix(in srgb, var(--site-text-color, #2f281f) 92%, transparent);
    font-size: 1.05rem;
    line-height: 1.7;
    text-align: left;
    text-wrap: pretty;
  }

  .about-section {
    display: grid;
    gap: 0.85rem;
    padding: 1.25rem 1.3rem;
    border: 1px solid var(--site-border-color, #e4d8c7);
    border-radius: 1.25rem;
    background: color-mix(in srgb, var(--site-card-color, #fffaf2) 92%, transparent);
    box-shadow: 0 16px 50px rgb(0 0 0 / 0.08);
  }

  h2 {
    margin: 0;
    font-size: 1.2rem;
    letter-spacing: -0.02em;
  }

  @media (max-width: 719px) {
    .about-portrait {
      float: none;
      width: min(100%, 11rem);
      margin: 0 auto 1.25rem;
    }

    header.has-portrait {
      display: grid;
      justify-items: center;
      text-align: left;
    }

    header.has-portrait .page-heading,
    header.has-portrait .intro-block {
      width: 100%;
    }
  }
</style>
