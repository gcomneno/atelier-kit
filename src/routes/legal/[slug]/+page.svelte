<script>
  import { splitParagraphs } from '$lib/text-blocks.js';
  import { formatPageTitle, resolveDocumentTitle } from '$lib/site-branding.js';
  import { useVisitorI18n } from '$lib/i18n/visitor-context.js';

  let { data } = $props();
  const t = useVisitorI18n();

  const siteLabel = $derived(resolveDocumentTitle(data.site));
  const pageTitle = $derived(formatPageTitle(data.legal.title, data.site));

  const paragraphs = $derived(splitParagraphs(data.legal.body));
</script>

<svelte:head>
  <title>{pageTitle}</title>
</svelte:head>

<main class="legal-page">
  <a class="back-link" href="/">{t('common.backToShowcase')}</a>

  <article>
    <header>
      {#if siteLabel}
        <p class="eyebrow">{siteLabel}</p>
      {/if}
      <h1>{data.legal.title}</h1>
    </header>

    <div class="body">
      {#each paragraphs as paragraph}
        <p>{paragraph}</p>
      {/each}
    </div>
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

  h1 {
    margin: 0;
    font-size: clamp(2.4rem, 8vw, 4rem);
    line-height: 0.95;
    letter-spacing: -0.05em;
  }

  .body {
    display: grid;
    gap: 1rem;
  }

  .body p {
    margin: 0;
    color: color-mix(in srgb, var(--site-text-color, #2f281f) 92%, transparent);
    font-size: 1.05rem;
    line-height: 1.7;
    white-space: pre-line;
    text-align: justify;
    text-wrap: pretty;
    hyphens: auto;
  }
</style>
