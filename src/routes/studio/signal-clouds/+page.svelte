<script>
  import { enhance } from '$app/forms';
  import StudioFieldLabel from '$lib/components/StudioFieldLabel.svelte';
  import StudioFormLegend from '$lib/components/StudioFormLegend.svelte';
  import StudioFormStatus from '$lib/components/StudioFormStatus.svelte';
  import { useI18n } from '$lib/i18n/context.js';
  import { studioFormDirty, studioFormEnhanceDirty } from '$lib/studio-form-dirty.js';

  const t = useI18n();

  let { data, form } = $props();

  const clouds = $derived(form?.clouds ?? data.clouds);
  let isDirty = $state(false);
  /** @type {import('$lib/studio-form-dirty.js').StudioFormDirtyControl} */
  const dirtyControl = {};

  $effect(() => {
    clouds;
    dirtyControl.resetBaseline?.();
  });

  /**
   * @param {string} id
   */
  function confirmRemove(id) {
    return confirm(t('studio.signals.removeConfirm', { id }));
  }
</script>

<svelte:head>
  <title>{t('studio.signals.pageTitle')}</title>
</svelte:head>

<p class="studio-intro">
  {t('studio.signals.intro')}
</p>

<section class="studio-panel">
  <form
    method="POST"
    action="?/saveSignalClouds"
    use:studioFormDirty={{ setDirty: (value) => (isDirty = value), dirtyControl }}
    use:enhance={() => studioFormEnhanceDirty(dirtyControl)}
    class="studio-form"
  >
    <StudioFormLegend />

    {#each clouds as cloud, cloudIndex}
      <fieldset>
        <legend>{cloud.id}</legend>

        <label class="checkbox">
          <input
            type="checkbox"
            name={`cloud_${cloudIndex}_enabled`}
            checked={cloud.enabled}
          />
          {t('studio.signals.enabled')}
        </label>

        <label>
          <StudioFieldLabel label={t('studio.signals.question')} optional />
          <input name={`cloud_${cloudIndex}_question`} value={cloud.question} />
        </label>

        <label>
          <StudioFieldLabel label={t('studio.signals.hint')} optional />
          <input name={`cloud_${cloudIndex}_hint`} value={cloud.hint} />
        </label>

        {#each cloud.options as option, optionIndex}
          <label>
            <StudioFieldLabel label={t('studio.signals.answer', { id: option.id })} optional />
            <input
              name={`cloud_${cloudIndex}_option_${optionIndex}_label`}
              value={option.label}
            />
          </label>
        {/each}

        <button
          type="submit"
          class="remove-button"
          name="cloud_id"
          value={cloud.id}
          formaction="?/removeCloud"
          onclick={(event) => {
            if (!confirmRemove(cloud.id)) {
              event.preventDefault();
            }
          }}
        >
          {t('studio.signals.remove')}
        </button>
      </fieldset>
    {/each}

    <div class="actions">
      <button type="submit" disabled={!isDirty}>{t('studio.signals.save')}</button>
    </div>

    <StudioFormStatus message={form?.cloudMessage} status={form?.cloudStatus} />
  </form>
</section>

<style>
  fieldset {
    padding: 0 0 1rem;
    border-bottom: 1px solid var(--studio-border);
  }

  legend {
    text-transform: uppercase;
    letter-spacing: 0.06em;
    font-size: 0.85rem;
    color: var(--studio-muted);
  }

  .checkbox input {
    width: auto;
  }

  .remove-button {
    border: 1px solid rgb(132 46 46 / 0.35);
    border-radius: 999px;
    padding: 0.45rem 0.9rem;
    background: rgb(132 46 46 / 0.08);
    color: #6d2a2a;
    font: inherit;
    cursor: pointer;
  }
</style>
