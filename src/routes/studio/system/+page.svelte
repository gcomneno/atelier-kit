<script>
  // @ts-nocheck
  import { enhance } from '$app/forms';
  import { invalidateAll } from '$app/navigation';
  import StudioFieldLabel from '$lib/components/StudioFieldLabel.svelte';
  import StudioFormLegend from '$lib/components/StudioFormLegend.svelte';
  import StudioFormStatus from '$lib/components/StudioFormStatus.svelte';
  import { useI18n } from '$lib/i18n/context.js';
  import { resolveLocale, SUPPORTED_LOCALES } from '$lib/i18n/resolve-locale.js';
  import { studioFormDirty, studioFormEnhanceDirty } from '$lib/studio-form-dirty.js';
  import { studioFormEnhance } from '$lib/studio-form-enhance.js';

  const t = useI18n();

  let { data, form } = $props();

  const languageForm = $derived(form?.languageForm ?? data.languageForm);
  let language = $state('en');
  let isDirty = $state(false);
  /** @type {import('$lib/studio-form-dirty.js').StudioFormDirtyControl} */
  const dirtyControl = {};

  $effect(() => {
    language = resolveLocale(languageForm.language);
    dirtyControl.resetBaseline?.();
  });

  function confirmShutdown() {
    return confirm(t('studio.system.shutdown.confirm'));
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

    <form method="POST" action="?/shutdown" use:enhance={studioFormEnhance}>
      <p class="hint">{t('studio.system.shutdown.hint')}</p>

      <div class="actions">
        <button
          type="submit"
          class="danger"
          onclick={(event) => {
            if (!confirmShutdown()) {
              event.preventDefault();
            }
          }}
        >
          {t('studio.system.shutdown.action')}
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
</style>
