<script>
  import { enhance } from '$app/forms';
  import StudioFieldLabel from '$lib/components/StudioFieldLabel.svelte';
  import StudioFormLegend from '$lib/components/StudioFormLegend.svelte';
  import StudioFormStatus from '$lib/components/StudioFormStatus.svelte';
  import { useI18n } from '$lib/i18n/context.js';
  import { studioFormDirty, studioFormEnhanceDirty } from '$lib/studio-form-dirty.js';

  const t = useI18n();

  let { data, form } = $props();

  const aboutForm = $derived(form?.aboutForm ?? data.aboutForm);
  let showPortrait = $state(false);
  let isDirty = $state(false);
  /** @type {import('$lib/studio-form-dirty.js').StudioFormDirtyControl} */
  const dirtyControl = {};

  $effect(() => {
    showPortrait = aboutForm.show_portrait;
    dirtyControl.resetBaseline?.();
  });
</script>

<svelte:head>
  <title>{t('studio.about.pageTitle')}</title>
</svelte:head>

<p class="studio-intro">
  {t('studio.about.intro')}
</p>

<section class="studio-panel">
  <form
    method="POST"
    action="?/saveAbout"
    use:studioFormDirty={{ setDirty: (value) => (isDirty = value), dirtyControl }}
    use:enhance={() => studioFormEnhanceDirty(dirtyControl)}
    class="studio-form"
  >
    <StudioFormLegend />

    <label>
      <StudioFieldLabel label={t('studio.about.titleField')} required />
      <input name="title" value={aboutForm.title} required />
    </label>

    <label>
      <StudioFieldLabel label={t('studio.about.introField')} optional />
      <textarea name="intro" rows="5">{aboutForm.intro}</textarea>
    </label>

    <fieldset>
      <legend>{t('studio.about.portraitLegend')}</legend>

      <label class="checkbox">
        <input type="checkbox" name="show_portrait" bind:checked={showPortrait} />
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
        <StudioFieldLabel
          label={t('studio.about.portraitUpload')}
          optional
          hint={t('studio.about.portraitUploadHint')}
        />
        <input
          type="file"
          name="portrait_upload"
          accept="image/jpeg,image/png,image/webp"
          disabled={!showPortrait}
        />
      </label>

      <input type="hidden" name="portrait_image_file" value={aboutForm.portrait_image_file} />

      <label>
        <StudioFieldLabel label={t('studio.about.portraitAlt')} optional />
        <input name="portrait_image_alt" disabled={!showPortrait} value={aboutForm.portrait_image_alt} />
      </label>
    </fieldset>

    <fieldset>
      <legend>{t('studio.about.sectionLegend')}</legend>

      <label>
        <StudioFieldLabel label={t('studio.about.sectionHeading')} optional />
        <input name="section_heading" value={aboutForm.section_heading} />
      </label>

      <label>
        <StudioFieldLabel label={t('studio.about.sectionBody')} optional />
        <textarea name="section_body" rows="5">{aboutForm.section_body}</textarea>
      </label>
    </fieldset>

    <div class="actions">
      <button type="submit" disabled={!isDirty}>{t('studio.about.save')}</button>
    </div>

    <StudioFormStatus message={form?.aboutMessage} status={form?.aboutStatus} />
  </form>
</section>

<style>
  .preview {
    width: min(100%, 10rem);
    aspect-ratio: 1;
    overflow: hidden;
    border-radius: 0.75rem;
    border: 1px solid var(--studio-border);
    background: #fff;
  }

  .preview img {
    display: block;
    width: 100%;
    height: 100%;
    object-fit: cover;
    object-position: center top;
  }
</style>
