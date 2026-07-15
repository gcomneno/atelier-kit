<script>
  import { onMount } from 'svelte';
  import { useVisitorI18n } from '$lib/i18n/visitor-context.js';
  import { markedTextToPlainText } from '$lib/marked-text.js';
  import { copyBriefAndOpenSocial } from '$lib/visitor-brief.js';

  /** @typedef {{ id: string, title: string }} BriefItem */
  /** @typedef {{ id: string, label: string }} SignalOption */
  /** @typedef {{ id: string, question: string, options: SignalOption[] }} SignalCloud */
  /** @typedef {{ question: string, label: string }} VisitorAnswer */
  /** @typedef {{ enabled: boolean, label: string, address: string, subject_prefix: string }} EmailContact */
  /** @typedef {{ enabled: boolean, label: string, phone: string }} WhatsAppContact */
  /** @typedef {{ email?: EmailContact, whatsapp?: WhatsAppContact }} ContactConfig */
  /** @typedef {{ id: 'instagram' | 'facebook', url: string }} SocialProfile */

  /** @type {BriefItem} */
  export let item;

  /** @type {SignalCloud[]} */
  export let signalClouds = [];

  /** @type {ContactConfig} */
  export let contact = {};

  /** @type {SocialProfile[]} */
  export let socialProfiles = [];

  const t = useVisitorI18n();

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
    const lines = [t('visitorBrief.interestLine', { title: markedTextToPlainText(item.title) }), ''];

    if (answers.length > 0) {
      lines.push(t('visitorBrief.impressionsHeading'));

      for (const answer of answers) {
        lines.push(`- ${markedTextToPlainText(answer.question)}: ${markedTextToPlainText(answer.label)}`);
      }
    } else {
      lines.push(t('visitorBrief.noSelections'));
    }

    if (itemUrl) {
      lines.push('', t('visitorBrief.itemPageLine', { url: itemUrl }));
    }

    return lines.join('\n');
  }

  /**
   * @param {string | undefined} value
   * @param {string} templateDefault
   * @param {string} i18nKey
   */
  function localizedContactLabel(value, templateDefault, i18nKey) {
    const label = typeof value === 'string' ? value.trim() : '';

    if (label === '' || label === templateDefault) {
      return t(i18nKey);
    }

    return label;
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

    const rawPrefix = typeof email.subject_prefix === 'string' ? email.subject_prefix.trim() : '';
    const subjectPrefix =
      rawPrefix === '' || rawPrefix === 'Interest in'
        ? t('visitorBrief.emailSubjectPrefix')
        : rawPrefix;
    const subject = `${subjectPrefix} "${markedTextToPlainText(item.title)}"`;

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
      copyStatus = t('visitorBrief.copySuccess');
    } catch {
      copyStatus = t('visitorBrief.copyError');
    }
  }

  /** @param {SocialProfile} profile */
  async function copyAndOpenSocial(profile) {
    if (!navigator.clipboard?.writeText) {
      copyStatus = t('visitorBrief.copyError');
      return;
    }

    const result = await copyBriefAndOpenSocial({
      text: briefText,
      url: profile.url,
      writeText: (text) => navigator.clipboard.writeText(text),
      openWindow: () => window.open('about:blank', '_blank')
    });

    copyStatus = result === 'opened'
      ? t('visitorBrief.copyAndOpenSuccess')
      : result === 'copy-failed'
        ? t('visitorBrief.copyError')
        : t('visitorBrief.popupError');
  }
</script>

