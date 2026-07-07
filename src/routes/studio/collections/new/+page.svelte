<script>
  import { enhance } from '$app/forms';
  import StudioFieldLabel from '$lib/components/StudioFieldLabel.svelte';
  import StudioFormLegend from '$lib/components/StudioFormLegend.svelte';
  import StudioFormStatus from '$lib/components/StudioFormStatus.svelte';
  import { useI18n } from '$lib/i18n/context.js';

  const t = useI18n();

  let { data, form } = $props();

  const items = $derived(form?.items ?? data.items);
  const collectionForm = $derived(
    form?.form ?? {
      id: '',
      title: '',
      description: '',
      item_ids: []
    }
  );
  const selectedIds = $derived(new Set(collectionForm.item_ids));
</script>

<svelte:head>
  <title>{t('studio.collectionsNew.pageTitle')}</title>
</svelte:head>

<p class="studio-intro">
  {t('studio.collectionsNew.intro')}
</p>

<section class="studio-panel">
  <div class="panel-heading">
    <h2>{t('studio.collectionsNew.title')}</h2>
    <p>{t('studio.collectionsNew.introPanel')}</p>
  </div>

  <form method="POST" action="?/createCollection" use:enhance class="studio-form">
    <StudioFormLegend />

    <label>
      <StudioFieldLabel label={t('studio.collectionsNew.id')} required hint={t('studio.collectionsNew.idHint')} />
      <input
        name="id"
        value={collectionForm.id}
        required
        pattern="[a-z0-9]+(?:-[a-z0-9]+)*"
        title={t('studio.collectionsNew.idPattern')}
      />
    </label>

    <label>
      <StudioFieldLabel label={t('studio.collectionsNew.titleField')} required />
      <input name="title" value={collectionForm.title} required />
    </label>

    <label>
      <StudioFieldLabel label={t('studio.collectionsNew.description')} required />
      <textarea name="description" rows="4" required>{collectionForm.description}</textarea>
    </label>

    <fieldset>
      <legend>
        {t('studio.collectionsNew.includedItems')}
        <abbr class="field-badge required" title={t('studio.forms.atLeastOne')}>*</abbr>
      </legend>
      <p class="hint">{t('studio.forms.atLeastOne')}</p>

      {#if items.length === 0}
        <p class="hint">
          {t('studio.collectionsNew.noItems')}
          <a href="/studio/items/new">{t('studio.collectionsNew.createItemFirst')}</a>.
        </p>
      {:else}
        <div class="checkbox-list">
          {#each items as item}
            <label class="checkbox">
              <input
                type="checkbox"
                name="item_ids"
                value={item.id}
                checked={selectedIds.has(item.id)}
              />
              {item.title}
              <span>({item.id})</span>
            </label>
          {/each}
        </div>
      {/if}
    </fieldset>

    <div class="actions">
      <button type="submit" disabled={items.length === 0}>{t('studio.collectionsNew.create')}</button>
      <a class="secondary-link" href="/studio/collections">{t('studio.collectionsNew.cancel')}</a>
    </div>

    <StudioFormStatus message={form?.createMessage} status={form?.createStatus} />
  </form>
</section>

<style>
  .checkbox span {
    color: var(--studio-muted);
    font-size: 0.85rem;
  }

  .checkbox-list {
    display: grid;
    gap: 0.65rem;
  }

  .hint {
    margin: 0;
  }

  .hint a {
    color: var(--studio-accent);
    font-weight: 600;
    text-decoration: none;
  }

  .hint a:hover {
    text-decoration: underline;
  }

  .actions {
    display: flex;
    gap: 1rem;
    align-items: center;
  }

  .secondary-link {
    color: var(--studio-accent);
    font-weight: 600;
    text-decoration: none;
  }

  .secondary-link:hover {
    text-decoration: underline;
  }
</style>
