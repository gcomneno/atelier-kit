<script>
  import { enhance } from '$app/forms';
  import { Button, FormActions, PageIntro, Panel } from 'giadaware-ui-components/studio';
  import StudioFormLegend from '$lib/components/StudioFormLegend.svelte';
  import StudioFormStatus from '$lib/components/AtelierFormStatus.svelte';
  import { useI18n } from '$lib/i18n/context.js';
  import {
    studioFormDirty,
    studioFormEnhanceDirty
  } from '$lib/studio-form-dirty.js';

  const t = useI18n();

  let { data, form } = $props();

  const analyticsForm = $derived(form?.analyticsForm ?? data.analyticsForm);
  let enabled = $state(false);
  let isDirty = $state(false);

  /** @type {import('$lib/studio-form-dirty.js').StudioFormDirtyControl} */
  const dirtyControl = {};

  $effect(() => {
    enabled = analyticsForm.enabled;
    dirtyControl.resetBaseline?.();
  });
</script>

<svelte:head>
  <title>{t('studio.analytics.pageTitle')}</title>
</svelte:head>

<PageIntro>{t('studio.analytics.intro')}</PageIntro>

<Panel title={t('studio.analytics.title')} class="atelier-studio-panel">
  <div class="panel-summary">
    <p>{t('studio.analytics.description')}</p>
  </div>

  <form
    method="POST"
    action="?/saveAnalytics"
    use:studioFormDirty={{
      setDirty: (value) => (isDirty = value),
      dirtyControl
    }}
    use:enhance={() => studioFormEnhanceDirty(dirtyControl)}
  >
    <StudioFormLegend />

    <label class="checkbox">
      <input
        type="checkbox"
        name="analytics_enabled"
        bind:checked={enabled}
      />
      {t('studio.analytics.enabled')}
    </label>

    <div class="analytics-notes">
      <p>{t('studio.analytics.dashboardRequired')}</p>
      <p>{t('studio.analytics.publishRequired')}</p>
      <p>{t('studio.analytics.noHistory')}</p>
      <p>{t('studio.analytics.pageViewsOnly')}</p>
    </div>

    <FormActions>
      <Button type="submit" disabled={!isDirty}>
        {t('studio.analytics.save')}
      </Button>
    </FormActions>

    <StudioFormStatus
      message={form?.analyticsMessage}
      status={form?.analyticsStatus}
    />
  </form>
</Panel>

<style>
  .analytics-notes {
    display: grid;
    gap: 0.45rem;
    color: var(--studio-muted);
    font-size: 0.92rem;
  }

  .analytics-notes p {
    margin: 0;
  }
</style>
