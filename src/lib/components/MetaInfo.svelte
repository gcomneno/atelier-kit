<script>
  /**
   * @typedef {{ label: string, value?: string, children?: MetaInfoEntry[] }} MetaInfoEntry
   * @typedef {{ path: string, label: string, value: string, depth: number }} MetaInfoRow
   */

  /** @type {MetaInfoEntry[]} */
  export let meta = [];

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
    <h2 id="item-meta-heading">Details</h2>

    <ul class="meta-tree">
      {#each rows as row (row.path)}
        <li class:branch={!row.value} style={`--depth: ${row.depth}`}>
          <span class="meta-label">{row.label}</span>

          {#if row.value}
            <span class="meta-value">{row.value}</span>
          {/if}
        </li>
      {/each}
    </ul>
  </section>
{/if}

<style>
  .meta-info {
    display: grid;
    gap: 0.85rem;
    border: 1px solid rgba(20, 20, 20, 0.12);
    border-radius: 1rem;
    padding: 1rem;
    background: rgba(255, 255, 255, 0.72);
  }

  h2 {
    margin: 0;
    font-size: 1rem;
  }

  .meta-tree {
    display: grid;
    gap: 0.55rem;
    margin: 0;
    padding: 0;
    list-style: none;
  }

  li {
    display: grid;
    grid-template-columns: minmax(8rem, 0.55fr) minmax(0, 1fr);
    gap: 0.75rem;
    align-items: baseline;
    padding-left: calc(var(--depth) * 1.15rem);
  }

  li.branch {
    grid-template-columns: 1fr;
    margin-top: 0.35rem;
  }

  li.branch .meta-label {
    font-weight: 800;
  }

  .meta-label {
    color: rgba(20, 20, 20, 0.62);
    font-size: 0.92rem;
  }

  .meta-value {
    color: rgba(20, 20, 20, 0.88);
    line-height: 1.45;
  }

  @media (max-width: 640px) {
    li {
      grid-template-columns: 1fr;
      gap: 0.2rem;
    }
  }
</style>
