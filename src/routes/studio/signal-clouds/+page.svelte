<script>
  import { enhance } from '$app/forms';
  import { useI18n } from '$lib/i18n/context.js';

  const t = useI18n();

  let { data, form } = $props();

  const clouds = $derived(form?.clouds ?? data.clouds);

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

<p class="intro">
  {t('studio.signals.intro')}
</p>

<section class="panel">
  <form method="POST" action="?/saveSignalClouds" use:enhance class="studio-form">
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
          {t('studio.signals.question')}
          <input name={`cloud_${cloudIndex}_question`} value={cloud.question} required />
        </label>

        <label>
          {t('studio.signals.hint')}
          <input name={`cloud_${cloudIndex}_hint`} value={cloud.hint} />
        </label>

        {#each cloud.options as option, optionIndex}
          <label>
            {t('studio.signals.answer', { id: option.id })}
            <input
              name={`cloud_${cloudIndex}_option_${optionIndex}_label`}
              value={option.label}
              required
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
      <button type="submit">{t('studio.signals.save')}</button>
    </div>

    {#if form?.cloudMessage}
      <p class={`status ${form.cloudStatus || 'info'}`}>{form.cloudMessage}</p>
    {/if}
  </form>
</section>

<style>
  .intro {
    margin: 0 0 1.5rem;
    color: #5a4632;
    line-height: 1.6;
  }

  .panel {
    padding: 1.5rem;
    border: 1px solid rgb(47 40 31 / 0.12);
    border-radius: 1rem;
    background: rgb(255 250 242 / 0.82);
  }

  .studio-form {
    display: grid;
    gap: 1.25rem;
  }

  fieldset {
    margin: 0;
    padding: 0 0 1rem;
    border: 0;
    border-bottom: 1px solid rgb(47 40 31 / 0.1);
    display: grid;
    gap: 0.85rem;
  }

  legend {
    margin-bottom: 0.25rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    font-size: 0.85rem;
    color: #7d684f;
  }

  label {
    display: grid;
    gap: 0.4rem;
    font-size: 0.95rem;
  }

  .checkbox {
    grid-template-columns: auto 1fr;
    align-items: center;
    gap: 0.65rem;
  }

  input {
    width: 100%;
    padding: 0.7rem 0.8rem;
    border: 1px solid rgb(47 40 31 / 0.18);
    border-radius: 0.65rem;
    background: #fffdf9;
    color: inherit;
    font: inherit;
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

  .actions button[type='submit'] {
    border: 0;
    border-radius: 999px;
    padding: 0.75rem 1.2rem;
    background: #2f281f;
    color: #f8f0e4;
    font: inherit;
    cursor: pointer;
  }

  .status {
    margin: 0;
    padding: 0.85rem 1rem;
    border-radius: 0.75rem;
    white-space: pre-wrap;
    line-height: 1.5;
  }

  .status.success {
    background: rgb(56 102 65 / 0.12);
    color: #2f4f35;
  }

  .status.warning {
    background: rgb(158 106 33 / 0.14);
    color: #6a4a1b;
  }

  .status.error {
    background: rgb(132 46 46 / 0.12);
    color: #6d2a2a;
  }
</style>
