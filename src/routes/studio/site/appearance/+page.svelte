<script>
  import { enhance } from '$app/forms';
  import { untrack } from 'svelte';
  import StudioFieldLabel from '$lib/components/StudioFieldLabel.svelte';
  import StudioFormLegend from '$lib/components/StudioFormLegend.svelte';
  import StudioFormStatus from '$lib/components/StudioFormStatus.svelte';
  import { useI18n } from '$lib/i18n/context.js';
  import { studioFormEnhance } from '$lib/studio-form-enhance.js';
  import { APPEARANCE_PRESETS, isAppearancePreset } from '$lib/site-appearance.js';
  import { fontFamilyCss, fontStylesheetHref } from '$lib/site-typography.js';

  const t = useI18n();

  let { data, form } = $props();

  const appearanceForm = $derived(form?.appearanceForm ?? data.appearanceForm);
  const appearancePresets = $derived(data.appearancePresets);
  const fontPresets = $derived(data.fontPresets);
  const initialAppearance = untrack(() => data.appearanceForm);
  let presetDraft = $state(initialAppearance.preset);
  let fontPresetDraft = $state(initialAppearance.font_preset);
  let baseColor = $state(initialAppearance.base_color);
  let accentColor = $state(initialAppearance.accent_color);
  let textColor = $state(initialAppearance.text_color);
  let headingColor = $state(initialAppearance.heading_color);
  let headerTitleColor = $state(initialAppearance.header_title_color);
  let introTitleColor = $state(initialAppearance.intro_title_color);
  let cardColor = $state(initialAppearance.card_color);
  let backgroundFitDraft = $state(initialAppearance.background_fit ?? 'top');
  let removeBackground = $state(false);
  let hasNewBackground = $state(false);
  /** @type {HTMLInputElement | null} */
  let backgroundUploadInput = $state(null);

  $effect(() => {
    const next = appearanceForm;
    presetDraft = next.preset;
    fontPresetDraft = next.font_preset;
    baseColor = next.base_color;
    accentColor = next.accent_color;
    textColor = next.text_color;
    headingColor = next.heading_color;
    headerTitleColor = next.header_title_color;
    introTitleColor = next.intro_title_color;
    cardColor = next.card_color;
    backgroundFitDraft = next.background_fit ?? 'top';
    removeBackground = false;
    hasNewBackground = false;

    if (backgroundUploadInput) {
      backgroundUploadInput.value = '';
    }
  });

  $effect(() => {
    if (removeBackground && backgroundUploadInput) {
      backgroundUploadInput.value = '';
      hasNewBackground = false;
    }
  });

  const previewColors = $derived({
    base_color: baseColor,
    accent_color: accentColor,
    text_color: textColor,
    heading_color: headingColor,
    card_color: cardColor
  });
  const previewFontFamily = $derived(fontFamilyCss(fontPresetDraft));
  const previewFontHref = $derived(fontStylesheetHref(fontPresetDraft));
  const isDirty = $derived(
    hasNewBackground ||
      removeBackground ||
      presetDraft !== appearanceForm.preset ||
      fontPresetDraft !== appearanceForm.font_preset ||
      backgroundFitDraft !== (appearanceForm.background_fit ?? 'top') ||
      baseColor !== appearanceForm.base_color ||
      accentColor !== appearanceForm.accent_color ||
      textColor !== appearanceForm.text_color ||
      headingColor !== appearanceForm.heading_color ||
      headerTitleColor !== appearanceForm.header_title_color ||
      introTitleColor !== appearanceForm.intro_title_color ||
      cardColor !== appearanceForm.card_color
  );

  /** @param {Event & { currentTarget: HTMLSelectElement }} event */
  function onPresetChange(event) {
    const value = event.currentTarget.value;

    if (isAppearancePreset(value) && value !== 'custom') {
      const preset = APPEARANCE_PRESETS[value];
      baseColor = preset.base_color;
      accentColor = preset.accent_color;
      textColor = preset.text_color;
      headingColor = preset.heading_color;
      headerTitleColor = preset.header_title_color;
      introTitleColor = preset.intro_title_color;
      cardColor = preset.card_color;
    }
  }

  /** @param {Event & { currentTarget: HTMLInputElement }} event */
  function onBackgroundSelected(event) {
    hasNewBackground = Boolean(event.currentTarget.files?.length);
  }
