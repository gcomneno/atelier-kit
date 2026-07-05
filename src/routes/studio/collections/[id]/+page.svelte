<script>
  import { enhance } from '$app/forms';

  /** @typedef {{ id: string, title: string }} ItemSummary */

  let { data, form } = $props();

  const collectionForm = $derived(form?.collectionForm ?? data.collectionForm);
  const items = $derived(/** @type {ItemSummary[]} */ (form?.items ?? data.items));
  const itemById = $derived(Object.fromEntries(items.map((/** @type {ItemSummary} */ item) => [item.id, item])));

  /** @type {string[]} */
  let orderedIds = $state([]);

  $effect(() => {
    orderedIds = [...collectionForm.item_ids];
  });

  const availableItems = $derived(items.filter((/** @type {ItemSummary} */ item) => !orderedIds.includes(item.id)));

  /**
   * @param {number} index
   */
  function moveUp(index) {
    if (index <= 0) {
      return;
    }

    const next = [...orderedIds];
    [next[index - 1], next[index]] = [next[index], next[index - 1]];
    orderedIds = next;
  }

  /**
   * @param {number} index
   */
  function moveDown(index) {
    if (index >= orderedIds.length - 1) {
      return;
    }

    const next = [...orderedIds];
    [next[index + 1], next[index]] = [next[index], next[index + 1]];
    orderedIds = next;
  }

  /**
   * @param {string} id
   */
  function removeItem(id) {
    orderedIds = orderedIds.filter((itemId) => itemId !== id);
  }

  /**
   * @param {string} id
   */
  function addItem(id) {
    if (!orderedIds.includes(id)) {
      orderedIds = [...orderedIds, id];
    }
  }
</script>

<svelte:head>
  <title>Studio · {collectionForm.title}</title>
</svelte:head>

<p class="intro">
  Edit this collection’s public text, choose items and set their order on the public collection page.
  <a href={`/collections/${collectionForm.id}`} target="_blank" rel="noreferrer">Preview collection</a>
</p>

<section class="panel">
  <div class="panel-heading">
    <h2>{collectionForm.title}</h2>
    <p>Collection id: {collectionForm.id}</p>
  </div>

  <form method="POST" action="?/saveCollection" use:enhance class="studio-form">
    <label>
      Collection title
      <input name="title" value={collectionForm.title} required />
    </label>

    <label>
      Collection description
      <textarea name="description" rows="4" required>{collectionForm.description}</textarea>
    </label>

    <fieldset>
      <legend>Item order</legend>
      <p class="hint">The order below is used on the public collection page.</p>

      {#if orderedIds.length === 0}
        <p class="hint">No items selected yet. Add items from the list below.</p>
      {:else}
        <ol class="ordered-list">
          {#each orderedIds as itemId, index (itemId)}
            <li>
              <input type="hidden" name="item_ids" value={itemId} />
              <span class="order-label">{index + 1}.</span>
              <span class="order-title">{itemById[itemId]?.title ?? itemId}</span>
              <span class="order-id">({itemId})</span>
              <div class="order-actions">
                <button type="button" onclick={() => moveUp(index)} disabled={index === 0}>↑</button>
                <button
                  type="button"
                  onclick={() => moveDown(index)}
                  disabled={index === orderedIds.length - 1}>↓</button
                >
                <button type="button" class="remove" onclick={() => removeItem(itemId)}>Remove</button>
              </div>
            </li>
          {/each}
        </ol>
      {/if}
    </fieldset>

    {#if availableItems.length > 0}
      <fieldset>
        <legend>Add items</legend>
        <ul class="available-list">
          {#each availableItems as item}
            <li>
              <span>{item.title} <span class="order-id">({item.id})</span></span>
              <button type="button" onclick={() => addItem(item.id)}>Add</button>
            </li>
          {/each}
        </ul>
      </fieldset>
    {/if}

    <div class="actions">
      <button type="submit">Save collection</button>
      <a class="secondary-link" href="/studio/collections">Back to collections</a>
    </div>

    {#if form?.collectionMessage}
      <p class={`status ${form.collectionStatus || 'info'}`}>{form.collectionMessage}</p>
    {/if}
  </form>
</section>

<style>
  .intro {
    margin: 0 0 1.5rem;
    color: #5a4632;
    line-height: 1.6;
  }

  .panel {
    padding: 1.5rem;
    border: 1px solid rgb(47 40 31 / 0.12);
    border-radius: 1rem;
    background: rgb(255 250 242 / 0.82);
  }

  .panel-heading h2 {
    margin: 0 0 0.35rem;
    font-size: 1.2rem;
  }

  .panel-heading p {
    margin: 0 0 1rem;
    color: #7d684f;
  }

  .studio-form {
    display: grid;
    gap: 1rem;
  }

  fieldset {
    margin: 0;
    padding: 0;
    border: 0;
    display: grid;
    gap: 1rem;
  }

  legend {
    margin-bottom: 0.25rem;
    font-weight: 600;
  }

  label {
    display: grid;
    gap: 0.4rem;
    font-size: 0.95rem;
  }

  .hint {
    margin: 0;
    color: #7d684f;
    font-size: 0.85rem;
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
    background: #fffdf9;
    border: 1px solid rgb(47 40 31 / 0.08);
  }

  .order-label {
    color: #7d684f;
    font-weight: 700;
  }

  .order-id {
    color: #7d684f;
    font-size: 0.85rem;
  }

  .order-actions {
    display: flex;
    gap: 0.35rem;
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
    background: #fffdf9;
    border: 1px solid rgb(47 40 31 / 0.08);
  }

  .available-list button {
    border: 1px solid rgb(47 40 31 / 0.18);
    border-radius: 999px;
    padding: 0.35rem 0.75rem;
    background: #fffdf9;
    font: inherit;
    cursor: pointer;
  }

  .order-actions button {
    border: 1px solid rgb(47 40 31 / 0.18);
    border-radius: 0.45rem;
    padding: 0.25rem 0.55rem;
    background: #fffdf9;
    color: inherit;
    font: inherit;
    cursor: pointer;
  }

  .order-actions button.remove {
    font-size: 0.85rem;
  }

  .order-actions button:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }

  input,
  textarea {
    width: 100%;
    padding: 0.7rem 0.8rem;
    border: 1px solid rgb(47 40 31 / 0.18);
    border-radius: 0.65rem;
    background: #fffdf9;
    color: inherit;
    font: inherit;
  }

  textarea {
    resize: vertical;
  }

  .actions {
    display: flex;
    gap: 1rem;
    align-items: center;
  }

  button[type='submit'] {
    border: 0;
    border-radius: 999px;
    padding: 0.75rem 1.2rem;
    background: #2f281f;
    color: #f8f0e4;
    font: inherit;
    cursor: pointer;
  }

  .secondary-link {
    color: #5a4632;
  }

  .status {
    margin: 0;
    padding: 0.85rem 1rem;
    border-radius: 0.75rem;
    white-space: pre-wrap;
    line-height: 1.5;
  }

  .status.success {
    background: rgb(56 102 65 / 0.12);
    color: #2f4f35;
  }

  .status.warning {
    background: rgb(158 106 33 / 0.14);
    color: #6a4a1b;
  }

  .status.error {
    background: rgb(132 46 46 / 0.12);
    color: #6d2a2a;
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
