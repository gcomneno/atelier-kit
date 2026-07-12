<script>
  import { enhance } from '$app/forms';
  import StudioFieldLabel from '$lib/components/StudioFieldLabel.svelte';
  import StudioFormLegend from '$lib/components/StudioFormLegend.svelte';
  import StudioFormStatus from '$lib/components/StudioFormStatus.svelte';
  import EditorialField from '$lib/components/EditorialField.svelte';
  import EditorialText from '$lib/components/EditorialText.svelte';
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
    enctype="multipart/form-data"
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
        <div class="portrait-preview">
          <div class="preview-image">
            <img
              src={aboutForm.portrait_image_file}
              alt={aboutForm.portrait_image_alt || aboutForm.title}
            />
          </div>
          {#if aboutForm.portrait_caption.trim()}
            <EditorialText value={aboutForm.portrait_caption} tag="p" class="preview-caption" />
          {/if}
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

      <label>
        <StudioFieldLabel
          label={t('studio.about.portraitCaption')}
          optional
          hint={t('studio.about.portraitCaptionHint')}
        />
        <EditorialField name="portrait_caption" value={aboutForm.portrait_caption} />
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
  .portrait-preview {
    width: min(100%, 10rem);
  }

  .preview-image {
    aspect-ratio: 1;
    overflow: hidden;
    border-radius: 0.75rem;
    border: 1px solid var(--studio-border);
    background: #fff;
  }

  .preview-image img {
    display: block;
    width: 100%;
    height: 100%;
    object-fit: cover;
    object-position: center top;
  }

  :global(.preview-caption) {
    margin: 0.45rem 0 0;
    color: var(--studio-muted, #596579);
    font-size: 0.82rem;
    line-height: 1.4;
  }
</style>
