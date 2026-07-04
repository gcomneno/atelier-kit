<script>
  import { onMount } from 'svelte';

  /** @typedef {{ id: string, title: string }} BriefItem */
  /** @typedef {{ id: string, label: string }} SignalOption */
  /** @typedef {{ id: string, question: string, options: SignalOption[] }} SignalCloud */
  /** @typedef {{ question: string, label: string }} VisitorAnswer */
  /** @typedef {{ enabled: boolean, label: string, address: string, subject_prefix: string }} EmailContact */
  /** @typedef {{ enabled: boolean, label: string, phone: string }} WhatsAppContact */
  /** @typedef {{ email?: EmailContact, whatsapp?: WhatsAppContact }} ContactConfig */

  /** @type {BriefItem} */
  export let item;

  /** @type {SignalCloud[]} */
  export let signalClouds = [];

  /** @type {ContactConfig} */
  export let contact = {};

  /** @type {VisitorAnswer[]} */
  let selectedAnswers = [];

  let copyStatus = '';
  let currentUrl = '';

  $: briefText = buildBrief(item, selectedAnswers, currentUrl);
  $: hasSelections = selectedAnswers.length > 0;
  $: emailHref = buildEmailHref(contact.email, item, briefText);
  $: whatsappHref = buildWhatsAppHref(contact.whatsapp, briefText);

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

  /**
   * @param {EmailContact | undefined} email
   * @param {BriefItem} item
   * @param {string} briefText
   * @returns {string}
   */
  function buildEmailHref(email, item, briefText) {
    if (!email?.enabled || !email.address) {
      return '';
    }

    const subjectPrefix = email.subject_prefix || 'Interest in';
    const subject = `${subjectPrefix} "${item.title}"`;

    return `mailto:${encodeURIComponent(email.address)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(briefText)}`;
  }

  /**
   * @param {WhatsAppContact | undefined} whatsapp
   * @param {string} briefText
   * @returns {string}
   */
  function buildWhatsAppHref(whatsapp, briefText) {
    if (!whatsapp?.enabled || !whatsapp.phone) {
      return '';
    }

    const phone = whatsapp.phone.replace(/[^0-9]/g, '');

    if (!phone) {
      return '';
    }

    return `https://wa.me/${phone}?text=${encodeURIComponent(briefText)}`;
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
    <p class="eyebrow">Contact without a form</p>
    <h2 id="visitor-brief-heading">Write with a ready message</h2>
    <p>
      Choose Signal Cloud answers above, then copy this brief or open email / WhatsApp with the text already prepared.
    </p>
  </div>

  {#if !hasSelections}
    <p class="empty-state">
      Select one or more Signal Cloud answers above to make this brief more useful.
    </p>
  {/if}

  <pre>{briefText}</pre>

  <div class="brief-actions" aria-label="Visitor Brief actions">
    <button type="button" on:click={copyBrief}>Copy visitor brief</button>

    {#if emailHref}
      <a class="action-link" href={emailHref}>{contact.email?.label || 'Email this brief'}</a>
    {/if}

    {#if whatsappHref}
      <a class="action-link" href={whatsappHref} target="_blank" rel="noreferrer">
        {contact.whatsapp?.label || 'WhatsApp this brief'}
      </a>
    {/if}
  </div>

  {#if copyStatus}
    <p class="copy-status" aria-live="polite">{copyStatus}</p>
  {/if}
</section>

<style>
  .visitor-brief {
    display: grid;
    gap: 0.85rem;
    border: 2px solid rgb(47 40 31 / 0.18);
    border-radius: 1rem;
    padding: 1.1rem;
    background: linear-gradient(180deg, rgb(255 250 242 / 0.95), rgb(255 255 255 / 0.82));
    box-shadow: 0 16px 40px rgb(36 27 18 / 0.08);
  }

  .eyebrow {
    margin: 0;
    color: rgba(20, 20, 20, 0.55);
    font-size: 0.75rem;
    font-weight: 800;
    letter-spacing: 0.12em;
    text-transform: uppercase;
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

  .brief-actions {
    display: flex;
    flex-wrap: wrap;
    gap: 0.6rem;
  }

  button,
  .action-link {
    display: inline-flex;
    align-items: center;
    width: fit-content;
    border: 1px solid rgba(20, 20, 20, 0.18);
    border-radius: 999px;
    padding: 0.6rem 0.9rem;
    cursor: pointer;
    font: inherit;
    font-weight: 700;
    line-height: 1;
    text-decoration: none;
  }

  button {
    background: rgba(20, 20, 20, 0.86);
    color: white;
  }

  .action-link {
    background: rgba(255, 255, 255, 0.86);
    color: rgba(20, 20, 20, 0.86);
  }

  button:hover {
    background: rgba(20, 20, 20, 0.74);
  }

  .action-link:hover {
    border-color: rgba(20, 20, 20, 0.42);
  }

  button:focus-visible,
  .action-link:focus-visible {
    outline: 3px solid rgba(20, 20, 20, 0.35);
    outline-offset: 3px;
  }
</style>
