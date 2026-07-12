<script>
  import { enhance } from '$app/forms';
  import StudioFieldLabel from '$lib/components/StudioFieldLabel.svelte';
  import StudioFormLegend from '$lib/components/StudioFormLegend.svelte';
  import StudioFormStatus from '$lib/components/StudioFormStatus.svelte';
  import MarkedTextField from '$lib/components/MarkedTextField.svelte';
  import { LAYOUT_BLOCK_IDS } from '$lib/layout-blocks.js';
  import { getDefaultLayoutBlockLabel } from '$lib/layout-block-labels.js';
  import { useI18n } from '$lib/i18n/context.js';
  import { studioFormDirty, studioFormEnhanceDirty } from '$lib/studio-form-dirty.js';

  const t = useI18n();

  let { data, form } = $props();

  const layoutForm = $derived(form?.layoutForm ?? data.layoutForm);
  let isDirty = $state(false);
  /** @type {import('$lib/studio-form-dirty.js').StudioFormDirtyControl} */
  const dirtyControl = {};
  /** @type {Record<import('$lib/layout-blocks.js').LayoutBlockId, boolean>} */
  let blockEnabled = $state({
    about: false,
    news: false,
    collections: false,
    catalog: false
  });
  /** @type {Record<import('$lib/layout-blocks.js').LayoutBlockId, import('$lib/layout-blocks.js').LayoutPlacement>} */
  let blockPlacement = $state({
    about: 'sidebar',
    news: 'sidebar',
    collections: 'sidebar',
    catalog: 'main'
  });

  $effect(() => {
    for (const blockId of LAYOUT_BLOCK_IDS) {
      blockEnabled[blockId] = layoutForm.blocks[blockId].enabled;
      blockPlacement[blockId] = layoutForm.blocks[blockId].placement;
    }

    dirtyControl.resetBaseline?.();
  });

  /** @param {import('$lib/layout-blocks.js').LayoutBlockId} blockId */
  function defaultBlockLabel(blockId) {
    return getDefaultLayoutBlockLabel(blockId, data.siteLocale);
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

  <form
    method="POST"
    action="?/saveLayout"
    use:studioFormDirty={{ setDirty: (value) => (isDirty = value), dirtyControl }}
    use:enhance={() => studioFormEnhanceDirty(dirtyControl)}
  >
    <StudioFormLegend />

    <fieldset>
      <legend>{t('studio.site.layout.blocksLegend')}</legend>
      <p class="hint">{t('studio.site.layout.blocksHint')}</p>

      {#each LAYOUT_BLOCK_IDS as blockId (blockId)}
        {@const block = layoutForm.blocks[blockId]}
        <div class="block-row" class:is-news={blockId === 'news'}>
          <label class="checkbox block-toggle">
            <input type="checkbox" name={`block_${blockId}_enabled`} bind:checked={blockEnabled[blockId]} />
            <span class="sr-only">{defaultBlockLabel(blockId)}</span>
          </label>

          <label class="block-name">
            <StudioFieldLabel
              label={t('studio.site.layout.blockName')}
              optional
              hint={t('studio.site.layout.blockNameHint')}
            />
            <MarkedTextField
              name={`block_${blockId}_label`}
              value={block.label ?? ''}
              placeholder={defaultBlockLabel(blockId)}
            />
          </label>

          {#if blockId === 'news'}
            <label class="block-news-count">
              <StudioFieldLabel label={t('studio.site.layout.latestNewsCount')} required />
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

          {#if blockEnabled[blockId]}
            <label class="block-placement">
              <StudioFieldLabel label={t('studio.site.layout.placement')} required />
              <select name={`block_${blockId}_placement`} bind:value={blockPlacement[blockId]}>
                <option value="main">{t('studio.site.layout.placementMain')}</option>
                <option value="sidebar">{t('studio.site.layout.placementSidebar')}</option>
                <option value="menu">{t('studio.site.layout.placementMenu')}</option>
              </select>
            </label>
          {:else}
            <input type="hidden" name={`block_${blockId}_placement`} value={blockPlacement[blockId]} />
          {/if}
        </div>
      {/each}
    </fieldset>

    <div class="actions">
      <button type="submit" disabled={!isDirty}>{t('studio.site.layout.save')}</button>
    </div>

    <StudioFormStatus message={form?.layoutMessage} status={form?.layoutStatus} />
  </form>
</section>

<style>
  .block-row {
    display: grid;
    gap: 0.85rem;
    padding: 0.85rem 0;
    border-top: 1px solid var(--studio-border);
    align-items: end;
  }

  .block-row:first-of-type {
    border-top: 0;
    padding-top: 0.25rem;
  }

  .block-toggle {
    align-self: end;
    margin-bottom: 0.55rem;
  }

  .block-name,
  .block-news-count,
  .block-placement {
    min-width: 0;
  }

  .block-news-count {
    width: fit-content;
    max-width: 7rem;
  }

  .block-news-count input {
    width: 3.25rem;
    -moz-appearance: textfield;
    appearance: textfield;
  }

  .block-news-count input::-webkit-outer-spin-button,
  .block-news-count input::-webkit-inner-spin-button {
    -webkit-appearance: none;
    margin: 0;
  }

  .sr-only {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    white-space: nowrap;
    border: 0;
  }

  @media (min-width: 720px) {
    .block-row {
      grid-template-columns: auto minmax(0, 1fr) minmax(9.5rem, auto);
      column-gap: 0.65rem;
    }

    .block-row.is-news {
      grid-template-columns: auto minmax(0, 1fr) max-content minmax(9.5rem, auto);
    }

    .block-placement select {
      width: 100%;
    }
  }
</style>
