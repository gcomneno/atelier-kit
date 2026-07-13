<script>
  import { enhance } from '$app/forms';
  import StudioFieldLabel from '$lib/components/StudioFieldLabel.svelte';
  import StudioFormLegend from '$lib/components/StudioFormLegend.svelte';
  import StudioFormStatus from '$lib/components/AtelierFormStatus.svelte';
  import MarkedTextField from '$lib/components/MarkedTextField.svelte';
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
          <MarkedTextField name={`cloud_${cloudIndex}_question`} value={cloud.question} />
        </label>

        <label>
          <StudioFieldLabel label={t('studio.signals.hint')} optional />
          <MarkedTextField name={`cloud_${cloudIndex}_hint`} value={cloud.hint} />
        </label>

        {#each cloud.options as option, optionIndex}
          <label>
            <StudioFieldLabel label={t('studio.signals.answer', { id: option.id })} optional />
            <MarkedTextField
              name={`cloud_${cloudIndex}_option_${optionIndex}_label`}
              value={option.label}
            />
          </label>
        {/each}

        <fieldset class="faq-fields">
          <legend>{t('studio.signals.faqTitle')}</legend>

          <p class="field-hint">
            {t('studio.signals.faqQuestionHint')}
          </p>

          <label class="checkbox">
            <input
              type="checkbox"
              name={`cloud_${cloudIndex}_faq_visible`}
              checked={cloud.faq.visible}
              onchange={(event) => {
                const answer = event.currentTarget.form?.elements.namedItem(
                  `cloud_${cloudIndex}_faq_answer`
                );

                if (answer instanceof HTMLTextAreaElement) {
                  answer.required = event.currentTarget.checked;
                }
              }}
            />
            {t('studio.signals.faqVisible')}
          </label>

          <label>
            <StudioFieldLabel
              label={t('studio.signals.faqAnswer')}
              hint={t('studio.signals.faqAnswerHint')}
            />
            <MarkedTextField
              name={`cloud_${cloudIndex}_faq_answer`}
              value={cloud.faq.answer}
              multiline
              rows={4}
              required={cloud.faq.visible}
            />
          </label>

          <label>
            <StudioFieldLabel
              label={t('studio.signals.faqGroup')}
              optional
              hint={t('studio.signals.faqGroupHint')}
            />
            <MarkedTextField
              name={`cloud_${cloudIndex}_faq_group`}
              value={cloud.faq.group}
            />
          </label>

          <label>
            <StudioFieldLabel
              label={t('studio.signals.faqOrder')}
              optional
              hint={t('studio.signals.faqOrderHint')}
            />
            <input
              type="number"
              min="0"
              step="1"
              name={`cloud_${cloudIndex}_faq_order`}
              value={cloud.faq.order}
            />
          </label>
        </fieldset>

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

  .faq-fields {
    margin-top: 1.25rem;
    padding: 1rem;
    border: 1px solid var(--studio-border);
    border-radius: 0.75rem;
  }

  .faq-fields legend {
    padding: 0 0.35rem;
  }

  .field-hint {
    margin: 0;
    color: var(--studio-muted);
    font-size: 0.9rem;
    line-height: 1.5;
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
