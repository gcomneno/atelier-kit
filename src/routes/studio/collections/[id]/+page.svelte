<script>
  import { enhance } from '$app/forms';

  let { data, form } = $props();

  const collectionForm = $derived(form?.collectionForm ?? data.collectionForm);
  const items = $derived(form?.items ?? data.items);
  const selectedIds = $derived(new Set(collectionForm.item_ids));
</script>

<svelte:head>
  <title>Studio · {collectionForm.title}</title>
</svelte:head>

<p class="intro">
  Edit this collection’s public text and choose which items it includes.
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
      <legend>Included items</legend>

      {#if items.length === 0}
        <p class="hint">No items available. Create an item first.</p>
      {:else}
        <div class="checkbox-list">
          {#each items as item}
            <label class="checkbox">
              <input
                type="checkbox"
                name="item_ids"
                value={item.id}
                checked={selectedIds.has(item.id)}
              />
              {item.title}
              <span>({item.id})</span>
            </label>
          {/each}
        </div>
      {/if}
    </fieldset>

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

  .checkbox {
    grid-template-columns: auto 1fr;
    align-items: center;
    gap: 0.65rem;
  }

  .checkbox span {
    color: #7d684f;
    font-size: 0.85rem;
  }

  .checkbox-list {
    display: grid;
    gap: 0.65rem;
  }

  .hint {
    margin: 0;
    color: #7d684f;
    font-size: 0.85rem;
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

  button {
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
</style>
