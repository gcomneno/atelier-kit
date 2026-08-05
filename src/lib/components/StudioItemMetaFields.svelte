<script>
  import { Button, EditableList, EditableListRow, ReorderActions } from 'giadaware-ui-components/studio';
  import { tick } from 'svelte';
  import StudioFieldLabel from '$lib/components/StudioFieldLabel.svelte';
  import { useI18n } from '$lib/i18n/context.js';

  /** @typedef {{ label: string, value: string }} MetaEditRow */

  /** @type {{ rows: MetaEditRow[], labels: string[], values: string[], dirtyControl?: import('$lib/studio-form-dirty.js').StudioFormDirtyControl }} */
  let { rows = $bindable([]), labels = [], values = [], dirtyControl = {} } = $props();

  const t = useI18n();

  const labelListId = 'item-meta-label-suggestions';
  const valueListId = 'item-meta-value-suggestions';

  /** @type {HTMLElement | undefined} */
  let focusRoot;

  async function notifyDirty() {
    await tick();
    dirtyControl.checkDirty?.();
  }

  /**
   * @param {number} index
   */
  function focusRow(index) {
    const input = /** @type {HTMLInputElement | undefined} */ (
      focusRoot?.querySelectorAll('input[name="meta_labels"]')[index]
    );
    input?.focus();
  }

  function focusAddButton() {
    const button = /** @type {HTMLButtonElement | null | undefined} */ (
      focusRoot?.querySelector('button.add-button')
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

<div class="meta-fields" bind:this={focusRoot}>
  <EditableList legend={t('studio.itemsEdit.details')} isEmpty={rows.length === 0}>
    {#snippet description()}
      <p class="hint">{t('studio.itemsEdit.detailsHint')}</p>
    {/snippet}

    {#snippet empty()}
      <p class="empty">{t('studio.itemsEdit.detailsEmpty')}</p>
    {/snippet}

    {#snippet children()}
      {#each rows as row, index (row)}
        <EditableListRow position={index + 1}>
          {#snippet fields()}
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
          {/snippet}

          {#snippet actions()}
            <ReorderActions
              size="compact"
              moveUpLabel={t('studio.itemsEdit.detailMoveUp', { position: index + 1 })}
              moveDownLabel={t('studio.itemsEdit.detailMoveDown', { position: index + 1 })}
              onMoveUp={() => moveUp(index)}
              onMoveDown={() => moveDown(index)}
              canMoveUp={index > 0}
              canMoveDown={index < rows.length - 1}
            />
            <Button
              variant="danger"
              size="compact"
              type="button"
              class="remove"
              onclick={() => removeRow(index)}
            >
              {t('studio.itemsEdit.detailRemove')}
            </Button>
          {/snippet}
        </EditableListRow>
      {/each}
    {/snippet}

    {#snippet addAction()}
      <Button
        variant="secondary"
        size="compact"
        type="button"
        class="add-button"
        onclick={() => addRow()}
      >
        {t('studio.itemsEdit.detailAdd')}
      </Button>
    {/snippet}
  </EditableList>

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
</div>

<style>
  .meta-fields {
    --giu-editable-list-description-gap: 0;
    --giu-editable-list-description-color: var(--studio-muted);
    --giu-editable-list-description-line-height: 1.45;
    --giu-editable-list-empty-gap: 0.75rem;
    --giu-editable-list-empty-color: var(--studio-muted);
    --giu-editable-list-empty-line-height: 1.45;
    --giu-editable-list-rows-gap: 0.75rem;
    --giu-editable-list-row-gap: 0.65rem;
    --giu-editable-list-add-action-gap: 0.85rem;
    --giu-editable-list-row-padding: 0.85rem 0.9rem;
    --giu-editable-list-row-border: 1px solid var(--studio-border);
    --giu-editable-list-row-border-radius: 0.75rem;
    --giu-editable-list-row-position-min-width: auto;
    --giu-editable-list-row-position-min-height: auto;
    --giu-editable-list-row-position-color: var(--studio-muted);
    --giu-editable-list-row-position-weight: 700;
    --giu-reorder-actions-gap: 0.35rem;
    --giu-reorder-actions-compact-control-size: auto;
    --giu-reorder-actions-padding: 0.25rem 0.55rem;
    --giu-reorder-actions-border: 1px solid var(--studio-border);
    --giu-reorder-actions-border-radius: 0.45rem;
    --giu-reorder-actions-color: inherit;
    --giu-reorder-actions-background: #fff;
    --giu-reorder-actions-arrow-size: inherit;
    --giu-reorder-actions-disabled-opacity: 0.4;
  }

  .hint,
  .empty {
    margin: 0;
    font-size: 0.92rem;
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
</style>
