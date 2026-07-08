<script>
  import BookReading from '$lib/components/BookReading.svelte';
  import JsonLd from '$lib/components/JsonLd.svelte';
  import PageSocialMeta from '$lib/components/PageSocialMeta.svelte';
  import { isBookReadingFormat } from '$lib/book-content.js';
  import { useVisitorI18n } from '$lib/i18n/visitor-context.js';

  let { data } = $props();
  const t = useVisitorI18n();

  const isBookLayout = $derived(
    isBookReadingFormat(data.post.reading_format, data.post.id)
  );

  const paragraphs = $derived(
    data.post.body
      .trim()
      .split(/\n\s*\n/)
      .map((paragraph) => paragraph.trim())
      .filter(Boolean)
  );

  function formatDate(/** @type {string} */ value) {
    const parsed = new Date(`${value}T12:00:00`);

    if (Number.isNaN(parsed.getTime())) {
      return value;
    }

    return parsed.toLocaleDateString(data.site.language || 'en', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }
</script>

<svelte:head>
  <title>{data.post.title} · {data.site.name}</title>
  <meta name="description" content={data.post.excerpt || data.post.title} />
</svelte:head>

<PageSocialMeta
  title={data.seo?.ogTitle}
  description={data.seo?.ogDescription}
  image={data.seo?.ogImage}
/>

<JsonLd data={data.jsonLd} />

{#if isBookLayout}
  <BookReading
    post={data.post}
    backHref="/news"
    backLabel={t('common.backToNews')}
  />
{:else}
  <main class="news-detail">
    <a class="back-link" href="/news">{t('common.backToNews')}</a>

    <article>
      <header>
        <p class="eyebrow">{data.site.name}</p>
        <time datetime={data.post.date}>{formatDate(data.post.date)}</time>
        <h1>{data.post.title}</h1>
      </header>

      {#if data.post.image_file}
        <figure class="hero-image">
          <img src={data.post.image_file} alt={data.post.image_alt || data.post.title} />
        </figure>
      {/if}

      <div class="body">
        {#each paragraphs as paragraph}
          <p>{paragraph}</p>
        {/each}
      </div>
    </article>
  </main>
{/if}

<style>
  .news-detail {
    width: min(860px, calc(100% - 2rem));
    margin: 0 auto;
    padding: 2rem 0 4rem;
  }

  .back-link {
    display: inline-flex;
    margin-bottom: 1.25rem;
    color: inherit;
    text-decoration: none;
    opacity: 0.72;
  }

  article {
    display: grid;
    gap: 1.5rem;
  }

  header {
    display: grid;
    gap: 0.5rem;
  }

  .eyebrow {
    margin: 0;
    color: color-mix(in srgb, var(--site-text-color, #2f281f) 68%, transparent);
    font-size: 0.8rem;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }

  time {
    color: color-mix(in srgb, var(--site-text-color, #2f281f) 68%, transparent);
    font-size: 0.85rem;
    letter-spacing: 0.04em;
    text-transform: uppercase;
  }

  h1 {
    margin: 0;
    font-size: clamp(2.4rem, 8vw, 4rem);
    line-height: 1.05;
    letter-spacing: -0.05em;
  }

  .hero-image {
    margin: 0;
    overflow: hidden;
    border-radius: 1rem;
    border: 1px solid color-mix(in srgb, var(--site-text-color, #2f281f) 16%, transparent);
  }

  .hero-image img {
    display: block;
    width: 100%;
    max-height: 420px;
    object-fit: cover;
  }

  .body {
    display: grid;
    gap: 1.1rem;
  }

  .body p {
    margin: 0;
    color: var(--site-text-color, #e8e0d4);
    font-size: clamp(1.12rem, 2.4vw, 1.25rem);
    line-height: 1.75;
    white-space: pre-line;
    text-align: justify;
    text-wrap: pretty;
    hyphens: auto;
  }
</style>
