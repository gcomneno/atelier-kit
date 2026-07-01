<script>
  import { browser } from '$app/environment';

  let { itemId, cloud } = $props();

  let selectedOptionId = $state(/** @type {string | null} */ (null));
  let saved = $state(false);
  let storageKey = $derived(`atelier-kit:signals:${itemId}:${cloud.id}`);

  $effect(() => {
    if (!browser) {
      return;
    }

    selectedOptionId = localStorage.getItem(storageKey);
  });

  /**
   * @param {string} optionId
   */
  function choose(optionId) {
    selectedOptionId = optionId;
    saved = true;

    if (browser) {
      localStorage.setItem(storageKey, optionId);
    }

    window.setTimeout(() => {
      saved = false;
    }, 1200);
  }
</script>

<section class="signal-cloud" aria-labelledby={`${cloud.id}-title`}>
  <div class="heading">
    <h2 id={`${cloud.id}-title`}>{cloud.question}</h2>

    {#if cloud.hint}
      <p>{cloud.hint}</p>
    {/if}
  </div>

  <div class="cloud" role="list">
    {#each cloud.options as option}
      <button
        type="button"
        class:selected={selectedOptionId === option.id}
        onclick={() => choose(option.id)}
      >
        {option.label}
      </button>
    {/each}
  </div>

  <p class="meta">
    {#if selectedOptionId}
      Your current signal is saved in this browser.
      {#if saved}
        <span>Saved.</span>
      {/if}
    {:else}
      Choose one signal. You can change it later.
    {/if}
  </p>
</section>

<style>
  .signal-cloud {
    padding: 1.3rem;
    background: #fffaf2;
    border: 1px solid #e5d8c5;
    border-radius: 26px;
  }

  .heading {
    max-width: 42rem;
  }

  h2 {
    margin: 0;
    font-size: clamp(1.25rem, 3vw, 1.65rem);
  }

  p {
    margin: 0.4rem 0 0;
    color: #725f4a;
    line-height: 1.55;
  }

  .cloud {
    display: flex;
    flex-wrap: wrap;
    gap: 0.7rem;
    margin-top: 1.2rem;
  }

  button {
    border: 1px solid #d6c1a7;
    border-radius: 999px;
    padding: 0.65rem 1rem;
    color: #3b3027;
    background: #fff;
    font: inherit;
    cursor: pointer;
    transition:
      transform 140ms ease,
      border-color 140ms ease,
      background 140ms ease;
  }

  button:hover {
    transform: translateY(-2px);
    border-color: #aa835b;
  }

  button.selected {
    border-color: #6b4b2f;
    color: #fffaf2;
    background: #6b4b2f;
  }

  .meta {
    margin-top: 1rem;
    color: #7b6a58;
    font-size: 0.9rem;
  }

  .meta span {
    margin-left: 0.35rem;
    color: #4f6f3c;
    font-weight: 700;
  }
</style>
