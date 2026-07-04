<script>
  import { enhance } from '$app/forms';

  let { data, form } = $props();

  const itemForm = $derived(form?.itemForm ?? data.itemForm);
</script>

<svelte:head>
  <title>Studio · {itemForm.title}</title>
</svelte:head>

<p class="intro">
  Edit this item’s public content. Image upload is not handled here yet — set the image path after adding a file under <code>static/images/items/</code>.
  <a href={`/items/${itemForm.id}`} target="_blank" rel="noreferrer">Preview item</a>
</p>

<section class="panel">
  <div class="panel-heading">
    <h2>{itemForm.title}</h2>
    <p>Item id: {itemForm.id}</p>
  </div>

  <form method="POST" action="?/saveItem" use:enhance class="studio-form">
    <label>
      Item title
      <input name="title" value={itemForm.title} required />
    </label>

    <label>
      Subtitle
      <input name="subtitle" value={itemForm.subtitle} />
    </label>

    <label>
      Status
      <input name="status" value={itemForm.status} />
    </label>

    <label>
      Price mode
      <input name="price_mode" value={itemForm.price_mode} />
    </label>

    <label>
      Image path
      <input name="image_file" value={itemForm.image_file} required />
    </label>

    <label>
      Image description
      <input name="image_alt" value={itemForm.image_alt} />
    </label>

    <label>
      Description
      <textarea name="description" rows="5" required>{itemForm.description}</textarea>
    </label>

    <label>
      Item notice
      <span class="hint">Leave empty to hide the notice on the item page.</span>
      <textarea name="notice" rows="2">{itemForm.notice}</textarea>
    </label>

    {#if itemForm.meta.length > 0}
      <fieldset>
        <legend>Item details</legend>

        {#each itemForm.meta as entry, index}
          {#if typeof entry.value === 'string'}
            <label>
              {entry.label}
              <input name={`meta_${index}_value`} value={entry.value} />
            </label>
          {/if}

          {#if Array.isArray(entry.children)}
            {#each entry.children as child, childIndex}
              {#if typeof child.value === 'string'}
                <label>
                  {entry.label} › {child.label}
                  <input
                    name={`meta_${index}_child_${childIndex}_value`}
                    value={child.value}
                  />
                </label>
              {/if}
            {/each}
          {/if}
        {/each}
      </fieldset>
    {/if}

    <div class="actions">
      <button type="submit">Save item</button>
      <a class="secondary-link" href="/studio/items">Back to items</a>
    </div>

    {#if form?.itemMessage}
      <p class={`status ${form.itemStatus || 'info'}`}>{form.itemMessage}</p>
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
