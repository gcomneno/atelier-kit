<script>
  import { enhance } from '$app/forms';
  import { useI18n } from '$lib/i18n/context.js';

  const t = useI18n();

  let { data, form } = $props();

  const newsForm = $derived(form?.newsForm ?? data.newsForm);
</script>

<svelte:head>
  <title>Studio · {newsForm.title}</title>
</svelte:head>

<p class="intro">
  {t('studio.newsEdit.intro')}
  <a href={`/news/${newsForm.id}`} target="_blank" rel="noreferrer">{t('studio.newsEdit.preview')}</a>
</p>

<section class="panel">
  <div class="panel-heading">
    <h2>{newsForm.title}</h2>
    <p>{t('studio.newsEdit.postId', { id: newsForm.id })}</p>
  </div>

  <form method="POST" action="?/saveNews" enctype="multipart/form-data" use:enhance class="studio-form">
    {#if newsForm.image_file}
      <div class="image-preview">
        <img src={newsForm.image_file} alt={newsForm.image_alt || newsForm.title} />
      </div>
    {/if}

    <label>
      {t('studio.newsEdit.uploadPhoto')}
      <span class="hint">{t('studio.newsEdit.uploadHint', { id: newsForm.id })}</span>
      <input type="file" name="image_upload" accept="image/jpeg,image/png,image/webp" />
    </label>

    <label>
      {t('studio.newsEdit.imagePath')}
      <input name="image_file" value={newsForm.image_file} />
    </label>

    <label>
      {t('studio.newsEdit.imageAlt')}
      <input name="image_alt" value={newsForm.image_alt} />
    </label>

    <label>
      {t('studio.newsEdit.titleField')}
      <input name="title" value={newsForm.title} required />
    </label>

    <label>
      {t('studio.newsEdit.date')}
      <input name="date" type="date" value={newsForm.date} required />
    </label>

    <label>
      {t('studio.newsEdit.excerpt')}
      <span class="hint">{t('studio.newsEdit.excerptHint')}</span>
      <textarea name="excerpt" rows="2">{newsForm.excerpt}</textarea>
    </label>

    <label>
      {t('studio.newsEdit.body')}
      <textarea name="body" rows="10" required>{newsForm.body}</textarea>
    </label>

    <div class="actions">
      <button type="submit">{t('studio.newsEdit.save')}</button>
      <a class="secondary-link" href="/studio/news">{t('studio.newsEdit.back')}</a>
    </div>

    {#if form?.newsMessage}
      <p class={`status ${form.newsStatus || 'info'}`}>{form.newsMessage}</p>
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
