<script>
  import { enhance } from '$app/forms';
  import { untrack } from 'svelte';
  import MarkedTextField from '$lib/components/MarkedTextField.svelte';
  import StudioFieldLabel from '$lib/components/StudioFieldLabel.svelte';
  import StudioFormLegend from '$lib/components/StudioFormLegend.svelte';
  import StudioFormStatus from '$lib/components/AtelierFormStatus.svelte';
  import StudioImageMutationFields from '$lib/components/StudioImageMutationFields.svelte';
  import { useI18n } from '$lib/i18n/context.js';
  import { editorialFontPresets } from '$lib/editorial-markup.js';
  import { fontStylesheetHrefs } from '$lib/site-typography.js';
  import { studioFormDirty } from '$lib/studio-form-dirty.js';
  import { studioFormEnhanceDirty } from '$lib/studio-form-dirty.js';

  const t = useI18n();

  let { data, form } = $props();

  const siteForm = $derived(form?.siteForm ?? data.siteForm);
  let isDirty = $state(false);
  let removeHeaderLogo = $state(false);
  let removeFavicon = $state(false);
  /** @type {import('$lib/studio-form-dirty.js').StudioFormDirtyControl} */
  const dirtyControl = {};
  let editorialDrafts = $state(
    untrack(() => ({
      intro_title: siteForm.intro_title,
      tagline: siteForm.tagline,
      hero_intro: siteForm.hero_intro
    }))
  );

  const previewFontHrefs = $derived(
    fontStylesheetHrefs(
      editorialFontPresets(
        editorialDrafts.intro_title,
        editorialDrafts.tagline,
        editorialDrafts.hero_intro
      )
    )
  );
  const imageMutationMessages = {
    add: t('studio.imageMutation.add'),
    replace: t('studio.imageMutation.replace'),
    remove: t('studio.imageMutation.remove')
  };

  /** @param {string} name @param {string} value */
  function updateEditorialDraft(name, value) {
    if (name === 'intro_title' || name === 'tagline' || name === 'hero_intro') {
      editorialDrafts[name] = value;
    }
  }

  $effect(() => {
    siteForm;
    editorialDrafts = {
      intro_title: siteForm.intro_title,
      tagline: siteForm.tagline,
      hero_intro: siteForm.hero_intro
    };
    removeHeaderLogo = false;
    removeFavicon = false;
    dirtyControl.resetBaseline?.();
  });
</script>

