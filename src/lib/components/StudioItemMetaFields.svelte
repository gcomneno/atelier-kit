<script>
  import { Button } from 'giadaware-ui-components/studio';
  import { tick } from 'svelte';
  import StudioFieldLabel from '$lib/components/StudioFieldLabel.svelte';
  import { useI18n } from '$lib/i18n/context.js';

  /** @typedef {{ label: string, value: string }} MetaEditRow */

  /** @type {{ rows: MetaEditRow[], labels: string[], values: string[], dirtyControl?: import('$lib/studio-form-dirty.js').StudioFormDirtyControl }} */
  let { rows = $bindable([]), labels = [], values = [], dirtyControl = {} } = $props();

  const t = useI18n();

  const labelListId = 'item-meta-label-suggestions';
  const valueListId = 'item-meta-value-suggestions';

  /** @type {HTMLFieldSetElement | undefined} */
  let fieldset;

  async function notifyDirty() {
    await tick();
    dirtyControl.checkDirty?.();
  }

  /**
   * @param {number} index
   */
  function focusRow(index) {
    const input = /** @type {HTMLInputElement | undefined} */ (
      fieldset?.querySelectorAll('input[name="meta_labels"]')[index]
    );
    input?.focus();
  }

  function focusAddButton() {
    const button = /** @type {HTMLButtonElement | null | undefined} */ (
      fieldset?.querySelector('button.add-button')
    );
    button?.focus();
  }

  /**
   * @param {number} index
   */
  async function moveUp(index) {
    if (index <= 0) {
      return;
    }

    const next = [...rows];
    [next[index - 1], next[index]] = [next[index], next[index - 1]];
    rows = next;
    await notifyDirty();
  }

  /**
   * @param {number} index
   */
  async function moveDown(index) {
    if (index >= rows.length - 1) {
      return;
    }

    const next = [...rows];
    [next[index + 1], next[index]] = [next[index], next[index + 1]];
    rows = next;
    await notifyDirty();
  }

  /**
   * @param {number} index
   */
  async function removeRow(index) {
    const focusIndex = Math.min(index, rows.length - 2);
    rows = rows.filter((_, rowIndex) => rowIndex !== index);
    await notifyDirty();

    if (rows.length === 0) {
      focusAddButton();
      return;
    }

    focusRow(focusIndex);
  }

  async function addRow() {
    const focusIndex = rows.length;
    rows = [...rows, { label: '', value: '' }];
    await notifyDirty();
    focusRow(focusIndex);
  }
</script>

<fieldset class="meta-fieldset" bind:this={fieldset}>
  <legend>{t('studio.itemsEdit.details')}</legend>
  <p class="hint">{t('studio.itemsEdit.detailsHint')}</p>

  <datalist id={labelListId}>
    {#each labels as label (label)}
      <option value={label}></option>
    {/each}
  </datalist>

  <datalist id={valueListId}>
    {#each values as value (value)}
      <option value={value}></option>
    {/each}
  </datalist>

  {#if rows.length === 0}
    <p class="empty">{t('studio.itemsEdit.detailsEmpty')}</p>
  {:else}
    <ol class="ordered-list">
      {#each rows as row, index (row)}
        <li>
          <span class="order-label">{index + 1}.</span>

          <div class="row-fields">
            <label>
              <StudioFieldLabel label={t('studio.itemsEdit.detailLabel')} optional />
              <input
                name="meta_labels"
                bind:value={row.label}
                list={labelListId}
                autocomplete="off"
                oninput={() => notifyDirty()}
              />
            </label>

            <label>
              <StudioFieldLabel label={t('studio.itemsEdit.detailValue')} optional />
              <input
                name="meta_values"
                bind:value={row.value}
                list={valueListId}
                autocomplete="off"
                oninput={() => notifyDirty()}
              />
            </label>
          </div>

          <div class="order-actions">
            <button
              type="button"
              onclick={() => moveUp(index)}
              disabled={index === 0}
              aria-label={t('studio.itemsEdit.detailMoveUp', { position: index + 1 })}
              title={t('studio.itemsEdit.detailMoveUp', { position: index + 1 })}
            >
              ↑
            </button>
            <button
              type="button"
              onclick={() => moveDown(index)}
              disabled={index === rows.length - 1}
              aria-label={t('studio.itemsEdit.detailMoveDown', { position: index + 1 })}
              title={t('studio.itemsEdit.detailMoveDown', { position: index + 1 })}
            >
              ↓
            </button>
            <Button
              variant="danger"
              size="compact"
              type="button"
              class="remove"
              onclick={() => removeRow(index)}
            >
              {t('studio.itemsEdit.detailRemove')}
            </Button>
          </div>
        </li>
      {/each}
    </ol>
  {/if}

  <p class="add-row">
    <Button
      variant="secondary"
      size="compact"
      type="button"
      class="add-button"
      onclick={() => addRow()}
    >
      {t('studio.itemsEdit.detailAdd')}
    </Button>
  </p>
</fieldset>

<style>
  .meta-fieldset {
    margin: 0;
    padding: 0;
    border: 0;
  }

  .hint,
  .empty {
    margin: 0 0 0.75rem;
    color: var(--studio-muted);
    font-size: 0.92rem;
    line-height: 1.45;
  }

  .ordered-list {
    list-style: none;
    margin: 0;
    padding: 0;
    display: grid;
    gap: 0.75rem;
  }

  .ordered-list li {
    display: grid;
    grid-template-columns: auto minmax(0, 1fr) auto;
    gap: 0.65rem;
    align-items: start;
    padding: 0.85rem 0.9rem;
    border-radius: 0.75rem;
    background: #fff;
    border: 1px solid var(--studio-border);
  }

  .order-label {
    padding-top: 1.85rem;
    color: var(--studio-muted);
    font-weight: 700;
  }

  .row-fields {
    display: grid;
    gap: 0.65rem;
    min-width: 0;
  }

  .row-fields label {
    display: grid;
    gap: 0.35rem;
  }

  .order-actions {
    display: flex;
    flex-wrap: wrap;
    gap: 0.35rem;
    padding-top: 1.55rem;
  }

  .order-actions button {
    border: 1px solid var(--studio-border);
    border-radius: 0.45rem;
    padding: 0.25rem 0.55rem;
    background: #fff;
    color: inherit;
    font: inherit;
    cursor: pointer;
  }

  .order-actions button:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }

  .add-row {
    margin: 0.85rem 0 0;
  }

  @media (max-width: 720px) {
    .ordered-list li {
      grid-template-columns: 1fr;
    }

    .order-label,
    .order-actions {
      padding-top: 0;
    }

    .order-actions {
      justify-content: flex-start;
    }
  }
</style>
