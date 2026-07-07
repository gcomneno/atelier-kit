<script>
  import { enhance } from '$app/forms';
  import { LAYOUT_BLOCK_IDS } from '$lib/layout-blocks.js';
  import { useI18n } from '$lib/i18n/context.js';
  import { studioFormEnhance } from '$lib/studio-form-enhance.js';

  const t = useI18n();

  let { data, form } = $props();

  const layoutForm = $derived(form?.layoutForm ?? data.layoutForm);
  let preset = $state('catalog-sidebar');
  /** @type {Record<import('$lib/layout-blocks.js').LayoutBlockId, boolean>} */
  let blockEnabled = $state({
    about: false,
    news: false,
    collections: false,
    catalog: false
  });

  $effect(() => {
    preset = layoutForm.preset;
    for (const blockId of LAYOUT_BLOCK_IDS) {
      blockEnabled[blockId] = layoutForm.blocks[blockId].enabled;
    }

    const usesSidebar = LAYOUT_BLOCK_IDS.some(
      (id) => layoutForm.blocks[id].enabled && layoutForm.blocks[id].placement === 'sidebar'
    );

    if (usesSidebar && preset === 'single-column') {
      preset = 'catalog-sidebar';
    }
  });

  /** @param {Event} event */
  function onPlacementChange(event) {
    if (!(event.currentTarget instanceof HTMLSelectElement)) {
      return;
    }

    if (event.currentTarget.value === 'sidebar' && preset === 'single-column') {
      preset = 'catalog-sidebar';
    }
  }
</script>

<svelte:head>
  <title>{t('studio.site.pageTitle')}</title>
</svelte:head>

<p class="studio-intro">{t('studio.site.intro')}</p>

<section class="studio-panel" aria-labelledby="layout-settings-title">
  <div class="panel-heading">
    <h2 id="layout-settings-title">{t('studio.site.layout.title')}</h2>
    <p>{t('studio.site.layout.intro')}</p>
  </div>

  <form method="POST" action="?/saveLayout" use:enhance={studioFormEnhance}>
    <label>
      {t('studio.site.layout.preset')}
      <select name="preset" bind:value={preset}>
        {#each data.layoutPresets as layoutPreset}
          <option value={layoutPreset}>{t(`studio.site.layout.presets.${layoutPreset}`)}</option>
        {/each}
      </select>
    </label>

    <fieldset>
      <legend>{t('studio.site.layout.blocksLegend')}</legend>
      <p class="hint">{t('studio.site.layout.blocksHint')}</p>

      {#each LAYOUT_BLOCK_IDS as blockId (blockId)}
        {@const block = layoutForm.blocks[blockId]}
        <div class="block-row">
          <label class="checkbox">
            <input type="checkbox" name={`block_${blockId}_enabled`} bind:checked={blockEnabled[blockId]} />
            {t(`studio.site.layout.blocks.${blockId}`)}
          </label>

          {#if blockEnabled[blockId]}
            <label>
              {t('studio.site.layout.placement')}
              <select
                name={`block_${blockId}_placement`}
                value={block.placement}
                onchange={onPlacementChange}
              >
                <option value="main">{t('studio.site.layout.placementMain')}</option>
                <option value="sidebar">{t('studio.site.layout.placementSidebar')}</option>
                <option value="menu">{t('studio.site.layout.placementMenu')}</option>
              </select>
            </label>
          {:else}
            <input type="hidden" name={`block_${blockId}_placement`} value={block.placement} />
          {/if}

          {#if blockId === 'news'}
            <label>
              {t('studio.site.layout.latestNewsCount')}
              <input
                name="block_news_count"
                type="number"
                min="1"
                max="10"
                value={block.count}
                disabled={!blockEnabled[blockId]}
              />
            </label>
          {/if}
        </div>
      {/each}
    </fieldset>

    <div class="actions">
      <button type="submit">{t('studio.site.layout.save')}</button>
    </div>

    {#if form?.layoutMessage}
      <p class={`status ${form.layoutStatus || 'info'}`}>{form.layoutMessage}</p>
    {/if}
  </form>
</section>

<style>
  .block-row {
    display: grid;
    gap: 0.85rem;
    padding: 0.85rem 0;
    border-top: 1px solid var(--studio-border);
  }

  .block-row:first-of-type {
    border-top: 0;
    padding-top: 0.25rem;
  }

  @media (min-width: 720px) {
    .block-row {
      grid-template-columns: minmax(10rem, 1fr) minmax(10rem, 1fr) auto;
      align-items: end;
    }
  }
</style>
