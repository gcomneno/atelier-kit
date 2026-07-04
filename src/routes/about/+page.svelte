<script>
  let { data } = $props();
</script>

<svelte:head>
  <title>{data.about.title} · {data.site.name}</title>
  <meta name="description" content={data.about.intro || data.about.title} />
</svelte:head>

<main class="about-page">
  <a class="back-link" href="/">← Back to showcase</a>

  <article>
    <header>
      <p class="eyebrow">{data.site.name}</p>
      <h1>{data.about.title}</h1>
    </header>

    {#if data.about.intro}
      <p class="intro">{data.about.intro}</p>
    {/if}

    {#each data.about.sections as section}
      <section>
        <h2>{section.heading}</h2>
        <p>{section.body}</p>
      </section>
    {/each}
  </article>
</main>

<style>
  .about-page {
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

  .intro,
  section p {
    margin: 0;
    color: #4f4236;
    font-size: 1.05rem;
    line-height: 1.7;
    white-space: pre-wrap;
  }

  section {
    display: grid;
    gap: 0.65rem;
    padding-top: 0.5rem;
    border-top: 1px solid rgb(47 40 31 / 0.12);
  }

  h2 {
    margin: 0;
    font-size: 1.25rem;
  }
</style>
