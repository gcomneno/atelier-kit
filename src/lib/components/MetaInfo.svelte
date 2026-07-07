<script>
  import { useVisitorI18n } from '$lib/i18n/visitor-context.js';

  /**
   * @typedef {{ label: string, value?: string, children?: MetaInfoEntry[] }} MetaInfoEntry
   * @typedef {{ path: string, label: string, value: string, depth: number }} MetaInfoRow
   */

  /** @type {MetaInfoEntry[]} */
  export let meta = [];

  const t = useVisitorI18n();

  /**
   * @param {MetaInfoEntry[]} entries
   * @param {number} depth
   * @param {string} parentPath
   * @returns {MetaInfoRow[]}
   */
  function flattenMeta(entries, depth = 0, parentPath = '') {
    return entries.flatMap((entry, index) => {
      const path = `${parentPath}${index}`;
      const row = {
        path,
        label: entry.label,
        value: entry.value ?? '',
        depth
      };

      const children = Array.isArray(entry.children)
        ? flattenMeta(entry.children, depth + 1, `${path}.`)
        : [];

      return [row, ...children];
    });
  }

  $: rows = flattenMeta(meta);
</script>

{#if rows.length > 0}
  <section class="meta-info" aria-labelledby="item-meta-heading">
    <h2 id="item-meta-heading">{t('item.details')}</h2>

    <dl class="meta-list">
      {#each rows as row (row.path)}
        {#if row.value}
          <div class="meta-row" style={`--depth: ${row.depth}`}>
            <dt>{row.label}</dt>
            <dd>{row.value}</dd>
          </div>
        {:else}
          <div class="meta-group" style={`--depth: ${row.depth}`}>
            <h3>{row.label}</h3>
          </div>
        {/if}
      {/each}
    </dl>
  </section>
{/if}

<style>
  .meta-info {
    display: grid;
    gap: 1rem;
    padding: 1.15rem 1.25rem;
    border-radius: 1rem;
    border: 1px solid var(--site-border-color, color-mix(in srgb, var(--site-text-color, #2f281f) 12%, transparent));
    background: var(--site-card-color, var(--site-surface-color, rgb(255 255 255 / 0.72)));
  }

  h2 {
    margin: 0;
    font-size: 0.82rem;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: color-mix(in srgb, var(--site-heading-color, var(--site-text-color, #2f281f)) 58%, transparent);
  }

  .meta-list {
    display: grid;
    gap: 0;
    margin: 0;
  }

  .meta-row {
    display: grid;
    grid-template-columns: minmax(7rem, 0.42fr) minmax(0, 1fr);
    gap: 1rem;
    align-items: baseline;
    padding: 0.75rem 0;
    padding-left: calc(var(--depth) * 0.85rem);
    border-top: 1px solid color-mix(in srgb, var(--site-text-color, #2f281f) 10%, transparent);
  }

  .meta-row:first-of-type {
    border-top: 0;
    padding-top: 0;
  }

  .meta-group {
    padding-top: calc(0.65rem + var(--depth) * 0.25rem);
    padding-left: calc(var(--depth) * 0.85rem);
    border-top: 1px solid color-mix(in srgb, var(--site-text-color, #2f281f) 10%, transparent);
  }

  .meta-group:first-of-type {
    border-top: 0;
    padding-top: calc(var(--depth) * 0.25rem);
  }

  .meta-group + .meta-row {
    border-top: 0;
    padding-top: 0.35rem;
  }

  .meta-group h3 {
    margin: 0;
    font-size: 1rem;
    font-weight: 700;
    color: var(--site-heading-color, var(--site-text-color, #2f281f));
  }

  dt {
    margin: 0;
    color: color-mix(in srgb, var(--site-text-color, #2f281f) 62%, transparent);
    font-size: 0.92rem;
  }

  dd {
    margin: 0;
    color: color-mix(in srgb, var(--site-text-color, #2f281f) 88%, transparent);
    line-height: 1.45;
    overflow-wrap: anywhere;
  }

  @media (max-width: 640px) {
    .meta-row {
      grid-template-columns: 1fr;
      gap: 0.2rem;
    }
  }
</style>
