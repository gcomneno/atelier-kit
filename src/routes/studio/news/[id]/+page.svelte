<script>
  import MarkedTextField from '$lib/components/MarkedTextField.svelte';
  import { enhance } from '$app/forms';
  import StudioFieldLabel from '$lib/components/StudioFieldLabel.svelte';
  import StudioFormLegend from '$lib/components/StudioFormLegend.svelte';
  import StudioFormStatus from '$lib/components/AtelierFormStatus.svelte';
  import { useI18n } from '$lib/i18n/context.js';
  import { studioFormDirty, studioFormEnhanceDirty } from '$lib/studio-form-dirty.js';

  const t = useI18n();

  let { data, form } = $props();

  const newsForm = $derived(form?.newsForm ?? data.newsForm);
  let isDirty = $state(false);
  /** @type {import('$lib/studio-form-dirty.js').StudioFormDirtyControl} */
  const dirtyControl = {};

  $effect(() => {
    newsForm;
    dirtyControl.resetBaseline?.();
  });
  function confirmDelete() {
    return confirm(
      t('studio.newsEdit.deleteConfirm', { title: newsForm.title, id: newsForm.id })
    );
  }
</script>

<svelte:head>
  <title>Studio · {newsForm.title}</title>
</svelte:head>

<p class="studio-intro">
  {t('studio.newsEdit.intro')}
  <a href={`/news/${newsForm.id}`} target="_blank" rel="noreferrer">{t('studio.newsEdit.preview')}</a>
</p>

<section class="studio-panel">
  <div class="panel-heading">
    <h2>{newsForm.title}</h2>
    <p>{t('studio.newsEdit.postId', { id: newsForm.id })}</p>
  </div>

  <form
    method="POST"
    action="?/saveNews"
    enctype="multipart/form-data"
    use:studioFormDirty={{ setDirty: (value) => (isDirty = value), dirtyControl }}
    use:enhance={() => studioFormEnhanceDirty(dirtyControl)}
    class="studio-form"
  >
    <StudioFormLegend />

    {#if newsForm.image_file}
      <div class="image-preview">
        <img src={newsForm.image_file} alt={newsForm.image_alt || newsForm.title} />
      </div>
    {/if}

    <label>
      <StudioFieldLabel
        label={t('studio.newsEdit.uploadPhoto')}
        optional
        hint={t('studio.newsEdit.uploadHint', { id: newsForm.id })}
      />
      <input type="file" name="image_upload" accept="image/jpeg,image/png,image/webp" />
    </label>

    <label>
      <StudioFieldLabel label={t('studio.newsEdit.imagePath')} optional />
      <input name="image_file" value={newsForm.image_file} />
    </label>

    <label>
      <StudioFieldLabel label={t('studio.newsEdit.imageAlt')} optional />
      <input name="image_alt" value={newsForm.image_alt} />
    </label>

    <label>
      <StudioFieldLabel label={t('studio.newsEdit.titleField')} required />
      <MarkedTextField name="title" value={newsForm.title} />
    </label>

    <label>
      <StudioFieldLabel label={t('studio.newsEdit.date')} required />
      <input name="date" type="date" value={newsForm.date} required />
    </label>

    <label>
      <StudioFieldLabel label={t('studio.newsEdit.excerpt')} optional hint={t('studio.newsEdit.excerptHint')} />
      <MarkedTextField name="excerpt" value={newsForm.excerpt} multiline rows={2} />
    </label>

    <label>
      <StudioFieldLabel label={t('studio.newsEdit.body')} required />
      <MarkedTextField name="body" value={newsForm.body} multiline rows={10} />
    </label>

    <div class="actions">
      <button type="submit" disabled={!isDirty}>{t('studio.newsEdit.save')}</button>
      <a class="secondary-link" href="/studio/news">{t('studio.newsEdit.back')}</a>
    </div>

    <StudioFormStatus message={form?.newsMessage} status={form?.newsStatus} />
  </form>

  <form method="POST" action="?/deleteNews" class="danger-zone" use:enhance>
    <button
      type="submit"
      class="remove-button"
      onclick={(event) => {
        if (!confirmDelete()) {
          event.preventDefault();
        }
      }}
    >
      {t('studio.newsEdit.delete')}
    </button>
  </form>
</section>

<style>
  .image-preview {
    overflow: hidden;
    border-radius: 0.85rem;
    border: 1px solid var(--studio-border);
    background: #fff;
  }

  .image-preview img {
    display: block;
    width: 100%;
    max-height: 280px;
    object-fit: cover;
  }

  .actions {
    display: flex;
    gap: 1rem;
    align-items: center;
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

  .remove-button {
    border: 1px solid rgb(132 46 46 / 0.35);
    border-radius: 999px;
    padding: 0.45rem 0.9rem;
    background: rgb(132 46 46 / 0.08);
    color: #6d2a2a;
    font: inherit;
    cursor: pointer;
  }
</style>
