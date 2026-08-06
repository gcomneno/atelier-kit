<script>
  import { Button, FormActions, PageIntro, Panel, ReorderActions } from 'giadaware-ui-components/studio';
  import MarkedTextField from '$lib/components/MarkedTextField.svelte';
  import { enhance } from '$app/forms';
  import { tick } from 'svelte';
  import StudioFieldLabel from '$lib/components/StudioFieldLabel.svelte';
  import StudioFormLegend from '$lib/components/StudioFormLegend.svelte';
  import StudioFormStatus from '$lib/components/AtelierFormStatus.svelte';
  import { useI18n } from '$lib/i18n/context.js';
  import { studioFormDirty, studioFormEnhanceDirty } from '$lib/studio-form-dirty.js';

  /** @typedef {{ id: string, title: string }} ItemSummary */

  const t = useI18n();

  let { data, form } = $props();

  const collectionForm = $derived(form?.collectionForm ?? data.collectionForm);
  const items = $derived(/** @type {ItemSummary[]} */ (form?.items ?? data.items));
  const itemById = $derived(Object.fromEntries(items.map((/** @type {ItemSummary} */ item) => [item.id, item])));

  /** @type {string[]} */
  let orderedIds = $state([]);
  let isDirty = $state(false);
  /** @type {import('$lib/studio-form-dirty.js').StudioFormDirtyControl} */
  const dirtyControl = {};

  $effect(() => {
    orderedIds = [...collectionForm.item_ids];
    dirtyControl.resetBaseline?.();
  });

  const availableItems = $derived(items.filter((/** @type {ItemSummary} */ item) => !orderedIds.includes(item.id)));

  /**
   * @param {number} index
   */
  async function moveUp(index) {
    if (index <= 0) {
      return;
    }

    const next = [...orderedIds];
    [next[index - 1], next[index]] = [next[index], next[index - 1]];
    orderedIds = next;
    await tick();
    dirtyControl.checkDirty?.();
  }

  /**
   * @param {number} index
   */
  async function moveDown(index) {
    if (index >= orderedIds.length - 1) {
      return;
    }

    const next = [...orderedIds];
    [next[index + 1], next[index]] = [next[index], next[index + 1]];
    orderedIds = next;
    await tick();
    dirtyControl.checkDirty?.();
  }

  /**
   * @param {string} id
   */
  async function removeItem(id) {
    orderedIds = orderedIds.filter((itemId) => itemId !== id);
    await tick();
    dirtyControl.checkDirty?.();
  }

  /**
   * @param {string} id
   */
  async function addItem(id) {
    if (!orderedIds.includes(id)) {
      orderedIds = [...orderedIds, id];
      await tick();
      dirtyControl.checkDirty?.();
    }
  }

  function confirmDelete() {
    return confirm(
      t('studio.collectionsEdit.deleteConfirm', {
        title: collectionForm.title,
        id: collectionForm.id
      })
    );
  }
</script>

<svelte:head>
  <title>Studio · {collectionForm.title}</title>
</svelte:head>

<PageIntro>
  {t('studio.collectionsEdit.intro')}
</PageIntro>

