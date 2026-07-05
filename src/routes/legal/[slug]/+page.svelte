<script>
  let { data } = $props();
</script>

<svelte:head>
  <title>{data.legal.title} · {data.site.name}</title>
</svelte:head>

<main class="legal-page">
  <a class="back-link" href="/">← Back to showcase</a>

  <article>
    <header>
      <p class="eyebrow">{data.site.name}</p>
      <h1>{data.legal.title}</h1>
    </header>

    <div class="body">{data.legal.body}</div>
  </article>
</main>

<style>
  .legal-page {
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

  h1 {
    margin: 0;
    font-size: clamp(2.4rem, 8vw, 4rem);
    line-height: 0.95;
    letter-spacing: -0.05em;
  }

  .body {
    margin: 0;
    color: #4f4236;
    font-size: 1.05rem;
    line-height: 1.7;
    white-space: pre-wrap;
  }
</style>
