<script>
  // @ts-nocheck
  import { enhance } from '$app/forms';
  import { useI18n } from '$lib/i18n/context.js';
  import { studioFormEnhance } from '$lib/studio-form-enhance.js';

  const t = useI18n();

  let { data, form } = $props();

  const siteForm = $derived(form?.siteForm ?? data.siteForm);
  const appearanceForm = $derived(form?.appearanceForm ?? data.appearanceForm);
  const heroBannerForm = $derived(form?.heroBannerForm ?? data.heroBannerForm);
  let showBanner = $state(false);
  let removeHeroImage = $state(false);
  /** @type {HTMLInputElement | null} */
  let bannerUploadInput = $state(null);

  $effect(() => {
    showBanner = heroBannerForm.show;
    removeHeroImage = false;

    if (bannerUploadInput) {
      bannerUploadInput.value = '';
    }
  });

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
    use:enhance={studioFormEnhance}
    class="studio-form"
  >
    <label class="checkbox">
      <input type="checkbox" name="show_banner" bind:checked={showBanner} />
      {t('studio.site.heroBanner.show')}
    </label>

    <label>
      {t('studio.site.heroBanner.bannerDescription')}
      <span class="hint">{t('studio.site.heroBanner.bannerDescriptionHint')}</span>
      <textarea name="banner_description" rows="3" disabled={!showBanner}
        >{heroBannerForm.description}</textarea
      >
    </label>

    {#if heroBannerForm.image_file && !removeHeroImage}
      <div class="banner-preview">
        <img src={heroBannerForm.image_file} alt={siteForm.name} />
      </div>
    {/if}

    <label>
      {t('studio.site.heroBanner.upload')}
      <span class="hint">{t('studio.site.heroBanner.uploadHint')}</span>
      <input
        bind:this={bannerUploadInput}
        type="file"
        name="banner_upload"
        accept="image/jpeg,image/png,image/webp"
        disabled={!showBanner || removeHeroImage}
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

    <label>
      {t('studio.site.heroBanner.caption')}
      <span class="hint">{t('studio.site.heroBanner.captionHint')}</span>
      <input name="banner_caption" disabled={!showBanner} value={heroBannerForm.caption} />
    </label>

    <label>
      {t('studio.site.heroBanner.href')}
      <span class="hint">{t('studio.site.heroBanner.hrefHint')}</span>
      <input name="banner_href" disabled={!showBanner} value={heroBannerForm.href} />
    </label>

    <div class="actions">
      <button type="submit">{t('studio.site.heroBanner.save')}</button>
    </div>

    {#if form?.heroBannerMessage}
      <p class={`status ${form.heroBannerStatus || 'info'}`}>{form.heroBannerMessage}</p>
    {/if}
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
