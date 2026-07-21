<script>
  import MarkedTextField from '$lib/components/MarkedTextField.svelte';
  import { enhance } from '$app/forms';
  import StudioFieldLabel from '$lib/components/StudioFieldLabel.svelte';
  import StudioFormLegend from '$lib/components/StudioFormLegend.svelte';
  import StudioFormStatus from '$lib/components/AtelierFormStatus.svelte';
  import StudioItemRelationFields from '$lib/components/StudioItemRelationFields.svelte';
  import { useI18n } from '$lib/i18n/context.js';

  const t = useI18n();

  let { data, form } = $props();

  const presets = $derived(data.presets);
  const itemForm = $derived(
    form?.form ?? {
      id: '',
      title: '',
      preset: data.defaultPreset,
      description: '',
      relationRows: []
    }
  );
  /** @type {Array<{ type: string, target: string, label: string }>} */
  let relationRows = $state([]);
  let currentItemId = $state('');

  $effect(() => {
    relationRows = (itemForm.relationRows ?? []).map((row) => ({ ...row }));
    currentItemId = itemForm.id;
  });
</script>

<svelte:head>
  <title>{t('studio.itemsNew.pageTitle')}</title>
</svelte:head>

<p class="studio-intro">
  {t('studio.itemsNew.intro')}
</p>

<section class="studio-panel">
  <div class="panel-heading">
    <h2>{t('studio.itemsNew.title')}</h2>
    <p>{t('studio.itemsNew.introPanel')}</p>
  </div>

  <form method="POST" action="?/createItem" enctype="multipart/form-data" use:enhance class="studio-form">
    <StudioFormLegend />

    <label>
      <StudioFieldLabel label={t('studio.itemsNew.id')} required hint={t('studio.itemsNew.idHint')} />
      <input
        name="id"
        bind:value={currentItemId}
        required
        pattern="[a-z0-9]+(?:-[a-z0-9]+)*"
        title={t('studio.itemsNew.idPattern')}
      />
    </label>

    <label>
      <StudioFieldLabel label={t('studio.itemsNew.titleField')} required />
      <MarkedTextField name="title" value={itemForm.title} />
    </label>

    <label>
      <StudioFieldLabel label={t('studio.itemsNew.preset')} required />
      <select name="preset" value={itemForm.preset}>
        {#each presets as preset}
          <option value={preset.id}>{preset.label}</option>
        {/each}
      </select>
    </label>

    <label>
      <StudioFieldLabel label={t('studio.itemsNew.description')} optional />
      <MarkedTextField name="description" value={itemForm.description} multiline rows={4} />
    </label>

    <label>
      <StudioFieldLabel
        label={t('studio.itemsNew.photo')}
        optional
        hint={t('studio.itemsNew.photoHint', { id: itemForm.id || 'item-id' })}
      />
      <input type="file" name="image_upload" accept="image/jpeg,image/png,image/webp" />
    </label>

    <StudioItemRelationFields
      bind:rows={relationRows}
      targets={data.relationAuthoring.targets}
      typeSuggestions={data.relationAuthoring.typeSuggestions}
      currentId={currentItemId}
    />

    <div class="actions">
      <button type="submit">{t('studio.itemsNew.create')}</button>
      <a class="secondary-link" href="/studio/items">{t('studio.itemsNew.cancel')}</a>
    </div>

    <StudioFormStatus message={form?.createMessage} status={form?.createStatus} />
  </form>
</section>

<style>
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
