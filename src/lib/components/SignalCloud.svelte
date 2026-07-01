<script>
  import { onMount } from 'svelte';

  /**
   * @typedef {{ id: string, label: string }} SignalOption
   * @typedef {{ id: string, question: string, options: SignalOption[] }} SignalCloud
   */

  /** @type {string} */
  export let itemId;

  /** @type {SignalCloud} */
  export let cloud;

  /** @type {string | null} */
  let selectedOptionId = null;

  $: storageKey = `atelier-kit:signals:${itemId}:${cloud.id}`;
  $: headingId = `signal-cloud-${itemId}-${cloud.id}-heading`;
  $: hintId = `signal-cloud-${itemId}-${cloud.id}-hint`;
  $: selectedOption = cloud.options.find((option) => option.id === selectedOptionId);
  $: selectionMessage = selectedOption
    ? `Selected: ${selectedOption.label}`
    : 'No option selected yet.';

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
      Single choice. Pick one option; choosing another replaces the previous local selection.
    </p>
  </div>

  <div class="options" role="group" aria-labelledby={headingId} aria-describedby={hintId}>
    {#each cloud.options as option}
      {@const isSelected = selectedOptionId === option.id}

      <button
        type="button"
        class:selected={isSelected}
        aria-pressed={isSelected}
        aria-label={`Choose ${option.label}`}
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
    border: 1px solid rgba(20, 20, 20, 0.12);
    border-radius: 1rem;
    padding: 1rem;
    background: rgba(255, 255, 255, 0.72);
  }

  .cloud-header {
    display: grid;
    gap: 0.35rem;
    margin-bottom: 0.85rem;
  }

  h2 {
    margin: 0;
    font-size: 1rem;
  }

  .cloud-hint {
    margin: 0;
    color: rgba(20, 20, 20, 0.66);
    font-size: 0.9rem;
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
    border: 1px solid rgba(20, 20, 20, 0.18);
    border-radius: 999px;
    padding: 0.55rem 0.85rem;
    background: rgba(255, 255, 255, 0.9);
    color: inherit;
    cursor: pointer;
    font: inherit;
    line-height: 1;
  }

  button:hover {
    border-color: rgba(20, 20, 20, 0.42);
  }

  button:focus-visible {
    outline: 3px solid rgba(20, 20, 20, 0.35);
    outline-offset: 3px;
  }

  button.selected {
    border-color: rgba(20, 20, 20, 0.75);
    background: rgba(20, 20, 20, 0.08);
    font-weight: 700;
  }

  .selected-mark {
    display: inline-grid;
    place-items: center;
    width: 1.15rem;
    height: 1.15rem;
    border-radius: 999px;
    background: rgba(20, 20, 20, 0.86);
    color: white;
    font-size: 0.8rem;
    line-height: 1;
  }

  .selection-status {
    margin: 0.85rem 0 0;
    color: rgba(20, 20, 20, 0.66);
    font-size: 0.9rem;
  }
</style>
