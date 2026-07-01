<script>
  import { onMount } from 'svelte';

  /** @typedef {{ id: string, title: string }} BriefItem */
  /** @typedef {{ id: string, label: string }} SignalOption */
  /** @typedef {{ id: string, question: string, options: SignalOption[] }} SignalCloud */
  /** @typedef {{ question: string, label: string }} VisitorAnswer */

  /** @type {BriefItem} */
  export let item;

  /** @type {SignalCloud[]} */
  export let signalClouds = [];

  /** @type {VisitorAnswer[]} */
  let selectedAnswers = [];

  let copyStatus = '';
  let currentUrl = '';

  $: briefText = buildBrief(item, selectedAnswers, currentUrl);
  $: hasSelections = selectedAnswers.length > 0;

  /**
   * @param {SignalCloud} cloud
   * @returns {string}
   */
  function storageKey(cloud) {
    return `atelier-kit:signals:${item.id}:${cloud.id}`;
  }

  function readSelections() {
    /** @type {VisitorAnswer[]} */
    const answers = [];

    for (const cloud of signalClouds) {
      const savedOptionId = localStorage.getItem(storageKey(cloud));
      const option = cloud.options.find((candidate) => candidate.id === savedOptionId);

      if (option) {
        answers.push({
          question: cloud.question,
          label: option.label
        });
      }
    }

    selectedAnswers = answers;
  }

  /**
   * @param {Event} event
   */
  function handleSignalChange(event) {
    const customEvent = /** @type {CustomEvent<{ itemId?: string }>} */ (event);

    if (customEvent.detail?.itemId === item.id) {
      readSelections();
    }
  }

  onMount(() => {
    currentUrl = window.location.href;
    readSelections();

    window.addEventListener('atelier-kit:signal-change', handleSignalChange);

    return () => {
      window.removeEventListener('atelier-kit:signal-change', handleSignalChange);
    };
  });

  /**
   * @param {BriefItem} item
   * @param {VisitorAnswer[]} answers
   * @param {string} itemUrl
   * @returns {string}
   */
  function buildBrief(item, answers, itemUrl) {
    const lines = [`I am interested in "${item.title}".`, ''];

    if (answers.length > 0) {
      lines.push('My impressions:');

      for (const answer of answers) {
        lines.push(`- ${answer.question}: ${answer.label}`);
      }
    } else {
      lines.push('My impressions: no Signal Cloud selections yet.');
    }

    if (itemUrl) {
      lines.push('', `Item page: ${itemUrl}`);
    }

    return lines.join('\n');
  }

  async function copyBrief() {
    try {
      if (!navigator.clipboard?.writeText) {
        throw new Error('Clipboard API not available.');
      }

      await navigator.clipboard.writeText(briefText);
      copyStatus = 'Visitor brief copied.';
    } catch {
      copyStatus = 'Could not copy automatically. Select and copy the brief manually.';
    }
  }
</script>

<section class="visitor-brief" aria-labelledby="visitor-brief-heading">
  <div class="brief-header">
    <h2 id="visitor-brief-heading">Visitor Brief</h2>
    <p>
      Copy a short note based on your Signal Cloud selections and paste it into your preferred contact channel.
    </p>
  </div>

  {#if !hasSelections}
    <p class="empty-state">
      Select one or more Signal Cloud answers above to make this brief more useful.
    </p>
  {/if}

  <pre tabindex="0">{briefText}</pre>

  <button type="button" on:click={copyBrief}>Copy visitor brief</button>

  {#if copyStatus}
    <p class="copy-status" aria-live="polite">{copyStatus}</p>
  {/if}
</section>

<style>
  .visitor-brief {
    display: grid;
    gap: 0.85rem;
    border: 1px solid rgba(20, 20, 20, 0.12);
    border-radius: 1rem;
    padding: 1rem;
    background: rgba(255, 255, 255, 0.72);
  }

  .brief-header {
    display: grid;
    gap: 0.35rem;
  }

  h2,
  p {
    margin: 0;
  }

  h2 {
    font-size: 1.15rem;
  }

  .brief-header p,
  .empty-state,
  .copy-status {
    color: rgba(20, 20, 20, 0.66);
    font-size: 0.9rem;
    line-height: 1.45;
  }

  pre {
    overflow: auto;
    margin: 0;
    border: 1px solid rgba(20, 20, 20, 0.12);
    border-radius: 0.75rem;
    padding: 0.85rem;
    background: rgba(255, 255, 255, 0.86);
    color: rgba(20, 20, 20, 0.82);
    font: inherit;
    line-height: 1.5;
    white-space: pre-wrap;
  }

  pre:focus-visible {
    outline: 3px solid rgba(20, 20, 20, 0.35);
    outline-offset: 3px;
  }

  button {
    width: fit-content;
    border: 1px solid rgba(20, 20, 20, 0.18);
    border-radius: 999px;
    padding: 0.6rem 0.9rem;
    background: rgba(20, 20, 20, 0.86);
    color: white;
    cursor: pointer;
    font: inherit;
    font-weight: 700;
  }

  button:hover {
    background: rgba(20, 20, 20, 0.74);
  }

  button:focus-visible {
    outline: 3px solid rgba(20, 20, 20, 0.35);
    outline-offset: 3px;
  }
</style>
