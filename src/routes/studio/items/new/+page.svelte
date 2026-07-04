<script>
  import { enhance } from '$app/forms';

  let { data, form } = $props();

  const presets = $derived(data.presets);
  const itemForm = $derived(
    form?.form ?? {
      id: '',
      title: '',
      preset: data.defaultPreset,
      description: ''
    }
  );
</script>

<svelte:head>
  <title>Studio · New item</title>
</svelte:head>

<p class="intro">
  Create a new item file under <code>content/items/</code>. Use lowercase letters, numbers and hyphens for the item id, for example <code>silver-ring</code>.
</p>

<section class="panel">
  <div class="panel-heading">
    <h2>New item</h2>
    <p>Starter meta fields come from the preset you choose.</p>
  </div>

  <form method="POST" action="?/createItem" enctype="multipart/form-data" use:enhance class="studio-form">
    <label>
      Item id
      <span class="hint">Cannot be changed later. Becomes the file name and URL slug.</span>
      <input
        name="id"
        value={itemForm.id}
        required
        pattern="[a-z0-9]+(?:-[a-z0-9]+)*"
        title="Use lowercase letters, numbers and hyphens only."
      />
    </label>

    <label>
      Item title
      <input name="title" value={itemForm.title} required />
    </label>

    <label>
      Meta preset
      <select name="preset" value={itemForm.preset}>
        {#each presets as preset}
          <option value={preset.id}>{preset.label}</option>
        {/each}
      </select>
    </label>

    <label>
      Description
      <textarea name="description" rows="4">{itemForm.description}</textarea>
    </label>

    <label>
      Photo (optional)
      <span class="hint">JPG, PNG or WebP. Saved as static/images/items/{itemForm.id || 'item-id'}.jpg</span>
      <input type="file" name="image_upload" accept="image/jpeg,image/png,image/webp" />
    </label>

    <div class="actions">
      <button type="submit">Create item</button>
      <a class="secondary-link" href="/studio/items">Cancel</a>
    </div>

    {#if form?.createMessage}
      <p class={`status ${form.createStatus || 'info'}`}>{form.createMessage}</p>
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
  textarea,
  select {
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
