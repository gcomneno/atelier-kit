<script>
  import MarkedTextField from '$lib/components/MarkedTextField.svelte';
  import { enhance } from '$app/forms';
  import StudioFieldLabel from '$lib/components/StudioFieldLabel.svelte';
  import StudioFormLegend from '$lib/components/StudioFormLegend.svelte';
  import StudioFormStatus from '$lib/components/StudioFormStatus.svelte';
  import StudioItemGalleryFields from '$lib/components/StudioItemGalleryFields.svelte';
  import StudioItemMetaFields from '$lib/components/StudioItemMetaFields.svelte';
  import { useI18n } from '$lib/i18n/context.js';
  import { studioFormDirty, studioFormEnhanceDirty } from '$lib/studio-form-dirty.js';

  /** @typedef {{ label: string, value: string }} MetaEditRow */
  /** @typedef {{ file: string, alt: string, role: string }} GalleryEditRow */

  const t = useI18n();

  let { data, form } = $props();

  const itemForm = $derived(form?.itemForm ?? data.itemForm);
  const metaSuggestions = $derived(form?.metaSuggestions ?? data.metaSuggestions);

  /** @type {GalleryEditRow[]} */
  let galleryRows = $state([]);
  /** @type {MetaEditRow[]} */
  let metaRows = $state([]);
  let isDirty = $state(false);
  /** @type {import('$lib/studio-form-dirty.js').StudioFormDirtyControl} */
  const dirtyControl = {};

  const previewImage = $derived(getPreviewImage(galleryRows, itemForm.title));

  $effect(() => {
    galleryRows = itemForm.galleryRows.map((/** @type {GalleryEditRow} */ row) => ({ ...row }));
    metaRows = itemForm.metaRows.map((/** @type {MetaEditRow} */ row) => ({ ...row }));
    dirtyControl.resetBaseline?.();
  });

  /**
   * @param {GalleryEditRow[]} rows
   * @param {string} fallbackAlt
   */
  function getPreviewImage(rows, fallbackAlt) {
    const cover = rows.find((row) => row.role.trim() === 'cover' && row.file.trim() !== '');
    const first = rows.find((row) => row.file.trim() !== '');
    const image = cover ?? first;

    return {
      file: image?.file.trim() || '/images/items/placeholder.svg',
      alt: image?.alt.trim() || fallbackAlt
    };
  }

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
      <img src={previewImage.file} alt={previewImage.alt} />
    </div>

    <label>
      <StudioFieldLabel
        label={t('studio.itemsEdit.uploadPhoto')}
        optional
        hint={t('studio.itemsEdit.uploadHint', { id: itemForm.id })}
      />
      <input type="file" name="image_upload" accept="image/jpeg,image/png,image/webp" />
    </label>

    <StudioItemGalleryFields bind:rows={galleryRows} {dirtyControl} />

    <div class="gallery-upload">
      <label>
        <StudioFieldLabel
          label={t('studio.itemsEdit.galleryUpload')}
          optional
          hint={t('studio.itemsEdit.galleryUploadHint')}
        />
        <input type="file" name="gallery_upload" accept="image/jpeg,image/png,image/webp" />
      </label>

      <div class="gallery-upload-meta">
        <label>
          <StudioFieldLabel label={t('studio.itemsEdit.galleryAlt')} optional />
          <input name="gallery_upload_alt" />
        </label>

        <label>
          <StudioFieldLabel label={t('studio.itemsEdit.galleryRole')} optional />
          <input name="gallery_upload_role" />
        </label>
      </div>
    </div>

    <label>
      <StudioFieldLabel label={t('studio.itemsEdit.titleField')} required />
      <MarkedTextField name="title" value={itemForm.title} />
    </label>

    <label>
      <StudioFieldLabel label={t('studio.itemsEdit.subtitle')} optional />
      <MarkedTextField name="subtitle" value={itemForm.subtitle} />
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
      <MarkedTextField name="description" value={itemForm.description} multiline rows={5} />
    </label>

    <label>
      <StudioFieldLabel
        label={t('studio.itemsEdit.notice')}
        optional
        hint={t('studio.itemsEdit.noticeHint')}
      />
      <MarkedTextField name="notice" value={itemForm.notice} multiline rows={2} />
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

  .gallery-upload,
  .gallery-upload-meta {
    display: grid;
    gap: 0.85rem;
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
