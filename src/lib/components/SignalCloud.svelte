<script>
  import { onMount } from 'svelte';
  import { useVisitorI18n } from '$lib/i18n/visitor-context.js';

  /**
   * @typedef {{ id: string, label: string }} SignalOption
   * @typedef {{ id: string, question: string, hint?: string, options: SignalOption[] }} SignalCloud
   */

  /** @type {string} */
  export let itemId;

  /** @type {SignalCloud} */
  export let cloud;

  const t = useVisitorI18n();

  /** @type {string | null} */
  let selectedOptionId = null;

  $: storageKey = `atelier-kit:signals:${itemId}:${cloud.id}`;
  $: headingId = `signal-cloud-${itemId}-${cloud.id}-heading`;
  $: hintId = `signal-cloud-${itemId}-${cloud.id}-hint`;
  $: selectedOption = cloud.options.find((option) => option.id === selectedOptionId);
  $: selectionMessage = selectedOption
    ? t('signalCloud.selected', { label: selectedOption.label })
    : t('signalCloud.noSelection');

  onMount(() => {
    const savedOptionId = localStorage.getItem(storageKey);

    if (savedOptionId && cloud.options.some((option) => option.id === savedOptionId)) {
      selectedOptionId = savedOptionId;
    }
  });

  /**
   * @param {string} optionId
   */
  function choose(optionId) {
    selectedOptionId = optionId;
    localStorage.setItem(storageKey, optionId);

    window.dispatchEvent(
      new CustomEvent('atelier-kit:signal-change', {
        detail: {
          itemId,
          cloudId: cloud.id,
          optionId
        }
      })
    );
  }
</script>

<section class="signal-cloud" aria-labelledby={headingId} aria-describedby={hintId}>
  <div class="cloud-header">
    <h2 id={headingId}>{cloud.question}</h2>
    <p id={hintId} class="cloud-hint">
      {cloud.hint || t('signalCloud.defaultHint')}
    </p>
  </div>

  <div class="options" role="group" aria-labelledby={headingId} aria-describedby={hintId}>
    {#each cloud.options as option}
      {@const isSelected = selectedOptionId === option.id}

      <button
        type="button"
        class:selected={isSelected}
        aria-pressed={isSelected}
        aria-label={t('signalCloud.chooseOption', { label: option.label })}
        on:click={() => choose(option.id)}
      >
        <span>{option.label}</span>

        {#if isSelected}
          <span class="selected-mark" aria-hidden="true">✓</span>
        {/if}
      </button>
    {/each}
  </div>

  <p class="selection-status" aria-live="polite">{selectionMessage}</p>
</section>

<style>
  .signal-cloud {
    border: 1px solid color-mix(in srgb, var(--site-accent-color, #8c3a44) 55%, black);
    border-radius: 1rem;
    padding: 1rem;
    background: color-mix(in srgb, var(--site-accent-color, #8c3a44) 62%, black);
    color: #fff;
    min-width: 0;
  }

  .cloud-header {
    display: grid;
    gap: 0.5rem;
    margin-bottom: 1rem;
  }

  h2 {
    margin: 0;
    font-size: clamp(1.25rem, 2.8vw, 1.5rem);
    font-weight: 700;
    line-height: 1.25;
  }

  .cloud-hint {
    margin: 0;
    color: color-mix(in srgb, white 72%, var(--site-accent-color, #8c3a44));
    font-size: clamp(1rem, 2.2vw, 1.12rem);
    line-height: 1.45;
  }

  .options {
    display: flex;
    flex-wrap: wrap;
    gap: 0.55rem;
  }

  button {
    display: inline-flex;
    align-items: center;
    gap: 0.45rem;
    max-width: 100%;
    border: 1px solid color-mix(in srgb, var(--site-accent-color, #8c3a44) 78%, black);
    border-radius: 999px;
    padding: 0.55rem 0.85rem;
    background: var(--site-accent-color, #8c3a44);
    color: #fff;
    cursor: pointer;
    font: inherit;
    line-height: 1.35;
    text-align: left;
    white-space: normal;
  }

  button > span:first-child {
    min-width: 0;
    overflow-wrap: anywhere;
  }

  button:hover {
    border-color: color-mix(in srgb, white 28%, var(--site-accent-color, #8c3a44));
    background: color-mix(in srgb, var(--site-accent-color, #8c3a44) 82%, white);
  }

  button:focus-visible {
    outline: 3px solid color-mix(in srgb, white 45%, transparent);
    outline-offset: 3px;
  }

  button.selected {
    border-color: #fff;
    background: color-mix(in srgb, var(--site-text-color, #e8e0d4) 94%, white);
    color: var(--site-base-color, #0f0e0d);
    font-weight: 700;
  }

  .selected-mark {
    display: inline-grid;
    place-items: center;
    flex-shrink: 0;
    width: 1.15rem;
    height: 1.15rem;
    border-radius: 999px;
    background: color-mix(in srgb, var(--site-accent-color, #8c3a44) 72%, black);
    color: #fff;
    font-size: 0.8rem;
    line-height: 1;
  }

  .selection-status {
    margin: 0.85rem 0 0;
    color: color-mix(in srgb, white 72%, var(--site-accent-color, #8c3a44));
    font-size: 0.9rem;
  }
</style>
