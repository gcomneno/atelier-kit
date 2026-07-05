<script>
  import { enhance } from '$app/forms';
  import { useI18n } from '$lib/i18n/context.js';

  const t = useI18n();

  let { data, form } = $props();

  const itemForm = $derived(form?.itemForm ?? data.itemForm);
</script>

<svelte:head>
  <title>Studio · {itemForm.title}</title>
</svelte:head>

<p class="intro">
  {t('studio.itemsEdit.intro')}
  <a href={`/items/${itemForm.id}`} target="_blank" rel="noreferrer">{t('studio.itemsEdit.preview')}</a>
</p>

<section class="panel">
  <div class="panel-heading">
    <h2>{itemForm.title}</h2>
    <p>{t('studio.itemsEdit.itemId', { id: itemForm.id })}</p>
  </div>

  <form method="POST" action="?/saveItem" enctype="multipart/form-data" use:enhance class="studio-form">
    <div class="image-preview">
      <img src={itemForm.image_file} alt={itemForm.image_alt || itemForm.title} />
    </div>

    <label>
      {t('studio.itemsEdit.uploadPhoto')}
      <span class="hint">{t('studio.itemsEdit.uploadHint', { id: itemForm.id })}</span>
      <input type="file" name="image_upload" accept="image/jpeg,image/png,image/webp" />
    </label>

    <label>
      {t('studio.itemsEdit.imagePath')}
      <input name="image_file" value={itemForm.image_file} required />
    </label>

    <label>
      {t('studio.itemsEdit.imageAlt')}
      <input name="image_alt" value={itemForm.image_alt} />
    </label>

    <label>
      {t('studio.itemsEdit.titleField')}
      <input name="title" value={itemForm.title} required />
    </label>

    <label>
      {t('studio.itemsEdit.subtitle')}
      <input name="subtitle" value={itemForm.subtitle} />
    </label>

    <label>
      {t('studio.itemsEdit.status')}
      <input name="status" value={itemForm.status} />
    </label>

    <label>
      {t('studio.itemsEdit.priceMode')}
      <input name="price_mode" value={itemForm.price_mode} />
    </label>

    <label>
      {t('studio.itemsEdit.description')}
      <textarea name="description" rows="5" required>{itemForm.description}</textarea>
    </label>

    <label>
      {t('studio.itemsEdit.notice')}
      <span class="hint">{t('studio.itemsEdit.noticeHint')}</span>
      <textarea name="notice" rows="2">{itemForm.notice}</textarea>
    </label>

    {#if itemForm.meta.length > 0}
      <fieldset>
        <legend>{t('studio.itemsEdit.details')}</legend>

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
      <button type="submit">{t('studio.itemsEdit.save')}</button>
      <a class="secondary-link" href="/studio/items">{t('studio.itemsEdit.back')}</a>
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

  .image-preview {
    overflow: hidden;
    border-radius: 0.85rem;
    border: 1px solid rgb(47 40 31 / 0.12);
    background: #fffdf9;
  }

  .image-preview img {
    display: block;
    width: 100%;
    max-height: 280px;
    object-fit: cover;
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
