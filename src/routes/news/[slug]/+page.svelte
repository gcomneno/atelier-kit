<script>
  let { data } = $props();

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

<main class="news-detail">
  <a class="back-link" href="/news">← Back to news</a>

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

    <div class="body">{data.post.body}</div>
  </article>
</main>

<style>
  .news-detail {
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
    color: #7d684f;
    font-size: 0.8rem;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }

  time {
    color: #7d684f;
    font-size: 0.85rem;
    letter-spacing: 0.04em;
    text-transform: uppercase;
  }

  h1 {
    margin: 0;
    font-size: clamp(2.4rem, 8vw, 4rem);
    line-height: 0.95;
    letter-spacing: -0.05em;
  }

  .hero-image {
    margin: 0;
    overflow: hidden;
    border-radius: 1rem;
    border: 1px solid rgb(47 40 31 / 0.12);
  }

  .hero-image img {
    display: block;
    width: 100%;
    max-height: 420px;
    object-fit: cover;
  }

  .body {
    margin: 0;
    color: #4f4236;
    font-size: 1.05rem;
    line-height: 1.7;
    white-space: pre-wrap;
  }
</style>
