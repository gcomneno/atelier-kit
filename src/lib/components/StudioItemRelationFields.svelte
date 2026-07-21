<script>
  import { tick } from 'svelte';
  import StudioFieldLabel from './StudioFieldLabel.svelte';
  import { useI18n } from '$lib/i18n/context.js';
  import { formatStudioItemRelationTarget } from '$lib/studio-item-relations.js';

  /** @typedef {{ type: string, target: string, label: string }} RelationRow */
  /** @typedef {{ id: string, title: string }} TargetItem */
  /** @type {{ rows: RelationRow[], targets: TargetItem[], typeSuggestions?: string[], currentId: string, dirtyControl?: import('$lib/studio-form-dirty.js').StudioFormDirtyControl }} */
  let { rows = $bindable([]), targets = [], typeSuggestions = [], currentId, dirtyControl = {} } = $props();

  const t = useI18n();
  const typeListId = 'item-relation-type-suggestions';

  /** @param {string} id */
  function targetText(id) {
    const item = targets.find((candidate) => candidate.id === id);
    return item ? formatStudioItemRelationTarget(item) : id;
  }

  /** @type {string[]} */
  let targetQueries = $state([]);
  let observedRows = rows;

  $effect(() => {
    if (rows !== observedRows) {
      observedRows = rows;
      targetQueries = rows.map((row) => targetText(row.target));
    }
  });

  targetQueries = rows.map((row) => targetText(row.target));

  async function notifyDirty() {
    await tick();
    dirtyControl.checkDirty?.();
  }

  /** @param {TargetItem} item @param {string} query */
  function matches(item, query) {
    const value = query.trim().toLocaleLowerCase();
    return value === '' || item.title.toLocaleLowerCase().includes(value) || item.id.toLocaleLowerCase().includes(value);
  }

  /** @param {RelationRow} row */
  function status(row) {
    if (!row.target) return '';
    if (row.target === currentId) return t('studio.itemRelations.selfTarget');
    if (!targets.some((item) => item.id === row.target)) return t('studio.itemRelations.missingTarget');
    return '';
  }

  /** @param {number} index @param {TargetItem} item */
  async function chooseTarget(index, item) {
    rows[index].target = item.id;
    targetQueries[index] = targetText(item.id);
    await notifyDirty();
  }

  /** @param {number} index @param {string} value */
  async function searchTarget(index, value) {
    targetQueries[index] = value;
    if (value !== targetText(rows[index].target)) rows[index].target = '';
    await notifyDirty();
  }

  /** @param {number} index */
  async function removeRow(index) {
    rows = rows.filter((_, rowIndex) => rowIndex !== index);
    observedRows = rows;
    targetQueries = targetQueries.filter((_, rowIndex) => rowIndex !== index);
    await notifyDirty();
  }

  async function addRow() {
    rows = [...rows, { type: '', target: '', label: '' }];
    observedRows = rows;
    targetQueries = [...targetQueries, ''];
    await notifyDirty();
  }
</script>

<fieldset class="relation-fieldset">
  <legend>{t('studio.itemRelations.title')}</legend>
  <p class="hint">{t('studio.itemRelations.hint')}</p>

  <datalist id={typeListId}>
    {#each typeSuggestions as type (type)}<option value={type}></option>{/each}
  </datalist>

  {#if rows.length === 0}
    <p class="empty">{t('studio.itemRelations.empty')}</p>
  {:else}
    <ol>
      {#each rows as row, index (row)}
        <li>
          <div class="row-fields">
            <label>
              <StudioFieldLabel label={t('studio.itemRelations.type')} required />
              <input name="relation_types" bind:value={row.type} list={typeListId} required autocomplete="off" oninput={notifyDirty} />
            </label>

            <div class="target-field">
              <label for={`relation-target-${index}`}><StudioFieldLabel label={t('studio.itemRelations.target')} required /></label>
              <input
                id={`relation-target-${index}`}
                type="search"
                value={targetQueries[index] ?? ''}
                placeholder={t('studio.itemRelations.search')}
                autocomplete="off"
                required
                aria-describedby={status(row) ? `relation-status-${index}` : undefined}
                oninput={(event) => searchTarget(index, event.currentTarget.value)}
              />
              <input type="hidden" name="relation_targets" value={row.target} />
              {#if targetQueries[index] !== targetText(row.target) || !row.target}
                <ul class="target-results">
                  {#each targets.filter((item) => item.id !== currentId && matches(item, targetQueries[index] ?? '')).slice(0, 20) as item (item.id)}
                    <li><button type="button" onclick={() => chooseTarget(index, item)}>{item.title} <span>({item.id})</span></button></li>
                  {/each}
                </ul>
              {/if}
              {#if status(row)}<p id={`relation-status-${index}`} class="error">{status(row)}</p>{/if}
            </div>

            <label>
              <StudioFieldLabel label={t('studio.itemRelations.label')} optional />
              <input name="relation_labels" bind:value={row.label} oninput={notifyDirty} />
            </label>
          </div>
          <button type="button" class="remove" onclick={() => removeRow(index)}>{t('studio.itemRelations.remove')}</button>
        </li>
      {/each}
    </ol>
  {/if}

  <button type="button" class="add" onclick={addRow}>{t('studio.itemRelations.add')}</button>
</fieldset>

<style>
  .relation-fieldset { margin: 0; padding: 0; border: 0; }
  .hint, .empty { margin: 0 0 .75rem; color: var(--studio-muted); font-size: .92rem; line-height: 1.45; }
  ol, .target-results { list-style: none; margin: 0; padding: 0; }
  ol { display: grid; gap: .75rem; }
  ol > li { display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: .65rem; align-items: start; padding: .85rem .9rem; border: 1px solid var(--studio-border); border-radius: .75rem; background: #fff; }
  .row-fields { display: grid; gap: .65rem; min-width: 0; }
  .row-fields label, .target-field { display: grid; gap: .35rem; }
  .target-results { max-height: 13rem; overflow: auto; border: 1px solid var(--studio-border); border-radius: .5rem; }
  .target-results button { width: 100%; padding: .45rem .6rem; border: 0; background: #fff; color: inherit; text-align: left; font: inherit; cursor: pointer; }
  .target-results button:hover, .target-results button:focus { background: var(--studio-panel-bg); }
  .target-results span { color: var(--studio-muted); }
  .error { margin: 0; color: #8b2020; font-size: .9rem; }
  .remove, .add { border: 1px solid var(--studio-border); border-radius: .5rem; padding: .4rem .7rem; background: #fff; font: inherit; cursor: pointer; }
  .remove { color: #7f2222; border-color: rgb(191 56 56 / .35); }
  .add { margin-top: .85rem; border-radius: 999px; color: var(--studio-accent); font-weight: 600; }
  @media (max-width: 720px) { ol > li { grid-template-columns: 1fr; } .remove { justify-self: start; } }
</style>
