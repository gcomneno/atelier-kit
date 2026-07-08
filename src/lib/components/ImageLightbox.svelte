<script>
  import { useVisitorI18n } from '$lib/i18n/visitor-context.js';

  export let open = false;
  export let src = '';
  export let alt = '';
  /** @type {Array<{ file: string, alt?: string, role?: string }>} */
  export let images = [];
  export let index = 0;

  const t = useVisitorI18n();

  /** @type {'cover' | 'contain' | 'natural'} */
  let fit = 'contain';

  /** @type {HTMLDialogElement | undefined} */
  let dialog;

  /** @type {Array<{ file: string, alt?: string, role?: string }>} */
  let galleryImages = [];

  let currentIndex = 0;

  /** @type {{ file: string, alt?: string, role?: string }} */
  let activeImage = { file: '', alt: '' };

  $: galleryImages = normalizeGalleryImages(images, src, alt);
  $: currentIndex = clampIndex(index, galleryImages.length);
  $: activeImage = galleryImages[currentIndex] ?? { file: src, alt };

  $: if (typeof document !== 'undefined') {
    if (open && dialog && !dialog.open) {
      fit = 'contain';
      dialog.showModal();
    } else if (!open && dialog?.open) {
      dialog.close();
    }
  }

  /**
   * @param {unknown[]} imageList
   * @param {string} fallbackSrc
   * @param {string} fallbackAlt
   * @returns {Array<{ file: string, alt?: string, role?: string }>}
   */
  function normalizeGalleryImages(imageList, fallbackSrc, fallbackAlt) {
    if (Array.isArray(imageList) && imageList.length > 0) {
      /** @type {Array<{ file: string, alt?: string, role?: string }>} */
      const normalized = [];

      for (const image of imageList) {
        if (!image || typeof image !== 'object' || Array.isArray(image)) {
          continue;
        }

        const record = /** @type {{ file?: unknown, alt?: unknown, role?: unknown }} */ (image);
        const file = typeof record.file === 'string' ? record.file.trim() : '';

        if (!file) {
          continue;
        }

        const imageAlt = typeof record.alt === 'string' ? record.alt : '';
        const role = typeof record.role === 'string' ? record.role.trim() : '';

        normalized.push({
          file,
          alt: imageAlt,
          ...(role ? { role } : {})
        });
      }

      if (normalized.length > 0) {
        return normalized;
      }
    }

    return fallbackSrc ? [{ file: fallbackSrc, alt: fallbackAlt }] : [];
  }

  /**
   * @param {number} value
   * @param {number} length
   */
  function clampIndex(value, length) {
    if (length <= 0) {
      return 0;
    }

    if (!Number.isInteger(value)) {
      return 0;
    }

    return Math.min(Math.max(value, 0), length - 1);
  }

  /** @param {'cover' | 'contain' | 'natural'} next */
  function setFit(next) {
    fit = next;
  }

  function handleClose() {
    open = false;
  }

  function handleDialogClose() {
    open = false;
  }

  /** @param {MouseEvent} event */
  function handleBackdropClick(event) {
    if (event.target === dialog) {
      handleClose();
    }
  }

  function showPrevious() {
    if (galleryImages.length <= 1) {
      return;
    }

    index = (currentIndex - 1 + galleryImages.length) % galleryImages.length;
  }

  function showNext() {
    if (galleryImages.length <= 1) {
      return;
    }

    index = (currentIndex + 1) % galleryImages.length;
  }

  /** @param {KeyboardEvent} event */
  function handleKeydown(event) {
    if (event.key === 'ArrowLeft') {
      event.preventDefault();
      showPrevious();
    }

    if (event.key === 'ArrowRight') {
      event.preventDefault();
      showNext();
    }
  }
</script>

<dialog
  bind:this={dialog}
  class="lightbox"
  aria-label={t('imageLightbox.dialogLabel')}
  on:close={handleDialogClose}
  on:click={handleBackdropClick}
  on:keydown={handleKeydown}
