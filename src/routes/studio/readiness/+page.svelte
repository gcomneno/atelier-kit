<script>
  import { enhance } from '$app/forms';
  import { useI18n } from '$lib/i18n/context.js';

  const t = useI18n();

  let { data, form } = $props();

  const livePreview = $derived(form?.livePreview ?? data.livePreview);
  const pendingCount = $derived(livePreview.changes.length + livePreview.commitsAhead);

  let prepRunning = $state(false);
  let liveRunning = $state(false);

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

<p class="studio-intro">
  {t('studio.readiness.intro')}
</p>

<section class="studio-panel">
  <div class="panel-heading">
    <h2>{t('studio.readiness.doctorTitle')}</h2>
    <p class={data.report.ok ? 'ok' : 'review'}>
      {data.report.ok ? t('studio.readiness.doctorOk') : t('studio.readiness.doctorReview')}
    </p>
  </div>

  <pre class="report">{data.report.output}</pre>
</section>

<section class="studio-panel primary-panel">
  <div class="panel-heading">
    <h2>{t('studio.readiness.liveTitle')}</h2>
    <p>{t('studio.readiness.liveIntro')}</p>
  </div>

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

    <form
      method="POST"
      action="?/publishLive"
      use:enhance={() => {
        liveRunning = true;

        return async ({ update }) => {
          liveRunning = false;
          await update();
        };
      }}
      class="action-form"
      onsubmit={(event) => {
        if (!confirmLive()) {
          event.preventDefault();
        }
      }}
    >
      <button type="submit" class="primary" disabled={liveRunning || prepRunning}>
        {liveRunning ? t('studio.readiness.liveRunning') : t('studio.readiness.liveRun')}
      </button>
    </form>
  {/if}

  {#if form?.live}
    <p class={form.live.ok ? 'ok' : 'review'} role="status" aria-live="polite">{form.message}</p>
    {#if form.live.ok && form.live.deployedUrl}
      <p class="live-url">
        <a href={form.live.deployedUrl} target="_blank" rel="noopener noreferrer">{form.live.deployedUrl}</a>
      </p>
    {:else if form.live.ok && data.siteUrl}
      <p class="live-url">
        <a href={data.siteUrl} target="_blank" rel="noopener noreferrer">{data.siteUrl}</a>
      </p>
    {/if}
    <details class="output-details">
      <summary>{t('studio.readiness.outputDetails')}</summary>
      <pre class="report">{form.live.output}</pre>
    </details>
  {/if}
</section>

<section class="studio-panel secondary-panel">
  <div class="panel-heading">
    <h2>{t('studio.readiness.publishTitle')}</h2>
    <p>{t('studio.readiness.publishIntro')}</p>
  </div>

  <form
    method="POST"
    action="?/runPublishPrep"
    use:enhance={() => {
      prepRunning = true;

      return async ({ update }) => {
        prepRunning = false;
        await update();
      };
    }}
    class="action-form"
  >
    <button type="submit" class="secondary" disabled={prepRunning || liveRunning}>
      {prepRunning ? t('studio.readiness.publishRunning') : t('studio.readiness.publishRun')}
    </button>
  </form>

  {#if form?.prep}
    <p class={form.prep.ok ? 'ok' : 'review'} role="status" aria-live="polite">{form.message}</p>
    <details class="output-details" open={!form.prep.ok}>
      <summary>{t('studio.readiness.outputDetails')}</summary>
      <pre class="report">{form.prep.output}</pre>
    </details>
  {/if}
</section>

<style>
  .panel-heading h2 {
    margin: 0 0 0.35rem;
    font-size: 1.2rem;
  }

  .panel-heading p {
    margin: 0 0 1rem;
    color: var(--studio-muted);
  }

  .primary-panel {
    border-color: rgb(47 79 53 / 0.25);
  }

  .secondary-panel h2 {
    font-size: 1.05rem;
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

  .output-details {
    margin-top: 0.75rem;
  }

  .output-details summary {
    cursor: pointer;
    color: var(--studio-muted);
    font-size: 0.92rem;
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
    margin-bottom: 1rem;
  }

  .action-form button {
    padding: 0.65rem 1.1rem;
    border: 1px solid rgb(47 40 31 / 0.2);
    border-radius: 0.65rem;
    cursor: pointer;
    font-size: 1rem;
  }

  .action-form button.secondary {
    background: #f8f0e4;
    color: #2f281f;
  }

  .action-form button.primary {
    background: #2f4f35;
    color: #f8f0e4;
    border-color: #2f4f35;
    font-weight: 600;
  }

  .action-form button:disabled {
    opacity: 0.65;
    cursor: wait;
  }
</style>
