<script>
  import { enhance } from '$app/forms';
  import { useI18n } from '$lib/i18n/context.js';

  const t = useI18n();

  let { data, form } = $props();

  const catalogForm = $derived(form?.catalogForm ?? data.catalogForm);
</script>

<svelte:head>
  <title>{t('studio.catalog.pageTitle')}</title>
</svelte:head>

<p class="intro">
  {t('studio.catalog.intro')}
</p>

<section class="panel">
  <form method="POST" action="?/saveCatalog" use:enhance class="studio-form">
    <label>
      {t('studio.catalog.singular')}
      <input name="item_name_singular" value={catalogForm.item_name_singular} required />
    </label>

    <label>
      {t('studio.catalog.plural')}
      <input name="item_name_plural" value={catalogForm.item_name_plural} required />
    </label>

    <fieldset>
      <legend>{t('studio.catalog.visibleFields')}</legend>

      <label class="checkbox">
        <input type="checkbox" name="show_price" checked={catalogForm.show_price} />
        {t('studio.catalog.showPrice')}
      </label>

      <label class="checkbox">
        <input type="checkbox" name="show_availability" checked={catalogForm.show_availability} />
        {t('studio.catalog.showAvailability')}
      </label>

      <label class="checkbox">
        <input type="checkbox" name="show_material" checked={catalogForm.show_material} />
        {t('studio.catalog.showMaterial')}
      </label>

      <label class="checkbox">
        <input type="checkbox" name="show_dimensions" checked={catalogForm.show_dimensions} />
        {t('studio.catalog.showDimensions')}
      </label>

      <label class="checkbox">
        <input type="checkbox" name="show_status" checked={catalogForm.show_status} />
        {t('studio.catalog.showStatus')}
      </label>

      <label class="checkbox">
        <input type="checkbox" name="show_meta" checked={catalogForm.show_meta} />
        {t('studio.catalog.showMeta')}
      </label>
    </fieldset>

    <div class="actions">
      <button type="submit">{t('studio.catalog.save')}</button>
    </div>

    {#if form?.catalogMessage}
      <p class={`status ${form.catalogStatus || 'info'}`}>{form.catalogMessage}</p>
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
    gap: 0.75rem;
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

  input {
    width: 100%;
    padding: 0.7rem 0.8rem;
    border: 1px solid rgb(47 40 31 / 0.18);
    border-radius: 0.65rem;
    background: #fffdf9;
    color: inherit;
    font: inherit;
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