>
  <div class="lightbox-panel">
    <div class="lightbox-toolbar">
      <div class="fit-group" role="group" aria-label={t('imageLightbox.fitLegend')}>
        <button
          type="button"
          class="fit-button"
          class:active={fit === 'cover'}
          aria-pressed={fit === 'cover'}
          on:click={() => setFit('cover')}
        >
          {t('imageLightbox.fitCover')}
        </button>
        <button
          type="button"
          class="fit-button"
          class:active={fit === 'contain'}
          aria-pressed={fit === 'contain'}
          on:click={() => setFit('contain')}
        >
          {t('imageLightbox.fitContain')}
        </button>
        <button
          type="button"
          class="fit-button"
          class:active={fit === 'natural'}
          aria-pressed={fit === 'natural'}
          on:click={() => setFit('natural')}
        >
          {t('imageLightbox.fitNatural')}
        </button>
      </div>

      {#if galleryImages.length > 1}
        <div class="gallery-nav" role="group" aria-label="Image navigation">
          <button type="button" class="nav-button" on:click={showPrevious}>Previous</button>
          <span class="image-count">{currentIndex + 1} / {galleryImages.length}</span>
          <button type="button" class="nav-button" on:click={showNext}>Next</button>
        </div>
      {/if}

      <button type="button" class="close-button" on:click={handleClose}>
        {t('imageLightbox.close')}
      </button>
    </div>

    <div class="lightbox-stage" data-fit={fit}>
      <img class="lightbox-image" src={activeImage.file} alt={activeImage.alt || alt} />
    </div>
  </div>
</dialog>

<style>
  .lightbox {
    width: min(100vw, 100%);
    max-width: none;
    height: 100vh;
    max-height: none;
    margin: 0;
    padding: 0;
    border: 0;
    background: rgb(8 8 8 / 0.92);
    color: #f8f4ec;
  }

  .lightbox::backdrop {
    background: rgb(8 8 8 / 0.92);
  }

  .lightbox-panel {
    display: grid;
    grid-template-rows: auto minmax(0, 1fr);
    gap: 1rem;
    width: min(1120px, calc(100vw - 2rem));
    height: calc(100vh - 2rem);
    margin: 1rem auto;
  }

  .lightbox-toolbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
    flex-wrap: wrap;
  }

  .fit-group,
  .gallery-nav {
    display: inline-flex;
    align-items: center;
    gap: 0.35rem;
    padding: 0.25rem;
    border-radius: 999px;
    background: rgb(255 255 255 / 0.08);
  }

  .fit-button,
  .nav-button,
  .close-button {
    border: 0;
    border-radius: 999px;
    padding: 0.55rem 0.9rem;
    background: transparent;
    color: inherit;
    font: inherit;
    font-size: 0.92rem;
    cursor: pointer;
  }

  .fit-button.active {
    background: rgb(255 255 255 / 0.16);
    font-weight: 700;
  }

  .fit-button:focus-visible,
  .nav-button:focus-visible,
  .close-button:focus-visible {
    outline: 3px solid rgb(255 255 255 / 0.45);
    outline-offset: 2px;
  }

  .image-count {
    min-width: 3.5rem;
    text-align: center;
    font-size: 0.9rem;
    opacity: 0.82;
  }

  .close-button {
    background: rgb(255 255 255 / 0.12);
    font-weight: 700;
  }

  .lightbox-stage {
    display: grid;
    place-items: center;
    min-height: 0;
    overflow: auto;
  }

  .lightbox-image {
    display: block;
    max-width: 100%;
    max-height: 100%;
  }

  .lightbox-stage[data-fit='cover'] .lightbox-image {
    width: 100%;
    height: min(78vh, 100%);
    object-fit: cover;
  }

  .lightbox-stage[data-fit='contain'] .lightbox-image {
    width: auto;
    height: auto;
    max-width: 100%;
    max-height: min(78vh, 100%);
    object-fit: contain;
  }

  .lightbox-stage[data-fit='natural'] .lightbox-image {
    width: auto;
    height: auto;
    max-width: none;
    max-height: none;
    object-fit: none;
    transform-origin: center;
    transform: scale(1);
  }

  @media (max-width: 640px) {
    .lightbox-stage[data-fit='natural'] .lightbox-image {
      max-width: 100%;
      max-height: min(72vh, 100%);
      object-fit: contain;
    }
  }
</style>