</script>

<svelte:head>
  <title>{t('studio.site.pageTitle')}</title>
  {#if previewFontHref}
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="anonymous" />
    <link rel="stylesheet" href={previewFontHref} />
  {/if}
</svelte:head>

<p class="studio-intro">{t('studio.site.intro')}</p>

<section class="studio-panel" aria-labelledby="appearance-settings-title">
  <div class="panel-heading">
    <h2 id="appearance-settings-title">{t('studio.site.appearance.title')}</h2>
    <p>{t('studio.site.appearance.intro')}</p>
  </div>

  <form
    method="POST"
    action="?/saveAppearance"
    enctype="multipart/form-data"
    use:enhance={studioFormEnhance}
    class="appearance-form"
  >
    <StudioFormLegend />

    <label>
      <StudioFieldLabel label={t('studio.site.appearance.preset')} required />
      <select name="preset" bind:value={presetDraft} onchange={onPresetChange}>
        {#each appearancePresets as preset}
          <option value={preset.id}>{preset.label}</option>
        {/each}
      </select>
    </label>

    <label>
      <StudioFieldLabel
        label={t('studio.site.appearance.fontPreset')}
        required
        hint={t('studio.site.appearance.fontPresetHint')}
      />
      <select name="font_preset" bind:value={fontPresetDraft}>
        {#each fontPresets as fontPreset}
          <option value={fontPreset.id}>{fontPreset.label}</option>
        {/each}
      </select>
    </label>

    <div
      class="font-preview"
      style={`font-family: ${previewFontFamily}; color: ${previewColors.text_color}; --preview-heading: ${previewColors.heading_color};`}
      aria-hidden="true"
    >
      <p class="font-preview-title">{t('studio.site.appearance.fontPreviewTitle')}</p>
      <p class="font-preview-body">{t('studio.site.appearance.fontPreviewBody')}</p>
    </div>

    <div class="color-fields">
      <label>
        <StudioFieldLabel
          label={t('studio.site.appearance.baseColor')}
          required
          hint={t('studio.site.appearance.baseColorHint')}
        />
        <input name="base_color" type="color" bind:value={baseColor} />
      </label>

      <label>
        <StudioFieldLabel
          label={t('studio.site.appearance.accentColor')}
          required
          hint={t('studio.site.appearance.accentColorHint')}
        />
        <input name="accent_color" type="color" bind:value={accentColor} />
      </label>

      <label>
        <StudioFieldLabel
          label={t('studio.site.appearance.textColor')}
          required
          hint={t('studio.site.appearance.textColorHint')}
        />
        <input name="text_color" type="color" bind:value={textColor} />
      </label>

      <label>
        <StudioFieldLabel
          label={t('studio.site.appearance.headingColor')}
          required
          hint={t('studio.site.appearance.headingColorHint')}
        />
        <input name="heading_color" type="color" bind:value={headingColor} />
      </label>

      <label>
        <StudioFieldLabel
          label={t('studio.site.appearance.headerTitleColor')}
          required
          hint={t('studio.site.appearance.headerTitleColorHint')}
        />
        <input name="header_title_color" type="color" bind:value={headerTitleColor} />
      </label>

      <label>
        <StudioFieldLabel
          label={t('studio.site.appearance.introTitleColor')}
          required
          hint={t('studio.site.appearance.introTitleColorHint')}
        />
        <input name="intro_title_color" type="color" bind:value={introTitleColor} />
      </label>

      <label>
        <StudioFieldLabel
          label={t('studio.site.appearance.cardColor')}
          required
          hint={t('studio.site.appearance.cardColorHint')}
        />
        <input name="card_color" type="color" bind:value={cardColor} />
      </label>
    </div>

    <div
      class="appearance-preview"
      style={`--preview-base: ${previewColors.base_color}; --preview-accent: ${previewColors.accent_color}; --preview-text: ${previewColors.text_color}; --preview-heading: ${previewColors.heading_color}; --preview-card: ${previewColors.card_color}`}
      aria-hidden="true"
    >
      <span class="preview-heading">{t('studio.site.appearance.previewHeading')}</span>
      <span class="preview-card">{t('studio.site.appearance.previewCard')}</span>
      <span>{t('studio.site.appearance.preview')}</span>
    </div>

    <label>
      <StudioFieldLabel
        label={t('studio.site.appearance.backgroundImage')}
        optional
        hint={t('studio.site.appearance.backgroundHint')}
      />
      {#if appearanceForm.background_image}
        <span class="hint current-background">
          {t('studio.site.appearance.currentBackground', { path: appearanceForm.background_image })}
        </span>
      {/if}
      <input
        bind:this={backgroundUploadInput}
        type="file"
        name="background_upload"
        accept="image/jpeg,image/png,image/webp"
        disabled={removeBackground}
        onchange={onBackgroundSelected}
      />
    </label>

    <label>
      <StudioFieldLabel
        label={t('studio.site.appearance.backgroundFit')}
        optional
        hint={t('studio.site.appearance.backgroundFitHint')}
      />
      <select name="background_fit" bind:value={backgroundFitDraft}>
        <option value="top">{t('studio.site.appearance.backgroundFitTop')}</option>
        <option value="center">{t('studio.site.appearance.backgroundFitCenter')}</option>
        <option value="contain">{t('studio.site.appearance.backgroundFitContain')}</option>
      </select>
    </label>

    {#if appearanceForm.background_image}
      <p class="hint background-vs-banner">{t('studio.site.appearance.backgroundVsBanner')}</p>
      <label class="checkbox">
        <input type="checkbox" name="remove_background" bind:checked={removeBackground} />
        {t('studio.site.appearance.removeBackground')}
      </label>
    {/if}

    <div class="actions">
      <button type="submit" disabled={!isDirty}>{t('studio.site.appearance.save')}</button>
    </div>

    <StudioFormStatus message={form?.appearanceMessage} status={form?.appearanceStatus} />
  </form>
</section>

<style>
  .font-preview {
    display: grid;
    gap: 0.35rem;
    padding: 0.85rem 1rem;
    border: 1px solid var(--studio-border);
    border-radius: 0.85rem;
    background: var(--studio-surface);
  }

  .font-preview-title {
    margin: 0;
    color: var(--preview-heading, inherit);
    font-size: 1.15rem;
    font-weight: 700;
    line-height: 1.25;
  }

  .font-preview-body {
    margin: 0;
    font-size: 0.9375rem;
    font-weight: 400;
    line-height: 1.5;
    opacity: 0.82;
  }

  .color-fields {
    display: grid;
    gap: 1rem;
    grid-template-columns: repeat(auto-fit, minmax(10rem, 1fr));
  }

  .current-background {
    display: block;
  }

  .background-vs-banner {
    margin-top: 0;
  }

  .appearance-preview {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: center;
    gap: 0.75rem;
    min-height: 4.5rem;
    padding: 0.85rem;
    border-radius: 0.85rem;
    border: 1px solid var(--studio-border);
    color: var(--preview-text);
    background:
      radial-gradient(
        circle at top left,
        color-mix(in srgb, var(--preview-accent) 35%, transparent),
        transparent 12rem
      ),
      var(--preview-base);
  }

  .appearance-preview span {
    padding: 0.35rem 0.75rem;
    border-radius: 999px;
    background: color-mix(in srgb, var(--preview-base) 72%, white);
    font-size: 0.85rem;
    font-weight: 600;
  }

  .preview-heading {
    color: var(--preview-heading) !important;
    font-size: 0.95rem;
    font-weight: 700;
  }

  .preview-card {
    background: var(--preview-card) !important;
    border: 1px solid color-mix(in srgb, var(--preview-text) 14%, transparent);
    box-shadow: 0 12px 32px rgb(0 0 0 / 0.12);
  }

  :global(.studio-panel input[type='color']) {
    width: 100%;
    height: 2.75rem;
    padding: 0.2rem;
    cursor: pointer;
  }
</style>