<Panel title={collectionForm.title} id="collection-editor" class="atelier-studio-panel">

  <div class="panel-summary">
    <p>{t('studio.collectionsEdit.collectionId', { id: collectionForm.id })}</p>
  </div>

  <form
    method="POST"
    action="?/saveCollection"
    use:studioFormDirty={{ setDirty: (value) => (isDirty = value), dirtyControl }}
    use:enhance={() => studioFormEnhanceDirty(dirtyControl)}
    class="studio-form"
  >
    <StudioFormLegend />

    <label>
      <StudioFieldLabel label={t('studio.collectionsEdit.titleField')} required />
      <MarkedTextField name="title" value={collectionForm.title} />
    </label>

    <label>
      <StudioFieldLabel label={t('studio.collectionsEdit.description')} required />
      <MarkedTextField name="description" value={collectionForm.description} multiline rows={4} />
    </label>

    <fieldset>
      <legend>
        {t('studio.collectionsEdit.itemOrder')}
        <abbr class="field-badge required" title={t('studio.forms.atLeastOne')}>*</abbr>
      </legend>
      <p class="hint">{t('studio.collectionsEdit.orderHint')} {t('studio.forms.atLeastOne')}</p>

      {#if orderedIds.length === 0}
        <p class="hint">{t('studio.collectionsEdit.noItemsSelected')}</p>
      {:else}
        <ol class="ordered-list">
          {#each orderedIds as itemId, index (itemId)}
            <li>
              <input type="hidden" name="item_ids" value={itemId} />
              <span class="order-label">{index + 1}.</span>
              <span class="order-title">{itemById[itemId]?.title ?? itemId}</span>
              <span class="order-id">({itemId})</span>
              <div class="order-actions">
                <ReorderActions
                  size="compact"
                  moveUpLabel={t('studio.collectionsEdit.moveUp', { position: index + 1 })}
                  moveDownLabel={t('studio.collectionsEdit.moveDown', { position: index + 1 })}
                  onMoveUp={() => moveUp(index)}
                  onMoveDown={() => moveDown(index)}
                  canMoveUp={index > 0}
                  canMoveDown={index < orderedIds.length - 1}
                />
                <Button variant="danger" type="button" class="remove" onclick={() => removeItem(itemId)}>{t('studio.collectionsEdit.remove')}</Button>
              </div>
            </li>
          {/each}
        </ol>
      {/if}
    </fieldset>

    {#if availableItems.length > 0}
      <fieldset>
        <legend>{t('studio.collectionsEdit.addItems')}</legend>
        <ul class="available-list">
          {#each availableItems as item}
            <li>
              <span>{item.title} <span class="order-id">({item.id})</span></span>
              <Button type="button" onclick={() => addItem(item.id)}>{t('studio.collectionsEdit.add')}</Button>
            </li>
          {/each}
        </ul>
      </fieldset>
    {/if}

    <FormActions>
      <Button type="submit" disabled={!isDirty}>{t('studio.collectionsEdit.save')}</Button>
      <a class="secondary-link" href="/studio/collections">{t('studio.collectionsEdit.back')}</a>
    </FormActions>

    <StudioFormStatus message={form?.collectionMessage} status={form?.collectionStatus} />
  </form>

  <form method="POST" action="?/deleteCollection" class="danger-zone" use:enhance>
    <Button variant="danger"
      type="submit"
      class="remove-button"
      onclick={(event) => {
        if (!confirmDelete()) {
          event.preventDefault();
        }
      }}
    >
      {t('studio.collectionsEdit.delete')}
    </Button>
  </form>
</Panel>

<style>
  .hint {
    margin: 0;
  }

  .ordered-list {
    list-style: none;
    margin: 0;
    padding: 0;
    display: grid;
    gap: 0.65rem;
  }

  .ordered-list li {
    display: grid;
    grid-template-columns: auto 1fr auto auto;
    gap: 0.65rem;
    align-items: center;
    padding: 0.75rem 0.9rem;
    border-radius: 0.75rem;
    background: #fff;
    border: 1px solid var(--studio-border);
  }

  .order-label {
    color: var(--studio-muted);
    font-weight: 700;
  }

  .order-id {
    color: var(--studio-muted);
    font-size: 0.85rem;
  }

  .order-actions {
    display: flex;
    gap: 0.35rem;
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

  .available-list {
    list-style: none;
    margin: 0;
    padding: 0;
    display: grid;
    gap: 0.65rem;
  }

  .available-list li {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 1rem;
    padding: 0.65rem 0.9rem;
    border-radius: 0.75rem;
    background: #fff;
    border: 1px solid var(--studio-border);
  }


  .secondary-link {
    color: var(--studio-accent);
    font-weight: 600;
    text-decoration: none;
  }

  .secondary-link:hover {
    text-decoration: underline;
  }

  .danger-zone {
    margin-top: 1.25rem;
    padding-top: 1.25rem;
    border-top: 1px solid var(--studio-border);
  }


  @media (max-width: 640px) {
    .ordered-list li {
      grid-template-columns: 1fr;
    }

    .order-actions {
      justify-content: flex-start;
    }
  }
</style>
