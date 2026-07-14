<script>
  import MarkedTextField from '$lib/components/MarkedTextField.svelte';
  import { enhance } from '$app/forms';
  import StudioFieldLabel from '$lib/components/StudioFieldLabel.svelte';
  import StudioFormLegend from '$lib/components/StudioFormLegend.svelte';
  import StudioFormStatus from '$lib/components/AtelierFormStatus.svelte';
  import { useI18n } from '$lib/i18n/context.js';
  import { studioFormDirty, studioFormEnhanceDirty } from '$lib/studio-form-dirty.js';

  const t = useI18n();

  let { data, form } = $props();

  const footerForm = $derived(form?.footerForm ?? data.footerForm);
  let isDirty = $state(false);
  /** @type {import('$lib/studio-form-dirty.js').StudioFormDirtyControl} */
  const dirtyControl = {};

  $effect(() => {
    footerForm;
    dirtyControl.resetBaseline?.();
  });
</script>

<svelte:head>
  <title>{t('studio.site.pageTitle')}</title>
</svelte:head>

<p class="studio-intro">{t('studio.site.intro')}</p>

<section class="studio-panel" aria-labelledby="footer-settings-title">
  <div class="panel-heading">
    <h2 id="footer-settings-title">{t('studio.site.footer.title')}</h2>
    <p>{t('studio.site.footer.intro')}</p>
  </div>

  <form
    method="POST"
    action="?/saveFooter"
    use:studioFormDirty={{ setDirty: (value) => (isDirty = value), dirtyControl }}
    use:enhance={() => studioFormEnhanceDirty(dirtyControl)}
  >
    <StudioFormLegend />

    <label>
      <StudioFieldLabel label={t('studio.site.footer.copyright')} optional />
      <MarkedTextField name="copyright" value={footerForm.copyright} />
    </label>

    <label>
      <StudioFieldLabel label={t('studio.site.footer.legalLine')} optional />
      <MarkedTextField name="legal_line" value={footerForm.legal_line} />
    </label>

    <label class="checkbox">
      <input type="checkbox" name="show_social" checked={footerForm.show_social} />
      {t('studio.site.footer.showSocial')}
    </label>
    <p class="hint">{t('studio.site.footer.showSocialHint')}</p>

    {#each footerForm.columns as column, columnIndex}
      <fieldset>
        <legend>{t('studio.site.footer.columnLegend', { number: columnIndex + 1 })}</legend>

        <label>
          <StudioFieldLabel
            label={t('studio.site.footer.columnTitle')}
            optional
            hint={t('studio.site.footer.columnTitleHint')}
          />
          <MarkedTextField name={`column_${columnIndex}_title`} value={column.title} />
        </label>

        {#each column.links as link, linkIndex}
          <div class="link-fields">
            <label>
              <StudioFieldLabel
                label={t('studio.site.footer.linkLabel', { number: linkIndex + 1 })}
                optional
              />
              <MarkedTextField
                name={`column_${columnIndex}_link_${linkIndex}_label`}
                value={link.label}
              />
            </label>

            <label>
              <StudioFieldLabel label={t('studio.site.footer.linkHref')} optional />
              <input
                name={`column_${columnIndex}_link_${linkIndex}_href`}
                value={link.href}
              />
            </label>
          </div>
        {/each}
      </fieldset>
    {/each}

    <div class="actions">
      <button type="submit" disabled={!isDirty}>{t('studio.site.footer.save')}</button>
    </div>

    <StudioFormStatus message={form?.footerMessage} status={form?.footerStatus} />
  </form>
</section>

<style>
  .link-fields {
    display: grid;
    gap: 1rem;
    grid-template-columns: repeat(auto-fit, minmax(12rem, 1fr));
    padding: 0.75rem 0 0.25rem;
    border-top: 1px solid var(--studio-border);
  }
</style>
