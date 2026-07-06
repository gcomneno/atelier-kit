<script>
  import { enhance } from '$app/forms';
  import { useI18n } from '$lib/i18n/context.js';
  import { studioFormEnhance } from '$lib/studio-form-enhance.js';
  import { APPEARANCE_PRESETS, isAppearancePreset } from '$lib/site-appearance.js';

  const t = useI18n();

  let { data, form } = $props();

  const appearanceForm = $derived(form?.appearanceForm ?? data.appearanceForm);
  const appearancePresets = $derived(data.appearancePresets);
  let presetDraft = $state('warm');
  let baseColor = $state('#000000');
  let accentColor = $state('#000000');
  let textColor = $state('#000000');
  let removeBackground = $state(false);
  let hasNewBackground = $state(false);
  /** @type {HTMLInputElement | null} */
  let backgroundUploadInput = $state(null);

  $effect(() => {
    const next = appearanceForm;
    presetDraft = next.preset;
    baseColor = next.base_color;
    accentColor = next.accent_color;
    textColor = next.text_color;
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

  const showCustomColors = $derived(presetDraft === 'custom');
  const previewColors = $derived(
    presetDraft === 'custom'
      ? { base_color: baseColor, accent_color: accentColor, text_color: textColor }
      : isAppearancePreset(presetDraft) && presetDraft !== 'custom'
        ? APPEARANCE_PRESETS[presetDraft]
        : appearanceForm
  );
  const isDirty = $derived(
    hasNewBackground ||
      removeBackground ||
      presetDraft !== appearanceForm.preset ||
      baseColor !== appearanceForm.base_color ||
      accentColor !== appearanceForm.accent_color ||
      textColor !== appearanceForm.text_color
  );

  /** @param {Event & { currentTarget: HTMLInputElement }} event */
  function onBackgroundSelected(event) {
    hasNewBackground = Boolean(event.currentTarget.files?.length);
  }
</script>

<svelte:head>
  <title>{t('studio.site.pageTitle')}</title>
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
    <label>
      {t('studio.site.appearance.preset')}
      <select name="preset" bind:value={presetDraft}>
        {#each appearancePresets as preset}
          <option value={preset.id}>{preset.label}</option>
        {/each}
      </select>
    </label>

    {#if showCustomColors}
      <div class="color-fields">
        <label>
          {t('studio.site.appearance.baseColor')}
          <input name="base_color" type="color" bind:value={baseColor} />
        </label>

        <label>
          {t('studio.site.appearance.accentColor')}
          <input name="accent_color" type="color" bind:value={accentColor} />
        </label>

        <label>
          {t('studio.site.appearance.textColor')}
          <input name="text_color" type="color" bind:value={textColor} />
        </label>
      </div>
    {:else}
      <input type="hidden" name="base_color" value={baseColor} />
      <input type="hidden" name="accent_color" value={accentColor} />
      <input type="hidden" name="text_color" value={textColor} />
    {/if}

    <div
      class="appearance-preview"
      style={`--preview-base: ${previewColors.base_color}; --preview-accent: ${previewColors.accent_color}; --preview-text: ${previewColors.text_color}`}
      aria-hidden="true"
    >
      <span>{t('studio.site.appearance.preview')}</span>
    </div>

    <label>
      {t('studio.site.appearance.backgroundImage')}
      <span class="hint">{t('studio.site.appearance.backgroundHint')}</span>
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

    {#if form?.appearanceMessage}
      <p class={`status ${form.appearanceStatus || 'info'}`}>{form.appearanceMessage}</p>
    {/if}
  </form>
</section>

<style>
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
    display: grid;
    place-items: center;
    min-height: 4.5rem;
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

  :global(.studio-panel input[type='color']) {
    width: 100%;
    height: 2.75rem;
    padding: 0.2rem;
    cursor: pointer;
  }
</style>
