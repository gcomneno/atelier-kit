<script>
  import { enhance } from '$app/forms';
  import StudioFieldLabel from '$lib/components/StudioFieldLabel.svelte';
  import StudioFormLegend from '$lib/components/StudioFormLegend.svelte';
  import StudioFormStatus from '$lib/components/StudioFormStatus.svelte';
  import { MAX_CATALOG_HOME_LIMIT } from '$lib/layout-presets.js';
  import { useI18n } from '$lib/i18n/context.js';
  import { studioFormDirty, studioFormEnhanceDirty } from '$lib/studio-form-dirty.js';

  const t = useI18n();

  let { data, form } = $props();

  const catalogForm = $derived(form?.catalogForm ?? data.catalogForm);
  let isDirty = $state(false);
  /** @type {import('$lib/studio-form-dirty.js').StudioFormDirtyControl} */
  const dirtyControl = {};

  $effect(() => {
    catalogForm;
    dirtyControl.resetBaseline?.();
  });
</script>

<svelte:head>
  <title>{t('studio.catalog.pageTitle')}</title>
</svelte:head>

<p class="studio-intro">
  {t('studio.catalog.intro')}
</p>

<section class="studio-panel">
  <form
    method="POST"
    action="?/saveCatalog"
    use:studioFormDirty={{ setDirty: (value) => (isDirty = value), dirtyControl }}
    use:enhance={() => studioFormEnhanceDirty(dirtyControl)}
    class="studio-form"
  >
    <StudioFormLegend />

    <fieldset>
      <legend>{t('studio.catalog.presentationLegend')}</legend>

      <label>
        <StudioFieldLabel
          label={t('studio.catalog.eyebrow')}
          optional
          hint={t('studio.catalog.eyebrowHint')}
        />
        <input name="eyebrow" value={catalogForm.eyebrow} />
      </label>

      <label>
        <StudioFieldLabel
          label={t('studio.catalog.introField')}
          optional
          hint={t('studio.catalog.introHint')}
        />
        <textarea name="intro" rows="4">{catalogForm.intro}</textarea>
      </label>
    </fieldset>

    <fieldset>
      <legend>{t('studio.catalog.listingLegend')}</legend>

      <label>
        <StudioFieldLabel label={t('studio.catalog.sort')} />
        <select name="sort" value={catalogForm.sort}>
          <option value="manual">{t('studio.catalog.sortManual')}</option>
          <option value="title_asc">{t('studio.catalog.sortTitleAsc')}</option>
          <option value="title_desc">{t('studio.catalog.sortTitleDesc')}</option>
        </select>
      </label>

      <label>
        <StudioFieldLabel
          label={t('studio.catalog.homeLimit')}
          optional
          hint={t('studio.catalog.homeLimitHint', { max: MAX_CATALOG_HOME_LIMIT })}
        />
        <input
          type="number"
          name="home_limit"
          min="0"
          max={MAX_CATALOG_HOME_LIMIT}
          step="1"
          value={catalogForm.home_limit}
        />
      </label>
    </fieldset>

    <div class="actions">
      <button type="submit" disabled={!isDirty}>{t('studio.catalog.save')}</button>
    </div>

    <StudioFormStatus message={form?.catalogMessage} status={form?.catalogStatus} />
  </form>
</section>