<svelte:head>
  <title>{t('studio.site.pageTitle')}</title>
  {#each previewFontHrefs as href (href)}
    <link rel="stylesheet" {href} />
  {/each}
</svelte:head>

<p class="studio-intro">{t('studio.site.intro')}</p>

<section class="studio-panel" aria-labelledby="site-settings-title">
  <div class="panel-heading">
    <h2 id="site-settings-title">{t('studio.site.identity.title')}</h2>
    <p>{t('studio.site.identity.intro')}</p>
  </div>

  <form
    method="POST"
    action="?/saveSite"
    enctype="multipart/form-data"
    use:studioFormDirty={{ setDirty: (value) => (isDirty = value), dirtyControl }}
    use:enhance={() => studioFormEnhanceDirty(dirtyControl)}
  >
    <StudioFormLegend />

    <label>
      <StudioFieldLabel
        label={t('studio.site.identity.headerTitle')}
        optional
        hint={t('studio.site.identity.headerTitleHint')}
      />
      <MarkedTextField name="header_title" value={siteForm.header_title} />
    </label>

    <label>
      <StudioFieldLabel
        label={t('studio.site.identity.introTitle')}
        optional
        hint={t('studio.site.identity.introTitleHint')}
      />
      <MarkedTextField name="intro_title" value={siteForm.intro_title} onvaluechange={updateEditorialDraft} />
    </label>

    <div>
      {#if siteForm.header_logo}
        <span class="hint current-logo">
          {t('studio.site.identity.currentHeaderLogo', { path: siteForm.header_logo })}
        </span>
        <img class="logo-preview" src={siteForm.header_logo} alt={siteForm.header_logo_alt || siteForm.header_title || siteForm.name} />
      {/if}
      <input type="hidden" name="header_logo" value={removeHeaderLogo ? '' : siteForm.header_logo} />
    </div>

    <StudioImageMutationFields
      uploadName="header_logo_upload"
      removeName="remove_header_logo"
      uploadLabel={t('studio.site.identity.headerLogo')}
      uploadHint={t('studio.site.identity.headerLogoHint')}
      removeLabel={t('studio.site.identity.removeHeaderLogo')}
      hasExisting={Boolean(siteForm.header_logo)}
      resetKey={siteForm}
      stateMessages={imageMutationMessages}
      onmutation={(mutation) => (removeHeaderLogo = mutation.remove)}
    />

    {#if siteForm.header_logo}
      <label>
        <StudioFieldLabel label={t('studio.site.identity.headerLogoAlt')} optional />
        <input name="header_logo_alt" value={siteForm.header_logo_alt} disabled={removeHeaderLogo} />
      </label>
    {/if}

    <div>
      {#if siteForm.favicon}
        <span class="hint current-logo">
          {t('studio.site.identity.currentFavicon', { path: siteForm.favicon })}
        </span>
        <img class="favicon-preview" src={siteForm.favicon} alt="" aria-hidden="true" />
      {/if}
      <input type="hidden" name="favicon" value={removeFavicon ? '' : siteForm.favicon} />
    </div>

    <StudioImageMutationFields
      uploadName="favicon_upload"
      removeName="remove_favicon"
      uploadLabel={t('studio.site.identity.favicon')}
      uploadHint={t('studio.site.identity.faviconHint')}
      removeLabel={t('studio.site.identity.removeFavicon')}
      hasExisting={Boolean(siteForm.favicon)}
      resetKey={siteForm}
      stateMessages={imageMutationMessages}
      onmutation={(mutation) => (removeFavicon = mutation.remove)}
    />

    <label>
      <StudioFieldLabel
        label={t('studio.site.identity.tagline')}
        optional
        hint={t('studio.site.identity.taglineHint')}
      />
      <MarkedTextField
        name="tagline"
        value={siteForm.tagline}
        onvaluechange={updateEditorialDraft}
      />
    </label>

    <label>
      <StudioFieldLabel
        label={t('studio.site.identity.heroIntro')}
        optional
        hint={t('studio.site.identity.heroIntroHint')}
      />
      <MarkedTextField name="hero_intro" value={siteForm.hero_intro} multiline rows={12} onvaluechange={updateEditorialDraft} />
    </label>

    <label>
      <StudioFieldLabel
        label={t('studio.site.identity.heroSignature')}
        optional
        hint={t('studio.site.identity.heroSignatureHint')}
      />
      <MarkedTextField
        name="hero_signature"
        value={siteForm.hero_signature}
        multiline
        rows={3}
        onvaluechange={updateEditorialDraft}
      />
    </label>

    <label>
      <StudioFieldLabel
        label={t('studio.site.identity.footerNote')}
        optional
        hint={t('studio.site.identity.footerNoteHint')}
      />
      <MarkedTextField name="footer_note" value={siteForm.footer_note} />
    </label>

    <div class="actions">
      <button type="submit" disabled={!isDirty}>{t('studio.site.identity.save')}</button>
    </div>

    <StudioFormStatus message={form?.siteMessage} status={form?.siteStatus} />
  </form>
</section>

<style>
  .current-logo {
    display: block;
    margin-bottom: 0.5rem;
  }

  .logo-preview {
    display: block;
    max-width: min(16rem, 100%);
    max-height: 4rem;
    margin: 0 0 0.75rem;
    object-fit: contain;
  }

  .favicon-preview {
    display: block;
    width: 2.5rem;
    height: 2.5rem;
    margin: 0 0 0.75rem;
    object-fit: contain;
  }
</style>
