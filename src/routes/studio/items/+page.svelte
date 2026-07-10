<script>
  import { enhance } from '$app/forms';
  import { tick } from 'svelte';
  import StudioFieldLabel from '$lib/components/StudioFieldLabel.svelte';
  import StudioFormLegend from '$lib/components/StudioFormLegend.svelte';
  import StudioFormStatus from '$lib/components/StudioFormStatus.svelte';
  import { useI18n } from '$lib/i18n/context.js';
  import { studioFormDirty, studioFormEnhanceDirty } from '$lib/studio-form-dirty.js';

  /** @typedef {{ id: string, title: string, status: string }} ItemSummary */

  const t = useI18n();

  let { data, form } = $props();

  const objectNamesForm = $derived(form?.objectNamesForm ?? data.objectNamesForm);
  const items = $derived(/** @type {ItemSummary[]} */ (form?.items ?? data.items));
  const itemById = $derived(Object.fromEntries(items.map((/** @type {ItemSummary} */ item) => [item.id, item])));

  /** @type {string[]} */
  let orderedIds = $state([]);
  let itemNamesDirty = $state(false);
  let orderDirty = $state(false);
  /** @type {import('$lib/studio-form-dirty.js').StudioFormDirtyControl} */
  const itemNamesDirtyControl = {};
  /** @type {import('$lib/studio-form-dirty.js').StudioFormDirtyControl} */
  const orderDirtyControl = {};

  $effect(() => {
    orderedIds = items.map((/** @type {ItemSummary} */ item) => item.id);
    orderDirtyControl.resetBaseline?.();
  });

  $effect(() => {
    objectNamesForm;
    itemNamesDirtyControl.resetBaseline?.();
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
  <title>{t('studio.items.pageTitle')}</title>
</svelte:head>

<p class="studio-intro">
  {t('studio.items.intro')}
</p>

{#if data.deletedItemTitle}
  <StudioFormStatus
    status="success"
    message={t('studio.items.deletedSuccess', { title: data.deletedItemTitle })}
  />
{:else if data.missingItemId}
  <StudioFormStatus
    status="warning"
    message={t('studio.items.missingItem', { id: data.missingItemId })}
  />
{/if}

<section class="studio-panel">
  <form
    method="POST"
    action="?/saveItemNames"
    use:studioFormDirty={{ setDirty: (value) => (itemNamesDirty = value), dirtyControl: itemNamesDirtyControl }}
    use:enhance={() => studioFormEnhanceDirty(itemNamesDirtyControl)}
    class="studio-form"
  >
    <StudioFormLegend />

    <fieldset>
      <legend>{t('studio.items.namesLegend')}</legend>
      <p class="hint">{t('studio.items.namesHint')}</p>

      <label>
        <StudioFieldLabel label={t('studio.items.singular')} required />
        <input name="item_name_singular" value={objectNamesForm.item_name_singular} required />
      </label>

      <label>
        <StudioFieldLabel label={t('studio.items.plural')} required />
        <input name="item_name_plural" value={objectNamesForm.item_name_plural} required />
      </label>
    </fieldset>

    <div class="actions">
      <button type="submit" disabled={!itemNamesDirty}>{t('studio.items.saveNames')}</button>
    </div>

    <StudioFormStatus message={form?.itemNamesMessage} status={form?.itemNamesStatus} />
  </form>
</section>

<section class="studio-panel">
  <div class="panel-heading">
    <h2>{t('studio.items.title')}</h2>
    <p>{t('studio.items.count', { count: items.length })}</p>
    <p class="create-link"><a href="/studio/items/new">{t('studio.items.createLink')}</a></p>
  </div>

  {#if items.length === 0}
    <p class="empty">{t('studio.items.empty')}</p>
  {:else}
    <form
      method="POST"
      action="?/saveItemOrder"
      use:studioFormDirty={{ setDirty: (value) => (orderDirty = value), dirtyControl: orderDirtyControl }}
      use:enhance={() => studioFormEnhanceDirty(orderDirtyControl)}
      class="studio-form"
    >
      <StudioFormLegend />

      <fieldset>
        <legend>{t('studio.items.orderLegend')}</legend>
        <p class="hint">{t('studio.items.orderHint')}</p>

        <ol class="ordered-list">
          {#each orderedIds as itemId, index (itemId)}
            {@const item = itemById[itemId]}
            <li>
              <input type="hidden" name="item_ids" value={itemId} />
              <span class="order-label">{index + 1}.</span>
              <a class="order-link" href={`/studio/items/${itemId}`}>
                <strong>{item?.title ?? itemId}</strong>
                <span>{itemId}</span>
                {#if item?.status}
                  <span class="badge">{item.status}</span>
                {/if}
              </a>
              <div class="order-actions">
                <button type="button" onclick={() => moveUp(index)} disabled={index === 0}>↑</button>
                <button
                  type="button"
                  onclick={() => moveDown(index)}
                  disabled={index === orderedIds.length - 1}>↓</button
                >
              </div>
            </li>
          {/each}
        </ol>
      </fieldset>

      <div class="actions">
        <button type="submit" disabled={!orderDirty}>{t('studio.items.saveOrder')}</button>
      </div>

      <StudioFormStatus message={form?.itemOrderMessage} status={form?.itemOrderStatus} />
    </form>
  {/if}
</section>

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

  .actions {
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
