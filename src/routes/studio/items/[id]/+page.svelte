<script>
  import { enhance } from '$app/forms';
  import StudioFieldLabel from '$lib/components/StudioFieldLabel.svelte';
  import StudioFormLegend from '$lib/components/StudioFormLegend.svelte';
  import StudioFormStatus from '$lib/components/StudioFormStatus.svelte';
  import StudioItemMetaFields from '$lib/components/StudioItemMetaFields.svelte';
  import { useI18n } from '$lib/i18n/context.js';
  import { studioFormDirty, studioFormEnhanceDirty } from '$lib/studio-form-dirty.js';

  /** @typedef {{ label: string, value: string }} MetaEditRow */

  const t = useI18n();

  let { data, form } = $props();

  const itemForm = $derived(form?.itemForm ?? data.itemForm);
  const metaSuggestions = $derived(form?.metaSuggestions ?? data.metaSuggestions);

  /** @type {MetaEditRow[]} */
  let metaRows = $state([]);
  let isDirty = $state(false);
  /** @type {import('$lib/studio-form-dirty.js').StudioFormDirtyControl} */
  const dirtyControl = {};

  $effect(() => {
    metaRows = itemForm.metaRows.map((/** @type {MetaEditRow} */ row) => ({ ...row }));
    dirtyControl.resetBaseline?.();
  });

  function confirmDelete() {
    return confirm(
      t('studio.itemsEdit.deleteConfirm', { title: itemForm.title, id: itemForm.id })
    );
  }
</script>

<svelte:head>
  <title>Studio · {itemForm.title}</title>
</svelte:head>

<p class="studio-intro">
  {t('studio.itemsEdit.intro')}
  <a href={`/items/${itemForm.id}`} target="_blank" rel="noreferrer">{t('studio.itemsEdit.preview')}</a>
</p>

<section class="studio-panel">
  <div class="panel-heading">
    <h2>{itemForm.title}</h2>
    <p>{t('studio.itemsEdit.itemId', { id: itemForm.id })}</p>
  </div>

  <form
    method="POST"
    action="?/saveItem"
    enctype="multipart/form-data"
    use:studioFormDirty={{ setDirty: (value) => (isDirty = value), dirtyControl }}
    use:enhance={() => studioFormEnhanceDirty(dirtyControl)}
    class="studio-form"
  >
    <StudioFormLegend />

    <div class="image-preview">
      <img src={itemForm.image_file} alt={itemForm.image_alt || itemForm.title} />
    </div>

    <label>
      <StudioFieldLabel
        label={t('studio.itemsEdit.uploadPhoto')}
        optional
        hint={t('studio.itemsEdit.uploadHint', { id: itemForm.id })}
      />
      <input type="file" name="image_upload" accept="image/jpeg,image/png,image/webp" />
    </label>

    <label>
      <StudioFieldLabel label={t('studio.itemsEdit.imagePath')} required />
      <input name="image_file" value={itemForm.image_file} required />
    </label>

    <label>
      <StudioFieldLabel label={t('studio.itemsEdit.imageAlt')} optional />
      <input name="image_alt" value={itemForm.image_alt} />
    </label>

    <label>
      <StudioFieldLabel label={t('studio.itemsEdit.titleField')} required />
      <input name="title" value={itemForm.title} required />
    </label>

    <label>
      <StudioFieldLabel label={t('studio.itemsEdit.subtitle')} optional />
      <input name="subtitle" value={itemForm.subtitle} />
    </label>

    <label>
      <StudioFieldLabel label={t('studio.itemsEdit.status')} optional />
      <input name="status" value={itemForm.status} />
    </label>

    <label>
      <StudioFieldLabel label={t('studio.itemsEdit.priceMode')} optional />
      <input name="price_mode" value={itemForm.price_mode} />
    </label>

    <label>
      <StudioFieldLabel label={t('studio.itemsEdit.description')} required />
      <textarea name="description" rows="5" required>{itemForm.description}</textarea>
    </label>

    <label>
      <StudioFieldLabel
        label={t('studio.itemsEdit.notice')}
        optional
        hint={t('studio.itemsEdit.noticeHint')}
      />
      <textarea name="notice" rows="2">{itemForm.notice}</textarea>
    </label>

    <StudioItemMetaFields
      bind:rows={metaRows}
      labels={metaSuggestions.labels}
      values={metaSuggestions.values}
      {dirtyControl}
    />

    <div class="actions">
      <button type="submit" disabled={!isDirty}>{t('studio.itemsEdit.save')}</button>
      <a class="secondary-link" href="/studio/items">{t('studio.itemsEdit.back')}</a>
    </div>

    <StudioFormStatus message={form?.itemMessage} status={form?.itemStatus} />
  </form>

  <form method="POST" action="?/deleteItem" class="danger-zone" use:enhance>
    <button
      type="submit"
      class="remove-button"
      onclick={(event) => {
        if (!confirmDelete()) {
          event.preventDefault();
        }
      }}
    >
      {t('studio.itemsEdit.delete')}
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