<section class="visitor-brief" aria-labelledby="visitor-brief-heading">
  <div class="brief-header">
    <p class="eyebrow">{t('visitorBrief.contactEyebrow')}</p>
    <h2 id="visitor-brief-heading">{t('visitorBrief.heading')}</h2>
    <p>
      {t('visitorBrief.intro')}
    </p>
  </div>

  {#if !hasSelections}
    <p class="empty-state">
      {t('visitorBrief.emptyState')}
    </p>
  {/if}

  <pre>{briefText}</pre>

  <div class="brief-actions" aria-label={t('visitorBrief.actionsAriaLabel')}>
    <button type="button" on:click={copyBrief}>{t('visitorBrief.copyButton')}</button>

    {#if emailHref}
      <a class="action-link" href={emailHref}>
        {localizedContactLabel(contact.email?.label, 'Email this brief', 'visitorBrief.emailDefault')}
      </a>
    {/if}

    {#if whatsappHref}
      <a class="action-link" href={whatsappHref} target="_blank" rel="noreferrer">
        {localizedContactLabel(
          contact.whatsapp?.label,
          'WhatsApp this brief',
          'visitorBrief.whatsappDefault'
        )}
      </a>
    {/if}

    {#each socialProfiles as profile (profile.id)}
      <button type="button" on:click={() => copyAndOpenSocial(profile)}>
        {profile.id === 'instagram'
          ? t('visitorBrief.copyAndOpenInstagram')
          : t('visitorBrief.copyAndOpenFacebook')}
      </button>
    {/each}
  </div>

  {#if copyStatus}
    <p class="copy-status" role="status" aria-live="polite">{copyStatus}</p>
  {/if}
</section>

<style>
  .visitor-brief {
    display: grid;
    gap: 0.85rem;
    min-width: 0;
    border: 1px solid var(--site-border-color, color-mix(in srgb, var(--site-text-color, #2f281f) 18%, transparent));
    border-radius: 1rem;
    padding: 1.1rem;
    background: var(--site-surface-color, rgb(255 255 255 / 0.72));
    box-shadow: 0 16px 40px color-mix(in srgb, var(--site-base-color, #0f0e0d) 35%, black);
  }

  .eyebrow {
    margin: 0;
    color: color-mix(in srgb, var(--site-text-color, #2f281f) 55%, transparent);
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
    color: color-mix(in srgb, var(--site-text-color, #2f281f) 66%, transparent);
    font-size: 0.9rem;
    line-height: 1.45;
  }

  pre {
    overflow: auto;
    margin: 0;
    border: 1px solid var(--site-border-color, color-mix(in srgb, var(--site-text-color, #2f281f) 12%, transparent));
    border-radius: 0.75rem;
    padding: 0.85rem;
    background: var(--site-card-color, rgb(255 250 242 / 0.88));
    color: color-mix(in srgb, var(--site-text-color, #2f281f) 82%, transparent);
    font: inherit;
    line-height: 1.5;
    white-space: pre-wrap;
  }

  pre:focus-visible {
    outline: 3px solid color-mix(in srgb, var(--site-accent-color, #8c3a44) 45%, transparent);
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
    justify-content: center;
    max-width: 100%;
    border: 1px solid var(--site-border-color, color-mix(in srgb, var(--site-text-color, #2f281f) 18%, transparent));
    border-radius: 999px;
    padding: 0.6rem 0.9rem;
    cursor: pointer;
    font: inherit;
    font-weight: 700;
    line-height: 1.35;
    text-align: center;
    text-decoration: none;
    white-space: normal;
    overflow-wrap: anywhere;
  }

  button {
    background: var(--site-accent-color, #8c3a44);
    border-color: var(--site-accent-color, #8c3a44);
    color: #fff;
  }

  .action-link {
    background: var(--site-card-color, rgb(255 250 242 / 0.88));
    color: inherit;
  }

  button:hover {
    background: color-mix(in srgb, var(--site-accent-color, #8c3a44) 82%, black);
    border-color: color-mix(in srgb, var(--site-accent-color, #8c3a44) 82%, black);
  }

  .action-link:hover {
    border-color: color-mix(in srgb, var(--site-accent-color, #8c3a44) 55%, var(--site-text-color, #2f281f));
  }

  button:focus-visible,
  .action-link:focus-visible {
    outline: 3px solid color-mix(in srgb, var(--site-accent-color, #8c3a44) 45%, transparent);
    outline-offset: 3px;
  }
</style>
