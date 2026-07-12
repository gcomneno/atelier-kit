<script>
  import { useVisitorI18n } from '$lib/i18n/visitor-context.js';
  import { formatPageTitle, resolveDocumentTitle } from '$lib/site-branding.js';

  let { data } = $props();
  const t = useVisitorI18n();

  const siteLabel = $derived(resolveDocumentTitle(data.site));
  const pageTitle = $derived(formatPageTitle(t('news.pageTitle'), data.site));
  const metaDescription = $derived(
    siteLabel ? t('news.metaDescription', { siteName: siteLabel }) : t('news.title')
  );
  const feedTitle = $derived(siteLabel ? `${siteLabel} — ${t('news.pageTitle')}` : t('news.pageTitle'));

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

  function listTeaser(/** @type {{ excerpt?: string, body: string }} */ post) {
    if (post.excerpt) {
      return post.excerpt;
    }

    const firstLine = post.body.split('\n').find((/** @type {string} */ line) => line.trim() !== '');

    return firstLine?.trim() ?? '';
  }
</script>

<svelte:head>
  <title>{pageTitle}</title>
  <meta name="description" content={metaDescription} />
  <link rel="alternate" type="application/rss+xml" title={feedTitle} href={data.feedUrl} />
</svelte:head>

<main class="news-page">
  <a class="back-link" href="/">{t('common.backToShowcase')}</a>

  <header class="page-header">
    <p class="eyebrow">{data.pageEyebrow}</p>
    <h1>{t('news.title')}</h1>
  </header>

  {#if data.posts.length === 0}
    <p class="empty">{t('news.empty')}</p>
  {:else}
    <ul class="post-list">
      {#each data.posts as post}
        <li>
          <article>
            <a href={`/news/${post.id}`} class="post-link">
              {#if post.image_file}
                <div class="post-image">
                  <img src={post.image_file} alt={post.image_alt || post.title} />
                </div>
              {/if}

              <div class="post-copy">
                <time datetime={post.date}>{formatDate(post.date)}</time>
                <h2>{post.title}</h2>
                {#if listTeaser(post)}
                  <p>{listTeaser(post)}</p>
                {/if}
              </div>
            </a>
          </article>
        </li>
      {/each}
    </ul>
  {/if}
</main>

<style>
  .news-page {
    width: min(760px, calc(100% - 2rem));
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

  .page-header {
    display: grid;
    gap: 0.5rem;
    margin-bottom: 2rem;
  }

  .eyebrow {
    margin: 0;
    color: #7d684f;
    font-size: 0.8rem;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }

  h1 {
    margin: 0;
    font-size: clamp(2.4rem, 8vw, 4rem);
    line-height: 0.95;
    letter-spacing: -0.05em;
  }

  .empty {
    margin: 0;
    color: #4f4236;
    font-size: 1.05rem;
    line-height: 1.7;
  }

  .post-list {
    list-style: none;
    margin: 0;
    padding: 0;
    display: grid;
    gap: 1.5rem;
  }

  .post-link {
    display: grid;
    gap: 1rem;
    padding: 1.25rem;
    border-radius: 1rem;
    border: 1px solid rgb(47 40 31 / 0.12);
    background: rgb(255 250 242 / 0.82);
    color: inherit;
    text-decoration: none;
  }

  .post-image {
    overflow: hidden;
    border-radius: 0.75rem;
  }

  .post-image img {
    display: block;
    width: 100%;
    max-height: 240px;
    object-fit: cover;
  }

  .post-copy {
    display: grid;
    gap: 0.45rem;
  }

  time {
    color: #7d684f;
    font-size: 0.85rem;
    letter-spacing: 0.04em;
    text-transform: uppercase;
  }

  h2 {
    margin: 0;
    font-size: 1.35rem;
    line-height: 1.2;
  }

  .post-copy p {
    margin: 0;
    color: #4f4236;
    font-size: 1rem;
    line-height: 1.6;
  }
</style>
