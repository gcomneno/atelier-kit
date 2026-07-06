<script>
  import { enhance } from '$app/forms';
  import { useI18n } from '$lib/i18n/context.js';

  const t = useI18n();

  let { data, form } = $props();

  const aboutForm = $derived(form?.aboutForm ?? data.aboutForm);
  let aboutEnabled = $state(false);
  let showPortrait = $state(false);

  $effect(() => {
    aboutEnabled = aboutForm.enabled;
    showPortrait = aboutForm.show_portrait;
  });

  const portraitFieldsEnabled = $derived(aboutEnabled && showPortrait);
</script>

<svelte:head>
  <title>{t('studio.about.pageTitle')}</title>
</svelte:head>

<p class="intro">
  {t('studio.about.intro')}
</p>

<section class="panel">
  <form method="POST" action="?/saveAbout" use:enhance class="studio-form">
    <label class="checkbox">
      <input type="checkbox" name="enabled" bind:checked={aboutEnabled} />
      {t('studio.about.enabled')}
    </label>

    <label>
      {t('studio.about.titleField')}
      <input name="title" disabled={!aboutEnabled} value={aboutForm.title} />
    </label>

    <label>
      {t('studio.about.introField')}
      <textarea name="intro" rows="5" disabled={!aboutEnabled}>{aboutForm.intro}</textarea>
    </label>

    <fieldset disabled={!aboutEnabled}>
      <legend>{t('studio.about.portraitLegend')}</legend>

      <label class="checkbox">
        <input type="checkbox" name="show_portrait" bind:checked={showPortrait} disabled={!aboutEnabled} />
        {t('studio.about.showPortrait')}
      </label>

      {#if aboutForm.portrait_image_file}
        <div class="preview">
          <img
            src={aboutForm.portrait_image_file}
            alt={aboutForm.portrait_image_alt || aboutForm.title}
          />
        </div>
      {/if}

      <label>
        {t('studio.about.portraitUpload')}
        <span class="hint">{t('studio.about.portraitUploadHint')}</span>
        <input
          type="file"
          name="portrait_upload"
          accept="image/jpeg,image/png,image/webp"
          disabled={!portraitFieldsEnabled}
        />
      </label>

      <input type="hidden" name="portrait_image_file" value={aboutForm.portrait_image_file} />

      <label>
        {t('studio.about.portraitAlt')}
        <input
          name="portrait_image_alt"
          disabled={!portraitFieldsEnabled}
          value={aboutForm.portrait_image_alt}
        />
      </label>
    </fieldset>

    <fieldset disabled={!aboutEnabled}>
      <legend>{t('studio.about.sectionLegend')}</legend>

      <label>
        {t('studio.about.sectionHeading')}
        <input name="section_heading" value={aboutForm.section_heading} />
      </label>

      <label>
        {t('studio.about.sectionBody')}
        <textarea name="section_body" rows="5">{aboutForm.section_body}</textarea>
      </label>
    </fieldset>

    <div class="actions">
      <button type="submit">{t('studio.about.save')}</button>
    </div>

    {#if form?.aboutMessage}
      <p class={`status ${form.aboutStatus || 'info'}`}>{form.aboutMessage}</p>
    {/if}
  </form>
</section>

<style>
  .intro {
    margin: 0 0 1.5rem;
    color: #5a4632;
    line-height: 1.6;
  }

  .panel {
    padding: 1.5rem;
    border: 1px solid rgb(47 40 31 / 0.12);
    border-radius: 1rem;
    background: rgb(255 250 242 / 0.82);
  }

  .studio-form {
    display: grid;
    gap: 1rem;
  }

  fieldset {
    margin: 0;
    padding: 0;
    border: 0;
    display: grid;
    gap: 1rem;
  }

  legend {
    margin-bottom: 0.25rem;
    font-weight: 600;
  }

  label {
    display: grid;
    gap: 0.4rem;
    font-size: 0.95rem;
  }

  .checkbox {
    grid-template-columns: auto 1fr;
    align-items: center;
    gap: 0.65rem;
  }

  input,
  textarea {
    width: 100%;
    padding: 0.7rem 0.8rem;
    border: 1px solid rgb(47 40 31 / 0.18);
    border-radius: 0.65rem;
    background: #fffdf9;
    color: inherit;
    font: inherit;
  }

  input:disabled:not([type='checkbox']),
  textarea:disabled,
  fieldset:disabled .checkbox input[type='checkbox'] {
    background: #eef1f4;
    color: #6b7280;
    cursor: not-allowed;
  }

  fieldset:disabled label:not(.checkbox) {
    opacity: 0.72;
  }

  textarea {
    resize: vertical;
  }

  .preview {
    width: min(100%, 10rem);
    aspect-ratio: 1;
    overflow: hidden;
    border-radius: 0.75rem;
    border: 1px solid rgb(47 40 31 / 0.12);
    background: #fffdf9;
  }

  .preview img {
    display: block;
    width: 100%;
    height: 100%;
    object-fit: cover;
    object-position: center top;
  }

  .hint {
    color: #7b6a58;
    font-size: 0.85rem;
    line-height: 1.45;
  }

  button {
    border: 0;
    border-radius: 999px;
    padding: 0.75rem 1.2rem;
    background: #2f281f;
    color: #f8f0e4;
    font: inherit;
    cursor: pointer;
  }

  .status {
    margin: 0;
    padding: 0.85rem 1rem;
    border-radius: 0.75rem;
    white-space: pre-wrap;
    line-height: 1.5;
  }

  .status.success {
    background: rgb(56 102 65 / 0.12);
    color: #2f4f35;
  }

  .status.warning {
    background: rgb(158 106 33 / 0.14);
    color: #6a4a1b;
  }

  .status.error {
    background: rgb(132 46 46 / 0.12);
    color: #6d2a2a;
  }
</style>
