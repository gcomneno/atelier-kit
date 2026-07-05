<script>
  import { enhance } from '$app/forms';
  import { useI18n } from '$lib/i18n/context.js';

  const t = useI18n();

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
  <title>{t('studio.itemsNew.pageTitle')}</title>
</svelte:head>

<p class="intro">
  {t('studio.itemsNew.intro')}
</p>

<section class="panel">
  <div class="panel-heading">
    <h2>{t('studio.itemsNew.title')}</h2>
    <p>{t('studio.itemsNew.introPanel')}</p>
  </div>

  <form method="POST" action="?/createItem" enctype="multipart/form-data" use:enhance class="studio-form">
    <label>
      {t('studio.itemsNew.id')}
      <span class="hint">{t('studio.itemsNew.idHint')}</span>
      <input
        name="id"
        value={itemForm.id}
        required
        pattern="[a-z0-9]+(?:-[a-z0-9]+)*"
        title={t('studio.itemsNew.idPattern')}
      />
    </label>

    <label>
      {t('studio.itemsNew.titleField')}
      <input name="title" value={itemForm.title} required />
    </label>

    <label>
      {t('studio.itemsNew.preset')}
      <select name="preset" value={itemForm.preset}>
        {#each presets as preset}
          <option value={preset.id}>{preset.label}</option>
        {/each}
      </select>
    </label>

    <label>
      {t('studio.itemsNew.description')}
      <textarea name="description" rows="4">{itemForm.description}</textarea>
    </label>

    <label>
      {t('studio.itemsNew.photo')}
      <span class="hint">{t('studio.itemsNew.photoHint', { id: itemForm.id || 'item-id' })}</span>
      <input type="file" name="image_upload" accept="image/jpeg,image/png,image/webp" />
    </label>

    <div class="actions">
      <button type="submit">{t('studio.itemsNew.create')}</button>
      <a class="secondary-link" href="/studio/items">{t('studio.itemsNew.cancel')}</a>
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
