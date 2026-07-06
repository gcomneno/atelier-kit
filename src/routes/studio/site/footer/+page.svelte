<script>
  import { enhance } from '$app/forms';
  import { useI18n } from '$lib/i18n/context.js';
  import { studioFormEnhance } from '$lib/studio-form-enhance.js';

  const t = useI18n();

  let { data, form } = $props();

  const footerForm = $derived(form?.footerForm ?? data.footerForm);
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

  <form method="POST" action="?/saveFooter" use:enhance={studioFormEnhance}>
    <label>
      {t('studio.site.footer.copyright')}
      <input name="copyright" value={footerForm.copyright} />
    </label>

    <label>
      {t('studio.site.footer.legalLine')}
      <input name="legal_line" value={footerForm.legal_line} />
    </label>

    <label class="checkbox">
      <input type="checkbox" name="show_social" checked={footerForm.show_social} />
      {t('studio.site.footer.showSocial')}
    </label>

    {#each footerForm.columns as column, columnIndex}
      <fieldset>
        <legend>{t('studio.site.footer.columnLegend', { number: columnIndex + 1 })}</legend>

        <label>
          {t('studio.site.footer.columnTitle')}
          <span class="hint">{t('studio.site.footer.columnTitleHint')}</span>
          <input name={`column_${columnIndex}_title`} value={column.title} />
        </label>

        {#each column.links as link, linkIndex}
          <div class="link-fields">
            <label>
              {t('studio.site.footer.linkLabel', { number: linkIndex + 1 })}
              <input
                name={`column_${columnIndex}_link_${linkIndex}_label`}
                value={link.label}
              />
            </label>

            <label>
              {t('studio.site.footer.linkHref')}
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
      <button type="submit">{t('studio.site.footer.save')}</button>
    </div>

    {#if form?.footerMessage}
      <p class={`status ${form.footerStatus || 'info'}`}>{form.footerMessage}</p>
    {/if}
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
