<script>
  import { Button, FormActions, PageIntro, Panel, ReorderActions } from 'giadaware-ui-components/studio';
  import { enhance } from '$app/forms';
  import { tick } from 'svelte';
  import StudioFieldLabel from '$lib/components/StudioFieldLabel.svelte';
  import StudioFormLegend from '$lib/components/StudioFormLegend.svelte';
  import StudioFormStatus from '$lib/components/AtelierFormStatus.svelte';
  import { useI18n } from '$lib/i18n/context.js';
  import { studioFormDirty, studioFormEnhanceDirty } from '$lib/studio-form-dirty.js';

  /** @typedef {{ id: string, title: string, itemCount: number }} CollectionSummary */

  const t = useI18n();

  let { data, form } = $props();

  const collections = $derived(
    /** @type {CollectionSummary[]} */ (form?.collections ?? data.collections)
  );
  const collectionById = $derived(
    Object.fromEntries(collections.map((/** @type {CollectionSummary} */ collection) => [collection.id, collection]))
  );
  const collectionsEditorialForm = $derived(
    form?.collectionsEditorialForm ?? data.collectionsEditorialForm
  );

  /** @type {string[]} */
  let orderedIds = $state([]);
  let editorialIsDirty = $state(false);
  let orderIsDirty = $state(false);

  /** @type {import('$lib/studio-form-dirty.js').StudioFormDirtyControl} */
  const editorialDirtyControl = {};

  /** @type {import('$lib/studio-form-dirty.js').StudioFormDirtyControl} */
  const orderDirtyControl = {};

  $effect(() => {
    collectionsEditorialForm;
    editorialDirtyControl.resetBaseline?.();
  });

  $effect(() => {
    orderedIds = collections.map((/** @type {CollectionSummary} */ collection) => collection.id);
    orderDirtyControl.resetBaseline?.();
  });

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
    orderDirtyControl.checkDirty?.();
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
    orderDirtyControl.checkDirty?.();
  }
</script>

<svelte:head>
  <title>{t('studio.collections.pageTitle')}</title>
</svelte:head>

<PageIntro>
  {t('studio.collections.intro')}
</PageIntro>

{#if data.deletedCollectionTitle}
  <StudioFormStatus
    status="success"
    message={t('studio.collections.deletedSuccess', { title: data.deletedCollectionTitle })}
  />
{:else if data.missingCollectionId}
  <StudioFormStatus
    status="warning"
    message={t('studio.collections.missingCollection', { id: data.missingCollectionId })}
  />
{/if}

<Panel title={t('studio.collections.title')} id="collections" class="atelier-studio-panel">

  <form
    method="POST"
    action="?/saveCollectionsEditorial"
    use:studioFormDirty={{
      setDirty: (value) => (editorialIsDirty = value),
      dirtyControl: editorialDirtyControl
    }}
    use:enhance={() =>
      studioFormEnhanceDirty(editorialDirtyControl)}
    class="studio-form"
  >
    <StudioFormLegend />

    <fieldset>
      <legend>{t('studio.collections.editorialLegend')}</legend>

      <label>
        <StudioFieldLabel
          label={t('studio.collections.homeEyebrow')}
          optional
          hint={t('studio.collections.homeEyebrowHint')}
        />
        <input
          type="text"
          name="home_eyebrow"
          value={collectionsEditorialForm.home_eyebrow}
        />
      </label>

      <label>
        <StudioFieldLabel
          label={t('studio.collections.pageEyebrow')}
          optional
          hint={t('studio.collections.pageEyebrowHint')}
        />
        <input
          type="text"
          name="page_eyebrow"
          value={collectionsEditorialForm.page_eyebrow}
        />
      </label>

      <label>
        <StudioFieldLabel
          label={t('collections.pageTitle')}
          optional
        />
        <input
          type="text"
          name="title"
          value={collectionsEditorialForm.title}
        />
      </label>

      <label>
        <StudioFieldLabel
          label={t('collections.intro', { itemPlural: data.catalog.item_name_plural })}
          optional
        />
        <textarea
          name="intro"
          rows="4"
        >{collectionsEditorialForm.intro}</textarea>
      </label>
    </fieldset>

    <FormActions>
      <Button type="submit" disabled={!editorialIsDirty}>
        {t('studio.collections.saveEditorial')}
      </Button>
    </FormActions>

    <StudioFormStatus
      message={form?.collectionsEditorialMessage}
      status={form?.collectionsEditorialStatus}
    />
  </form>

  <div class="panel-summary">
    <p>{t('studio.collections.count', { count: collections.length })}</p>
    <p class="create-link"><a href="/studio/collections/new">{t('studio.collections.createLink')}</a></p>
  </div>

  {#if collections.length === 0}
    <p class="empty">{t('studio.collections.empty')}</p>
  {:else}
    <form
      method="POST"
      action="?/saveCollectionOrder"
      use:studioFormDirty={{
        setDirty: (value) => (orderIsDirty = value),
        dirtyControl: orderDirtyControl
      }}
      use:enhance={() =>
        studioFormEnhanceDirty(orderDirtyControl)}
      class="studio-form"
    >
      <StudioFormLegend />

      <fieldset>
        <legend>{t('studio.collections.orderLegend')}</legend>
        <p class="hint">{t('studio.collections.orderHint')}</p>

        <ol class="ordered-list">
          {#each orderedIds as collectionId, index (collectionId)}
            {@const collection = collectionById[collectionId]}
            <li>
              <input type="hidden" name="collection_ids" value={collectionId} />
              <span class="order-label">{index + 1}.</span>
              <a class="order-link" href={`/studio/collections/${collectionId}`}>
                <strong>{collection?.title ?? collectionId}</strong>
                <span>{collectionId}</span>
                <span>{t('studio.collections.itemCount', { count: collection?.itemCount ?? 0 })}</span>
              </a>
              <div class="order-actions">
                <ReorderActions
                  size="compact"
                  moveUpLabel={t('studio.collections.moveUp', { position: index + 1 })}
                  moveDownLabel={t('studio.collections.moveDown', { position: index + 1 })}
                  onMoveUp={() => moveUp(index)}
                  onMoveDown={() => moveDown(index)}
                  canMoveUp={index > 0}
                  canMoveDown={index < orderedIds.length - 1}
                />
              </div>
            </li>
          {/each}
        </ol>
      </fieldset>

      <FormActions class="order-form-actions">
        <Button type="submit" disabled={!orderIsDirty}>{t('studio.collections.saveOrder')}</Button>
      </FormActions>

      <StudioFormStatus message={form?.collectionOrderMessage} status={form?.collectionOrderStatus} />
    </form>
  {/if}
</Panel>

<style>
  .hint {
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
    gap: 0.65rem;
  }

  .ordered-list li {
    display: grid;
    grid-template-columns: auto minmax(0, 1fr) auto;
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

  .order-link {
    display: grid;
    gap: 0.2rem;
    min-width: 0;
    color: inherit;
    text-decoration: none;
  }

  .order-link:hover strong {
    color: var(--studio-accent);
  }

  .order-link span {
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

  :global(.order-form-actions) {
    margin-top: 1rem;
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
