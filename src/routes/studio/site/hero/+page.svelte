<script>
  import {
    Button,
    FormActions,
    ImageFocalPointControl,
    PageIntro,
    Panel
  } from 'giadaware-ui-components/studio';
  import 'giadaware-ui-components/studio/styles.css';
  import MarkedTextField from '$lib/components/MarkedTextField.svelte';
  // @ts-nocheck
  import { enhance } from '$app/forms';
  import { flushSync, onDestroy } from 'svelte';
  import StudioFieldLabel from '$lib/components/StudioFieldLabel.svelte';
  import StudioFormLegend from '$lib/components/StudioFormLegend.svelte';
  import StudioFormStatus from '$lib/components/AtelierFormStatus.svelte';
  import StudioImageMutationFields from '$lib/components/StudioImageMutationFields.svelte';
  import { useI18n } from '$lib/i18n/context.js';
  import { studioFormDirty, studioFormEnhanceDirty } from '$lib/studio-form-dirty.js';
  import { createHeroBannerRemoval } from '$lib/studio-image-mutation.js';
  import {
    getImageFocalPointObjectPosition,
    parseImageFocalPoint
  } from '$lib/image-focal-point.js';

  const t = useI18n();

  let { data, form } = $props();

  const siteForm = $derived(data.siteForm);
  const appearanceForm = $derived(data.appearanceForm);
  const heroBannerForm = $derived(form?.heroBannerForm ?? data.heroBannerForm);
  const hostedHero = $derived(form?.hostedHero ?? data.hostedHero);
  let showBanner = $state(false);
  let removeHeroImage = $state(false);
  let bannerFocalPoint = $state({ x: 0.5, y: 0.5 });
  let bannerFocalPointEnabled = $state(false);
  let uploadPreviewUrl = $state('');
  let ownedPreviewUrl = '';
  const heroRemoval = createHeroBannerRemoval();
  let isDirty = $state(false);
  let isSaving = $state(false);
  /** @type {import('$lib/studio-form-dirty.js').StudioFormDirtyControl} */
  const dirtyControl = {};
  const imageMutationMessages = {
    add: t('studio.imageMutation.add'),
    replace: t('studio.imageMutation.replace'),
    remove: t('studio.imageMutation.remove')
  };

  function releaseUploadPreview() {
    if (ownedPreviewUrl && typeof URL !== 'undefined') {
      URL.revokeObjectURL(ownedPreviewUrl);
    }

    ownedPreviewUrl = '';
    uploadPreviewUrl = '';
  }

  /** @param {File | null | undefined} file */
  function setUploadPreview(file) {
    releaseUploadPreview();

    if (
      file &&
      file.size > 0 &&
      typeof URL !== 'undefined'
    ) {
      ownedPreviewUrl = URL.createObjectURL(file);
      uploadPreviewUrl = ownedPreviewUrl;
    }
  }

  /** @param {{ x: number, y: number }} value */
  function setBannerFocalPoint(value) {
    bannerFocalPoint = value;
    bannerFocalPointEnabled = true;
    flushSync();
    dirtyControl.checkDirty?.();
  }

  function resetBannerFocalPoint() {
    bannerFocalPoint = { x: 0.5, y: 0.5 };
    bannerFocalPointEnabled = false;
    flushSync();
    dirtyControl.checkDirty?.();
  }

  function bannerObjectPosition() {
    return getImageFocalPointObjectPosition(
      bannerFocalPointEnabled
        ? bannerFocalPoint
        : null
    );
  }

  $effect(() => {
    ({ show: showBanner, remove: removeHeroImage } = heroRemoval.reset(heroBannerForm.show));

    const persistedFocalPoint =
      parseImageFocalPoint(
        heroBannerForm.focal_point
      );

    bannerFocalPoint =
      persistedFocalPoint ??
      { x: 0.5, y: 0.5 };

    bannerFocalPointEnabled =
      Boolean(persistedFocalPoint);

    releaseUploadPreview();
    dirtyControl.resetBaseline?.();
  });

  onDestroy(() => {
    releaseUploadPreview();
  });

  const hasStoredImage = $derived(Boolean(heroBannerForm.image_file) && !removeHeroImage);
  const bannerFieldsEnabled = $derived(showBanner);
  const uploadRequired = $derived(showBanner && !hasStoredImage);
  const bannerPreviewSource = $derived(
    removeHeroImage
      ? ''
      : uploadPreviewUrl || heroBannerForm.image_file
  );

  function enhanceHeroBanner() {
    const completeDirty = studioFormEnhanceDirty(dirtyControl);

    return async (/** @type {{ update: Function }} */ input) => {
      try {
        await completeDirty(input);
      } finally {
        isSaving = false;
      }
    };
  }

  /** @param {SubmitEvent} event */
  function submitHeroBanner(event) {
    if (isSaving) {
      event.preventDefault();
      return;
    }

    isSaving = true;
    flushSync();
  }
</script>

<svelte:head>
  <title>{t('studio.site.pageTitle')}</title>
</svelte:head>

<PageIntro>
  {t(hostedHero ? 'studio.hosted.intro' : 'studio.site.intro')}
</PageIntro>

