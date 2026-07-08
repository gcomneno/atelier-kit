<script>
  import { goto } from '$app/navigation';
  import { filterSearchEntries } from '$lib/search-index.js';
  import { useVisitorI18n } from '$lib/i18n/visitor-context.js';

  /** @typedef {import('$lib/search-index.js').SearchEntry} SearchEntry */

  /** @type {{ entries: SearchEntry[], overlay?: boolean }} */
  let { entries, overlay = false } = $props();

  const t = useVisitorI18n();

  let query = $state('');
  let activeIndex = $state(-1);
  /** @type {HTMLInputElement | null} */
  let inputEl = $state(null);

  const results = $derived(filterSearchEntries(entries, query));
  const trimmedQuery = $derived(query.trim());
  const isOpen = $derived(trimmedQuery.length > 0);
  const listboxId = 'site-search-results';

  $effect(() => {
    query;
    activeIndex = -1;
  });

  /** @param {KeyboardEvent} event */
  function onKeydown(event) {
    if (!isOpen) {
      return;
    }

    if (event.key === 'ArrowDown') {
      event.preventDefault();

      if (results.length === 0) {
        return;
      }

      activeIndex = activeIndex >= results.length - 1 ? 0 : activeIndex + 1;
      return;
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault();

      if (results.length === 0) {
        return;
      }

      activeIndex = activeIndex <= 0 ? results.length - 1 : activeIndex - 1;
      return;
    }

    if (event.key === 'Escape') {
      event.preventDefault();
      query = '';
      activeIndex = -1;
      inputEl?.blur();
      return;
    }

    if (event.key === 'Enter' && activeIndex >= 0 && results[activeIndex]) {
      event.preventDefault();
      goto(results[activeIndex].href);
    }
  }

  function closeSearch() {
    query = '';
    activeIndex = -1;
  }

  /** @param {SearchEntry['type']} type */
  function typeLabel(type) {
    return type === 'news' ? t('search.resultTypeNews') : t('search.resultTypeItem');
  }
</script>

<form class="site-search" class:overlay role="search" onsubmit={(event) => event.preventDefault()}>
  <label class="sr-only" for="site-search-input">{t('search.label')}</label>
  <input
    bind:this={inputEl}
    id="site-search-input"
    class="site-search-input"
    type="search"
    name="q"
    autocomplete="off"
    enterkeyhint="search"
    placeholder={t('search.placeholder')}
    bind:value={query}
    role="combobox"
    aria-expanded={isOpen}
    aria-controls={listboxId}
    aria-autocomplete="list"
    aria-activedescendant={activeIndex >= 0 ? `site-search-result-${activeIndex}` : undefined}
    onkeydown={onKeydown}
  />

  {#if isOpen}
    <div class="site-search-panel" id={listboxId} role="listbox" aria-label={t('search.resultsLabel')}>
      {#if results.length === 0}
        <p class="site-search-empty" role="status" aria-live="polite">
          {t('search.noResults', { query: trimmedQuery })}
        </p>
      {:else}
        <ul class="site-search-results">
          {#each results as result, index (result.href)}
            <li
              role="option"
              id="site-search-result-{index}"
              aria-selected={index === activeIndex}
              class:active={index === activeIndex}
            >
              <a href={result.href} class="site-search-result" onclick={closeSearch}>
                <span class="site-search-result-type">{typeLabel(result.type)}</span>
                <span class="site-search-result-title">{result.title}</span>
                {#if result.excerpt}
                  <span class="site-search-result-excerpt">{result.excerpt}</span>
                {/if}
              </a>
            </li>
          {/each}
        </ul>
      {/if}
    </div>
  {/if}
</form>

<style>
  .site-search {
    position: relative;
    flex: 1 1 12rem;
    min-width: 0;
    max-width: 18rem;
  }

  .sr-only {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    white-space: nowrap;
    border: 0;
  }

  .site-search-input {
    width: 100%;
    padding: 0.45rem 0.75rem;
    border-radius: 999px;
    border: 1px solid color-mix(in srgb, var(--site-text-color, #2f281f) 16%, transparent);
    background: color-mix(in srgb, var(--site-base-color, #f8f0e4) 72%, white);
    color: var(--site-text-color, #2f281f);
    font: inherit;
    font-size: 0.88rem;
  }

  .site-search.overlay .site-search-input {
    border-color: color-mix(in srgb, var(--site-text-color, #e8e0d4) 24%, transparent);
    background: color-mix(in srgb, var(--site-base-color, #0f0e0d) 45%, transparent);
    color: var(--site-text-color, #e8e0d4);
  }

  .site-search-input:focus {
    outline: 2px solid var(--site-accent-color, #d6be9a);
    outline-offset: 2px;
  }

  .site-search-panel {
    position: absolute;
    top: calc(100% + 0.35rem);
    left: 0;
    right: 0;
    z-index: 20;
    overflow: hidden;
    border-radius: 0.85rem;
    border: 1px solid color-mix(in srgb, var(--site-text-color, #2f281f) 12%, transparent);
    background: var(--site-card-color, #fefdfc);
    box-shadow: 0 12px 32px rgb(47 40 31 / 0.12);
  }

  .site-search-results {
    list-style: none;
    margin: 0;
    padding: 0.35rem;
  }

  .site-search-results li.active .site-search-result,
  .site-search-result:focus-visible {
    background: color-mix(in srgb, var(--site-accent-color, #d6be9a) 24%, white);
  }

  .site-search-result {
    display: grid;
    gap: 0.15rem;
    padding: 0.55rem 0.65rem;
    border-radius: 0.55rem;
    text-decoration: none;
    color: inherit;
  }

  .site-search-result-type {
    font-size: 0.72rem;
    font-weight: 600;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: var(--site-muted-text-color, #837c72);
  }

  .site-search-result-title {
    font-size: 0.92rem;
    font-weight: 600;
    line-height: 1.3;
  }

  .site-search-result-excerpt {
    font-size: 0.82rem;
    line-height: 1.4;
    color: var(--site-muted-text-color, #837c72);
  }

  .site-search-empty {
    margin: 0;
    padding: 0.75rem 0.85rem;
    font-size: 0.88rem;
    color: var(--site-muted-text-color, #837c72);
  }

  @media (max-width: 720px) {
    .site-search {
      max-width: none;
      width: 100%;
    }
  }
</style>
