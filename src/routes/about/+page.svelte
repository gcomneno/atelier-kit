<script>
  import { splitParagraphs } from '$lib/text-blocks.js';
  import { useVisitorI18n } from '$lib/i18n/visitor-context.js';

  let { data } = $props();
  const t = useVisitorI18n();

  const introParagraphs = $derived(splitParagraphs(data.about.intro));
</script>

<svelte:head>
  <title>{data.about.title} · {data.site.name}</title>
  <meta name="description" content={data.about.intro || data.about.title} />
</svelte:head>

<main class="about-page">
  <a class="back-link" href="/">{t('common.backToShowcase')}</a>

  <article>
    <header class:has-portrait={Boolean(data.about.portrait)}>
      {#if data.about.portrait}
        <figure class="about-portrait">
          <img
            src={data.about.portrait.image_file}
            alt={data.about.portrait.image_alt}
            width="320"
            height="320"
            loading="lazy"
          />
        </figure>
      {/if}

      <p class="eyebrow">{data.site.name}</p>
      <h1>{data.about.title}</h1>

      {#each introParagraphs as paragraph}
        <p class="intro">{paragraph}</p>
      {/each}
    </header>

    {#each data.about.sections as section}
      <section>
        <h2>{section.heading}</h2>
        {#each splitParagraphs(section.body) as paragraph}
          <p>{paragraph}</p>
        {/each}
      </section>
    {/each}
  </article>
</main>

<style>
  .about-page {
    width: min(1120px, calc(100% - 2rem));
    margin: 0 auto;
    padding: 2rem 0 4rem;
  }

  .back-link {
    display: inline-flex;
    margin-bottom: 1.25rem;
    color: color-mix(in srgb, var(--site-text-color, #2f281f) 72%, transparent);
    text-decoration: none;
  }

  .back-link:hover {
    color: var(--site-text-color, #2f281f);
  }

  article {
    display: grid;
    gap: 1.5rem;
  }

  header {
    display: flow-root;
  }

  header.has-portrait {
    min-height: 10.5rem;
  }

  .about-portrait {
    float: right;
    width: min(10.5rem, 34vw);
    margin: 0.15rem 0 1rem 1.5rem;
    aspect-ratio: 1;
    overflow: hidden;
    border-radius: 1rem;
    border: 1px solid color-mix(in srgb, var(--site-border-color, rgb(232 224 212 / 0.18)) 88%, transparent);
    background: color-mix(in srgb, var(--site-card-color, #1a1816) 82%, transparent);
    box-shadow:
      0 18px 50px rgb(0 0 0 / 0.28),
      inset 0 0 0 1px color-mix(in srgb, var(--site-text-color, #e8e0d4) 6%, transparent);
  }

  .about-portrait img {
    display: block;
    width: 100%;
    height: 100%;
    object-fit: cover;
    object-position: center top;
  }

  .eyebrow {
    margin: 0;
    color: color-mix(in srgb, var(--site-text-color, #2f281f) 68%, transparent);
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
    width: 100%;
    max-width: none;
    color: color-mix(in srgb, var(--site-text-color, #2f281f) 92%, transparent);
    font-size: 1.05rem;
    line-height: 1.7;
    text-align: left;
    text-wrap: wrap;
    hyphens: manual;
  }

  .intro {
    margin-top: 0.75rem;
  }

  .intro ~ .intro {
    margin-top: 0.65rem;
  }

  section {
    display: grid;
    gap: 0.65rem;
    padding-top: 0.5rem;
    border-top: 1px solid color-mix(in srgb, var(--site-text-color, #2f281f) 16%, transparent);
  }

  h2 {
    margin: 0;
    font-size: 1.25rem;
  }

  @media (max-width: 719px) {
    header.has-portrait {
      min-height: 0;
    }

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

    header.has-portrait .eyebrow,
    header.has-portrait h1,
    header.has-portrait .intro {
      width: 100%;
    }
  }
</style>
