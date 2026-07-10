<script>
  import JsonLd from '$lib/components/JsonLd.svelte';
  import { useVisitorI18n } from '$lib/i18n/visitor-context.js';
  import { formatPageTitle, resolveDocumentTitle } from '$lib/site-branding.js';

  /**
   * @typedef {{
   *   id: string,
   *   question: string,
   *   answer: string,
   *   group?: string,
   *   order?: number
   * }} FaqEntry
   */

  /**
   * @typedef {{
   *   name: string,
   *   entries: FaqEntry[]
   * }} FaqGroup
   */

  /**
   * Groups FAQ entries while preserving the first appearance of each group.
   *
   * @param {FaqEntry[]} entries
   * @returns {FaqGroup[]}
   */
  function groupFaqEntries(entries) {
    /** @type {FaqGroup[]} */
    const groups = [];
    /** @type {Map<string, number>} */
    const groupIndexes = new Map();

    for (const entry of entries) {
      const name = entry.group ?? '';
      const existingIndex = groupIndexes.get(name);

      if (existingIndex !== undefined) {
        groups[existingIndex].entries.push(entry);
        continue;
      }

      groupIndexes.set(name, groups.length);
      groups.push({
        name,
        entries: [entry]
      });
    }

    return groups;
  }

  let { data } = $props();
  const t = useVisitorI18n();

  const siteLabel = $derived(resolveDocumentTitle(data.site));
  const pageTitle = $derived(formatPageTitle(t('faq.pageTitle'), data.site));
  const metaDescription = $derived(
    siteLabel
      ? t('faq.metaDescription', { siteName: siteLabel })
      : t('faq.intro')
  );
  const groups = $derived(groupFaqEntries(data.entries));
</script>

<svelte:head>
  <title>{pageTitle}</title>
  <meta name="description" content={metaDescription} />
</svelte:head>

{#if data.jsonLd}
  <JsonLd data={data.jsonLd} />
{/if}

<main class="faq-page">
  <a class="back-link" href="/">{t('common.backToShowcase')}</a>

  <header class="page-heading">
    <p class="eyebrow">{t('faq.eyebrow')}</p>
    <h1>{t('faq.title')}</h1>
    <p class="intro">{t('faq.intro')}</p>
  </header>

  {#if data.entries.length === 0}
    <p class="empty-state">{t('faq.empty')}</p>
  {:else}
    <div class="faq-groups">
      {#each groups as group}
        <section class="faq-group">
          {#if group.name}
            <h2>{group.name}</h2>
          {/if}

          <div class="faq-list">
            {#each group.entries as entry (entry.id)}
              <details>
                <summary>{entry.question}</summary>
                <p class="answer">{entry.answer}</p>
              </details>
            {/each}
          </div>
        </section>
      {/each}
    </div>
  {/if}
</main>

<style>
  .faq-page {
    width: min(760px, calc(100% - 2rem));
    margin: 0 auto;
    padding: 1.25rem 0 4rem;
  }

  .back-link {
    display: inline-flex;
    margin-bottom: 1.25rem;
    color: color-mix(in srgb, var(--site-text-color, #2f281f) 72%, transparent);
    font-weight: 600;
    text-decoration: none;
  }

  .back-link:hover {
    color: var(--site-text-color, #2f281f);
  }

  .page-heading {
    display: grid;
    gap: 0.65rem;
    margin-bottom: 2rem;
  }

  .eyebrow {
    margin: 0;
    color: color-mix(
      in srgb,
      var(--site-accent-color, #7d684f) 72%,
      var(--site-text-color, #2f281f)
    );
    font-size: 0.8rem;
    font-weight: 800;
    letter-spacing: 0.14em;
    text-transform: uppercase;
  }

  h1 {
    margin: 0;
    max-width: 18ch;
    font-size: clamp(2.4rem, 8vw, 4rem);
    line-height: 0.95;
    letter-spacing: -0.05em;
  }

  .intro {
    max-width: 58ch;
    margin: 0.35rem 0 0;
    color: color-mix(in srgb, var(--site-text-color, #2f281f) 82%, transparent);
    font-size: 1.05rem;
    line-height: 1.7;
  }

  .faq-groups,
  .faq-list {
    display: grid;
    gap: 1rem;
  }

  .faq-groups {
    gap: 2rem;
  }

  .faq-group {
    display: grid;
    gap: 0.85rem;
  }

  h2 {
    margin: 0;
    font-size: 1.2rem;
    letter-spacing: -0.02em;
  }

  details {
    border: 1px solid var(--site-border-color, #e4d8c7);
    border-radius: 1rem;
    background: color-mix(in srgb, var(--site-card-color, #fffaf2) 92%, transparent);
    box-shadow: 0 12px 36px rgb(0 0 0 / 0.07);
  }

  summary {
    padding: 1rem 1.15rem;
    color: var(--site-heading-color, var(--site-text-color, #2f281f));
    font-weight: 700;
    line-height: 1.45;
    cursor: pointer;
  }

  summary:focus-visible {
    outline: 3px solid color-mix(
      in srgb,
      var(--site-accent-color, #8c3a44) 45%,
      transparent
    );
    outline-offset: 3px;
  }

  .answer {
    margin: 0;
    padding: 0 1.15rem 1.15rem;
    color: color-mix(in srgb, var(--site-text-color, #2f281f) 88%, transparent);
    line-height: 1.7;
    white-space: pre-line;
  }

  .empty-state {
    margin: 0;
    padding: 1.2rem;
    border: 1px solid var(--site-border-color, #e4d8c7);
    border-radius: 1rem;
    background: color-mix(in srgb, var(--site-card-color, #fffaf2) 90%, transparent);
    color: color-mix(in srgb, var(--site-text-color, #2f281f) 88%, transparent);
    line-height: 1.7;
  }
</style>
