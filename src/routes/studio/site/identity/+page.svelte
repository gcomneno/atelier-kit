<script>
  import { enhance } from '$app/forms';
  import StudioFieldLabel from '$lib/components/StudioFieldLabel.svelte';
  import StudioFormLegend from '$lib/components/StudioFormLegend.svelte';
  import StudioFormStatus from '$lib/components/StudioFormStatus.svelte';
  import { useI18n } from '$lib/i18n/context.js';
  import { studioFormDirty } from '$lib/studio-form-dirty.js';
  import { studioFormEnhanceDirty } from '$lib/studio-form-dirty.js';

  const t = useI18n();

  let { data, form } = $props();

  const siteForm = $derived(form?.siteForm ?? data.siteForm);
  let isDirty = $state(false);
  /** @type {import('$lib/studio-form-dirty.js').StudioFormDirtyControl} */
  const dirtyControl = {};

  $effect(() => {
    siteForm;
    dirtyControl.resetBaseline?.();
  });
</script>

<svelte:head>
  <title>{t('studio.site.pageTitle')}</title>
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
    use:studioFormDirty={{ setDirty: (value) => (isDirty = value), dirtyControl }}
    use:enhance={() => studioFormEnhanceDirty(dirtyControl)}
  >
    <StudioFormLegend />

    <label>
      <StudioFieldLabel label={t('studio.site.identity.siteTitle')} required />
      <input name="name" value={siteForm.name} required />
    </label>

    <label>
      <StudioFieldLabel label={t('studio.site.identity.tagline')} required />
      <input name="tagline" value={siteForm.tagline} required />
    </label>

    <label>
      <StudioFieldLabel
        label={t('studio.site.identity.heroIntro')}
        optional
        hint={t('studio.site.identity.heroIntroHint')}
      />
      <textarea name="hero_intro" rows="12">{siteForm.hero_intro}</textarea>
    </label>

    <label>
      <StudioFieldLabel
        label={t('studio.site.identity.heroSignature')}
        optional
        hint={t('studio.site.identity.heroSignatureHint')}
      />
      <textarea name="hero_signature" rows="3">{siteForm.hero_signature}</textarea>
    </label>

    <label>
      <StudioFieldLabel
        label={t('studio.site.identity.footerNote')}
        optional
        hint={t('studio.site.identity.footerNoteHint')}
      />
      <input name="footer_note" value={siteForm.footer_note} />
    </label>

    <div class="actions">
      <button type="submit" disabled={!isDirty}>{t('studio.site.identity.save')}</button>
    </div>

    <StudioFormStatus message={form?.siteMessage} status={form?.siteStatus} />
  </form>
</section>
