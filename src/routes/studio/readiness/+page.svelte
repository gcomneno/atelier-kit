<script>
  import { AsyncOperationPanel, Button, PageIntro, Panel } from 'giadaware-ui-components/studio';
  import { enhance } from '$app/forms';
  import { untrack } from 'svelte';
  import { useI18n } from '$lib/i18n/context.js';
  import { createReadinessActionState } from '$lib/studio-readiness-action-state.js';
  import {
    createLiveOperationPanelModel,
    createPrepOperationPanelModel
  } from '$lib/studio-readiness-operation-panel.js';

  const t = useI18n();

  let { data, form } = $props();

  let actionState = $state(createReadinessActionState(untrack(() => form)));
  const prepResult = $derived(actionState.results.prep);
  const liveResult = $derived(actionState.results.live);
  const livePreview = $derived(liveResult?.livePreview ?? data.livePreview);
  const pendingCount = $derived(livePreview.changes.length + livePreview.commitsAhead);
  const prepRunning = $derived(actionState.pending.prep);
  const liveRunning = $derived(actionState.pending.live);

  const prepPanelModel = $derived(
    createPrepOperationPanelModel({
      running: prepRunning,
      result: prepResult,
      busyLabel: t('studio.readiness.publishRunning'),
      detailsLabel: t('studio.readiness.testOutputDetails')
    })
  );

  const livePanelModel = $derived(
    createLiveOperationPanelModel({
      running: liveRunning,
      result: liveResult,
      busyLabel: t('studio.readiness.liveRunning'),
      detailsLabel: t('studio.readiness.liveOutputDetails')
    })
  );

  /** @param {'prep' | 'live'} action */
  function enhanceAction(action) {
    /** @type {import('@sveltejs/kit').SubmitFunction} */
    return () => {
      return async ({ result, update }) => {
        actionState.complete(action, result);
        await update({ reset: false });
      };
    };
  }

  function confirmLive() {
    if (pendingCount === 0) {
      return confirm(t('studio.readiness.liveConfirmRedeploy'));
    }

    return confirm(t('studio.readiness.liveConfirm', { count: pendingCount }));
  }
</script>

<svelte:head>
  <title>{t('studio.readiness.pageTitle')}</title>
</svelte:head>

<PageIntro>
  {t('studio.readiness.intro')}
</PageIntro>

<Panel title={t('studio.readiness.doctorTitle')} id="content-doctor" class="atelier-studio-panel">

  <div class="panel-summary">
    <p class={data.report.ok ? 'ok' : 'review'}>
      {data.report.ok ? t('studio.readiness.doctorOk') : t('studio.readiness.doctorReview')}
    </p>
  </div>

  <pre class="report">{data.report.output}</pre>
</Panel>

{#snippet prepDescription()}
  <p>{t('studio.readiness.publishIntro')}</p>
{/snippet}

{#snippet prepAction()}
  <form
    method="POST"
    action="?/runPublishPrep"
    use:enhance={enhanceAction('prep')}
    class="action-form"
    onsubmit={(event) => {
      if (prepRunning || liveRunning) {
        event.preventDefault();
        return;
      }

      actionState.start('prep');
    }}
  >
    <Button type="submit" variant="secondary" disabled={prepRunning || liveRunning}>
      {prepRunning ? t('studio.readiness.publishRunning') : t('studio.readiness.publishRun')}
    </Button>
  </form>
{/snippet}

<AsyncOperationPanel
  {...prepPanelModel}
  title={t('studio.readiness.publishTitle')}
  description={prepDescription}
  action={prepAction}
  headingLevel={2}
  class="test-panel"
/>

{#snippet liveDescription()}
  <p>{t('studio.readiness.liveIntro')}</p>

  {#if !livePreview.canPublish}
    <p class="review">{t('studio.readiness.liveBlocked')}</p>
    <ul class="issues">
      {#each livePreview.issues as issue}
        <li>{t(`studio.readiness.liveIssues.${issue}`)}</li>
      {/each}
    </ul>
  {:else}
    <div class="pending">
      {#if pendingCount === 0}
        <p>{t('studio.readiness.livePendingEmpty')}</p>
      {:else}
        <p>{t('studio.readiness.livePendingSummary', { count: pendingCount })}</p>

        {#if livePreview.changes.length > 0}
          <details class="pending-details">
            <summary>{t('studio.readiness.livePendingDetails')}</summary>
            <ul>
              {#each livePreview.changes as change}
                <li><code>{change.path}</code></li>
              {/each}
            </ul>
          </details>
        {/if}

        {#if livePreview.commitsAhead > 0}
          <p>{t('studio.readiness.liveCommitsAhead', { count: livePreview.commitsAhead })}</p>
        {/if}
      {/if}
    </div>
  {/if}
{/snippet}

{#snippet liveAction()}
  {#if livePreview.canPublish}
    <form
      method="POST"
      action="?/publishLive"
      use:enhance={enhanceAction('live')}
      class="action-form"
      onsubmit={(event) => {
        if (liveRunning || prepRunning) {
          event.preventDefault();
          return;
        }

        if (!confirmLive()) {
          event.preventDefault();
          return;
        }

        actionState.start('live');
      }}
    >
      <Button type="submit" variant="primary" disabled={liveRunning || prepRunning}>
        {liveRunning ? t('studio.readiness.liveRunning') : t('studio.readiness.liveRun')}
      </Button>
    </form>
  {/if}
{/snippet}

<AsyncOperationPanel
  {...livePanelModel}
  title={t('studio.readiness.liveTitle')}
  description={liveDescription}
  action={liveAction}
  headingLevel={2}
  class="live-panel"
/>

{#if liveResult?.live?.ok}
  <p class="live-url">
    <a
      href={liveResult.live.deployedUrl ?? data.siteUrl}
      target="_blank"
      rel="noopener noreferrer"
    >
      {liveResult.live.deployedUrl ?? data.siteUrl}
    </a>
  </p>
{/if}

<style>
  :global(.live-panel) {
    border-color: rgb(47 79 53 / 0.25);
  }

  :global(.test-panel) {
    border-color: rgb(106 74 27 / 0.22);
  }

  .pending p {
    margin: 0 0 0.75rem;
    color: var(--studio-text);
  }

  .pending-details {
    margin: 0 0 0.75rem;
    color: var(--studio-text);
  }

  .pending-details ul {
    margin: 0.5rem 0 0;
    padding-left: 1.2rem;
  }

  .issues {
    margin: 0;
    padding-left: 1.2rem;
    color: #6a4a1b;
  }

  .ok {
    color: #2f4f35;
  }

  .review {
    color: #6a4a1b;
  }

  .live-url {
    margin: 0 0 1rem;
    font-weight: 600;
  }

  .live-url a {
    color: #2f4f35;
  }

  .report {
    margin: 0.75rem 0 0;
    padding: 1rem;
    overflow-x: auto;
    border-radius: 0.75rem;
    background: #2f281f;
    color: #f8f0e4;
    white-space: pre-wrap;
    line-height: 1.5;
  }

  .action-form {
    margin: 0;
  }
</style>
