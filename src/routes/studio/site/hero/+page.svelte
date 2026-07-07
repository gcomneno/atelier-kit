<script>
  // @ts-nocheck
  import { enhance } from '$app/forms';
  import StudioFieldLabel from '$lib/components/StudioFieldLabel.svelte';
  import StudioFormLegend from '$lib/components/StudioFormLegend.svelte';
  import StudioFormStatus from '$lib/components/StudioFormStatus.svelte';
  import { useI18n } from '$lib/i18n/context.js';
  import { studioFormDirty, studioFormEnhanceDirty } from '$lib/studio-form-dirty.js';

  const t = useI18n();

  let { data, form } = $props();

  const siteForm = $derived(form?.siteForm ?? data.siteForm);
  const appearanceForm = $derived(form?.appearanceForm ?? data.appearanceForm);
  const heroBannerForm = $derived(form?.heroBannerForm ?? data.heroBannerForm);
  let showBanner = $state(false);
  let removeHeroImage = $state(false);
  let isDirty = $state(false);
  const dirtyControl = {};
  /** @type {HTMLInputElement | null} */
  let bannerUploadInput = $state(null);

  $effect(() => {
    showBanner = heroBannerForm.show;
    removeHeroImage = false;

    if (bannerUploadInput) {
      bannerUploadInput.value = '';
    }

    dirtyControl.resetBaseline?.();
  });

  const hasStoredImage = $derived(Boolean(heroBannerForm.image_file) && !removeHeroImage);
  const bannerFieldsEnabled = $derived(showBanner);
  const uploadRequired = $derived(showBanner && !hasStoredImage);
</script>

<svelte:head>
  <title>{t('studio.site.pageTitle')}</title>
</svelte:head>

<p class="studio-intro">{t('studio.site.intro')}</p>

<section class="studio-panel" aria-labelledby="hero-banner-settings-title">
  <div class="panel-heading">
    <h2 id="hero-banner-settings-title">{t('studio.site.heroBanner.title')}</h2>
    <p>{t('studio.site.heroBanner.intro')}</p>
    {#if appearanceForm.background_image}
      <p class="hint">{t('studio.site.heroBanner.backgroundImageActive')}</p>
    {/if}
  </div>

  <form
    method="POST"
    action="?/saveHeroBanner"
    enctype="multipart/form-data"
    use:studioFormDirty={{ setDirty: (value) => (isDirty = value), dirtyControl }}
    use:enhance={() => studioFormEnhanceDirty(dirtyControl)}
    class="studio-form"
  >
    <StudioFormLegend />

    <label class="checkbox">
      <input type="checkbox" name="show_banner" bind:checked={showBanner} />
      {t('studio.site.heroBanner.show')}
    </label>

    {#if hasStoredImage}
      <div class="banner-preview">
        <img src={heroBannerForm.image_file} alt={siteForm.name} />
      </div>
    {/if}

    <label>
      <StudioFieldLabel
        label={t('studio.site.heroBanner.upload')}
        required={bannerFieldsEnabled}
        hint={t('studio.site.heroBanner.uploadHint')}
      />
      <input
        bind:this={bannerUploadInput}
        type="file"
        name="banner_upload"
        accept="image/jpeg,image/png,image/webp"
        disabled={!bannerFieldsEnabled}
        required={uploadRequired}
      />
    </label>

    {#if heroBannerForm.image_file}
      <label class="checkbox">
        <input type="checkbox" name="remove_hero_image" bind:checked={removeHeroImage} />
        {t('studio.site.heroBanner.removeHeroImage')}
      </label>
    {/if}

    <input
      type="hidden"
      name="banner_image_file"
      value={removeHeroImage ? '' : heroBannerForm.image_file}
    />

    <fieldset disabled={!bannerFieldsEnabled}>
      <label>
        <StudioFieldLabel
          label={t('studio.site.heroBanner.bannerDescription')}
          optional
          hint={t('studio.site.heroBanner.bannerDescriptionHint')}
        />
        <textarea name="banner_description" rows="3">{heroBannerForm.description}</textarea>
      </label>

      <label>
        <StudioFieldLabel
          label={t('studio.site.heroBanner.caption')}
          optional
          hint={t('studio.site.heroBanner.captionHint')}
        />
        <input name="banner_caption" value={heroBannerForm.caption} />
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

    <div class="actions">
      <button type="submit" disabled={!isDirty}>{t('studio.site.heroBanner.save')}</button>
    </div>

    <StudioFormStatus message={form?.heroBannerMessage} status={form?.heroBannerStatus} />
  </form>
</section>

<style>
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
    object-position: center;
  }
</style>
