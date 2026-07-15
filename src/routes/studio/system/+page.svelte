<script>
  // @ts-nocheck
  import { enhance } from '$app/forms';
  import { invalidateAll } from '$app/navigation';
  import StudioFieldLabel from '$lib/components/StudioFieldLabel.svelte';
  import StudioFormLegend from '$lib/components/StudioFormLegend.svelte';
  import StudioFormStatus from '$lib/components/AtelierFormStatus.svelte';
  import { useI18n } from '$lib/i18n/context.js';
  import { resolveLocale, SUPPORTED_LOCALES } from '$lib/i18n/resolve-locale.js';
  import { studioFormDirty, studioFormEnhanceDirty } from '$lib/studio-form-dirty.js';
  import {
    afterBrowserRender,
    createStudioShutdownFlow,
    renderStudioShutdownDocument,
    showStudioShutdownFallback
  } from '$lib/studio-shutdown-client.js';

  const t = useI18n();

  let { data, form } = $props();

  const languageForm = $derived(form?.languageForm ?? data.languageForm);
  let language = $state('en');
  let isDirty = $state(false);
  let shutdownPending = $state(false);
  /** @type {import('$lib/studio-form-dirty.js').StudioFormDirtyControl} */
  const dirtyControl = {};

  $effect(() => {
    language = resolveLocale(languageForm.language);
    dirtyControl.resetBaseline?.();
  });

  const shutdownFlow = createStudioShutdownFlow({
    confirmShutdown: () => confirm(t('studio.system.shutdown.confirm')),
    renderTerminal: () =>
      renderStudioShutdownDocument(document, {
        lang: resolveLocale(languageForm.language),
        pageTitle: t('studio.system.shutdown.stopped'),
        stopped: t('studio.system.shutdown.stopped'),
        fallback: t('studio.system.shutdown.fallback')
      }),
    afterRender: () => afterBrowserRender(window),
    closeWindow: () => window.close(),
    showFallback: () => showStudioShutdownFallback(document),
    acknowledgeRendered: () =>
      fetch('?/shutdownRendered', { method: 'POST', keepalive: true }),
    onPhaseChange: (phase) => (shutdownPending = phase !== 'idle')
  });

  function handleShutdownResult() {
    return async ({ result, update }) => {
      await update({ reset: false });
      if (result.type === 'success' && result.data?.shutdownStatus === 'success') {
        await shutdownFlow.complete();
      } else {
        shutdownFlow.reset();
      }
    };
  }
</script>

<svelte:head>
  <title>{t('studio.system.pageTitle')}</title>
</svelte:head>

<p class="studio-intro">{t('studio.system.intro')}</p>

<div class="system-sections">
  <section class="studio-panel" aria-labelledby="language-settings-title">
    <div class="panel-heading">
      <h2 id="language-settings-title">{t('studio.system.language.title')}</h2>
      <p>{t('studio.system.language.description')}</p>
    </div>

    <form
      method="POST"
      action="?/saveLanguage"
      use:studioFormDirty={{ setDirty: (value) => (isDirty = value), dirtyControl }}
      use:enhance={() =>
        studioFormEnhanceDirty(dirtyControl, async () => {
          await invalidateAll();
        })}
    >
      <StudioFormLegend />

      <label>
        <StudioFieldLabel label={t('studio.system.language.field')} required />
        <select name="language" bind:value={language}>
          {#each SUPPORTED_LOCALES as code}
            <option value={code}>{t(`studio.system.language.languages.${code}`)}</option>
          {/each}
        </select>
      </label>

      <div class="actions">
        <button type="submit" disabled={!isDirty}>{t('studio.system.language.save')}</button>
      </div>

      <StudioFormStatus message={form?.languageMessage} status={form?.languageStatus} />
    </form>
  </section>

  <section class="studio-panel shutdown-panel" aria-labelledby="shutdown-title">
    <div class="panel-heading">
      <h2 id="shutdown-title">{t('studio.system.shutdown.title')}</h2>
      <p>{t('studio.system.shutdown.description')}</p>
    </div>

    <form
      method="POST"
      action="?/shutdown"
      use:enhance={({ cancel }) => {
        if (!shutdownFlow.begin()) {
          cancel();
          return;
        }
        return handleShutdownResult();
      }}
    >
      <p class="hint">{t('studio.system.shutdown.hint')}</p>

      <div class="actions">
        <button type="submit" class="danger" disabled={shutdownPending}>
          {shutdownPending
            ? t('studio.system.shutdown.stopping')
            : t('studio.system.shutdown.action')}
        </button>
      </div>

      <StudioFormStatus message={form?.shutdownMessage} status={form?.shutdownStatus} />
    </form>
  </section>
</div>

<style>
  .system-sections {
    display: grid;
    gap: 1.25rem;
  }

  .hint {
    margin: 0 0 0.25rem;
    color: var(--studio-muted);
    font-size: 0.92rem;
    line-height: 1.5;
  }

  .shutdown-panel {
    border-color: #e8c5c5;
    background: linear-gradient(160deg, #fdf3f3 0%, #fff 58%);
  }

  .shutdown-panel :global(button.danger) {
    background: #b42318;
  }

  .shutdown-panel :global(button.danger:hover) {
    background: #912018;
  }

  .shutdown-panel :global(button.danger:disabled) {
    opacity: 0.65;
    cursor: wait;
  }
</style>
