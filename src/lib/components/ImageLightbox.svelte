<script>
  import { useVisitorI18n } from '$lib/i18n/visitor-context.js';

  export let open = false;
  export let src = '';
  export let alt = '';

  const t = useVisitorI18n();

  /** @type {'cover' | 'contain' | 'natural'} */
  let fit = 'contain';

  /** @type {HTMLDialogElement | undefined} */
  let dialog;

  $: if (typeof document !== 'undefined') {
    if (open && dialog && !dialog.open) {
      fit = 'contain';
      dialog.showModal();
    } else if (!open && dialog?.open) {
      dialog.close();
    }
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
</script>

<dialog
  bind:this={dialog}
  class="lightbox"
  aria-label={t('imageLightbox.dialogLabel')}
  on:close={handleDialogClose}
  on:click={handleBackdropClick}
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

      <button type="button" class="close-button" on:click={handleClose}>
        {t('imageLightbox.close')}
      </button>
    </div>

    <div class="lightbox-stage" data-fit={fit}>
      <img class="lightbox-image" {src} {alt} />
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

  .fit-group {
    display: inline-flex;
    gap: 0.35rem;
    padding: 0.25rem;
    border-radius: 999px;
    background: rgb(255 255 255 / 0.08);
  }

  .fit-button,
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
  .close-button:focus-visible {
    outline: 3px solid rgb(255 255 255 / 0.45);
    outline-offset: 2px;
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