<Panel title={t('studio.site.heroBanner.title')} id="hero-banner-settings" class="atelier-studio-panel">

  <div class="panel-summary">
    <p>{t('studio.site.heroBanner.intro')}</p>
    {#if appearanceForm.background_image}
      <p class="hint">{t('studio.site.heroBanner.backgroundImageActive')}</p>
    {/if}
  </div>

  {#if hostedHero}
    <div class="hosted-authoring-state" data-testid="hosted-authoring-state">
      <strong>{t('studio.hosted.authoringState.title')}</strong>
      <p>{t('studio.hosted.authoringState.revision', { revision: hostedHero.authoringRevision })}</p>
      <p>{t('studio.hosted.authoringState.deploymentManual')}</p>
    </div>
  {/if}

  <form
    method="POST"
    action="?/saveHeroBanner"
    enctype="multipart/form-data"
    use:studioFormDirty={{ setDirty: (value) => (isDirty = value), dirtyControl }}
    use:enhance={enhanceHeroBanner}
    onsubmit={submitHeroBanner}
    class="studio-form"
  >
    {#if hostedHero}
      <input
        type="hidden"
        name="hosted_csrf_token"
        value={hostedHero.csrfToken}
      />
      <input
        type="hidden"
        name="authoring_revision"
        value={hostedHero.authoringRevision}
      />
    {/if}

    <StudioFormLegend />

    <label class="checkbox">
      <input type="checkbox" name="show_banner" bind:checked={showBanner} disabled={removeHeroImage} />
      {t('studio.site.heroBanner.show')}
    </label>

    {#if bannerPreviewSource}
      <div class="banner-preview">
        <img
          src={bannerPreviewSource}
          alt={siteForm.name}
          style:object-position={bannerObjectPosition()}
        />
      </div>
    {/if}

    <StudioImageMutationFields
      uploadName="banner_upload"
      removeName="remove_hero_image"
      uploadLabel={t('studio.site.heroBanner.upload')}
      uploadHint={t('studio.site.heroBanner.uploadHint')}
      removeLabel={t('studio.site.heroBanner.removeHeroImage')}
      hasExisting={Boolean(heroBannerForm.image_file)}
      disabled={!bannerFieldsEnabled && !removeHeroImage}
      required={uploadRequired}
      resetKey={heroBannerForm}
      stateMessages={imageMutationMessages}
      onmutation={(mutation) => {
        ({ show: showBanner, remove: removeHeroImage } = heroRemoval.update(mutation.remove, showBanner));

        if (mutation.remove) {
          releaseUploadPreview();
        } else {
          setUploadPreview(mutation.file);
        }
      }}
    />

    <input
      type="hidden"
      name="banner_image_file"
      value={removeHeroImage ? '' : heroBannerForm.image_file}
    />

    {#if bannerFocalPointEnabled && bannerFocalPoint}
      <input type="hidden" name="banner_focal_point_enabled" value="on" />
      <input type="hidden" name="banner_focal_point_x" value={bannerFocalPoint.x} />
      <input type="hidden" name="banner_focal_point_y" value={bannerFocalPoint.y} />
    {/if}

    {#if bannerFieldsEnabled && bannerPreviewSource}
      <div class="focal-point-editor">
        <ImageFocalPointControl
          image={{ src: bannerPreviewSource, alt: siteForm.name }}
          value={bannerFocalPoint}
          onvaluechange={setBannerFocalPoint}
          label={t('studio.site.heroBanner.focalPoint')}
          disabled={!bannerFieldsEnabled}
        />

        <Button
          type="button"
          onclick={resetBannerFocalPoint}
          disabled={!bannerFocalPointEnabled}
        >
          {t('studio.site.heroBanner.resetFocalPoint')}
        </Button>
      </div>
    {/if}

    <fieldset disabled={!bannerFieldsEnabled}>
      <label>
        <StudioFieldLabel
          label={t('studio.site.heroBanner.bannerDescription')}
          optional
          hint={t('studio.site.heroBanner.bannerDescriptionHint')}
        />
        <MarkedTextField name="banner_description" value={heroBannerForm.description} multiline rows={3} />
      </label>

      <label>
        <StudioFieldLabel
          label={t('studio.site.heroBanner.caption')}
          optional
          hint={t('studio.site.heroBanner.captionHint')}
        />
        <MarkedTextField name="banner_caption" value={heroBannerForm.caption} />
      </label>

      <label>
        <StudioFieldLabel
          label={t('studio.site.heroBanner.href')}
          optional
          hint={t('studio.site.heroBanner.hrefHint')}
        />
        <input name="banner_href" value={heroBannerForm.href} />
      </label>
    </fieldset>

    <FormActions>
      <Button type="submit" disabled={!isDirty || isSaving}>
        {isSaving ? t('studio.site.heroBanner.saving') : t('studio.site.heroBanner.save')}
      </Button>
    </FormActions>

    <StudioFormStatus message={form?.heroBannerMessage} status={form?.heroBannerStatus} />
  </form>
</Panel>

<style>
  .hosted-authoring-state {
    display: grid;
    gap: 0.35rem;
    padding: 0.85rem 1rem;
    border: 1px solid var(--studio-border);
    border-radius: 0.75rem;
    background: rgb(45 108 223 / 0.06);
  }

  .hosted-authoring-state strong,
  .hosted-authoring-state p {
    margin: 0;
  }

  .hosted-authoring-state p {
    color: var(--studio-muted);
    line-height: 1.5;
    overflow-wrap: anywhere;
  }

  .banner-preview {
    overflow: hidden;
    aspect-ratio: 21 / 8;
    max-height: 8rem;
    border-radius: 0.75rem;
    border: 1px solid var(--studio-border);
    background: #fff;
  }

  .banner-preview img {
    display: block;
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .focal-point-editor {
    display: grid;
    gap: 0.75rem;
    justify-items: start;
  }

</style>
