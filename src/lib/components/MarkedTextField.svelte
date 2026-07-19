<script>
  import { untrack } from 'svelte';
  import { useI18n } from '$lib/i18n/context.js';
  import {
    EDITORIAL_MARK_TAGS,
    parseEditorialMarkup
  } from '$lib/editorial-markup.js';
  import { FONT_PRESET_IDS } from '$lib/site-typography.js';
  import { notifyMarkedTextEdit, transformMarkedTextSelection } from '$lib/marked-text.js';
  import EditorialText from '$lib/components/EditorialText.svelte';

  /** @type {{ name: string, hint?: string, value?: string, rows?: number, multiline?: boolean, disabled?: boolean, required?: boolean, placeholder?: string, onvaluechange?: (name: string, value: string) => void }} */
  let {
    name,
    hint = '',
    value = '',
    rows = 3,
    multiline = false,
    disabled = false,
    required = false,
    placeholder = '',
    onvaluechange
  } = $props();

  const t = useI18n();
  const feedbackId = $props.id();

  let draft = $state(untrack(() => value));
  /** @type {HTMLTextAreaElement | HTMLInputElement | null} */
  let field = $state(null);
  let selectionStart = $state(0);
  let selectionEnd = $state(0);
  let feedbackKey = $state('studio.editorial.feedback.selectionRequired');

  $effect(() => {
    draft = value;
  });

  $effect(() => {
    onvaluechange?.(name, draft);
  });

  const preview = $derived(parseEditorialMarkup(draft));
  const previewParagraphs = $derived(
    multiline
      ? draft.trim().split(/\n\s*\n/).map((paragraph) => paragraph.trim()).filter(Boolean)
      : [draft]
  );

  /** @param {boolean} preserveFeedback */
  function updateSelection(preserveFeedback = false) {
    if (!field) return;
    selectionStart = field.selectionStart ?? 0;
    selectionEnd = field.selectionEnd ?? selectionStart;
    if (!preserveFeedback) {
      feedbackKey = selectionStart === selectionEnd
        ? 'studio.editorial.feedback.selectionRequired'
        : '';
    }
  }

  /** @param {string | 'remove'} command */
  function editSelection(command) {
    if (!field) {
      return;
    }
    updateSelection();
    const edit = transformMarkedTextSelection(draft, selectionStart, selectionEnd, command);
    feedbackKey = `studio.editorial.feedback.${edit.status}`;
    if (edit.changed) {
      draft = edit.value;
      notifyMarkedTextEdit(field, edit.value);
    }

    queueMicrotask(() => {
      if (!field) {
        return;
      }

      field.focus();
      field.setSelectionRange(edit.selectionStart, edit.selectionEnd);
      updateSelection(true);
    });
  }

  /** @param {Event & { currentTarget: HTMLSelectElement }} event */
  function applyFont(event) {
    const preset = event.currentTarget.value;
    if (!preset) return;
    editSelection(`font:${preset}`);
    event.currentTarget.value = '';
  }
</script>

<div class="editorial-field">
  <div class="toolbar" role="group" aria-label={t('studio.editorial.toolbar')}>
    {#each EDITORIAL_MARK_TAGS as tag (tag)}
      <button
        type="button"
        class="toolbar-button"
        aria-label={t(`studio.editorial.tags.${tag}`)}
        disabled={disabled || selectionStart === selectionEnd}
        onclick={() => editSelection(tag)}
      >
        {t(`studio.editorial.tags.${tag}`)}
      </button>
    {/each}
    <select class="toolbar-select" aria-label={t('studio.editorial.inlineFont')} disabled={disabled || selectionStart === selectionEnd} onchange={applyFont}>
      <option value="">{t('studio.editorial.inlineFont')}</option>
      {#each FONT_PRESET_IDS as preset (preset)}
        <option value={preset}>{t(`presets.font.${preset}`)}</option>
      {/each}
    </select>
    <button
      type="button"
      class="toolbar-button"
      aria-label={t('studio.editorial.remove')}
      disabled={disabled || selectionStart === selectionEnd}
      onclick={() => editSelection('remove')}
    >{t('studio.editorial.remove')}</button>
  </div>

  {#if multiline}
    <textarea {name} bind:this={field} bind:value={draft} {rows} {disabled} {required} {placeholder} aria-describedby={feedbackId} onselect={() => updateSelection()} onkeyup={() => updateSelection()} onclick={() => updateSelection()}></textarea>
  {:else}
    <input {name} bind:this={field} bind:value={draft} {disabled} {required} {placeholder} aria-describedby={feedbackId} onselect={() => updateSelection()} onkeyup={() => updateSelection()} onclick={() => updateSelection()} />
  {/if}

  <span id={feedbackId} class="toolbar-feedback" role="status" aria-live="polite">{feedbackKey ? t(feedbackKey) : ''}</span>

  {#if hint}
    <span class="hint">{hint}</span>
  {/if}

  {#if draft.trim()}
    <div class="preview-panel" aria-live="polite">
      <p class="preview-label">{t('studio.editorial.preview')}</p>
      {#if preview.ok}
        {#each previewParagraphs as paragraph}
          <EditorialText value={paragraph} tag="p" class="editorial-preview" />
        {/each}
      {:else}
        <p class="preview-error">{preview.errors.join(' ')}</p>
      {/if}
    </div>
  {/if}
</div>

<style>
  .editorial-field {
    display: grid;
    gap: 0.65rem;
  }

  .toolbar {
    display: flex;
    flex-wrap: wrap;
    gap: 0.4rem;
  }

  .toolbar-button {
    border: 1px solid color-mix(in srgb, var(--studio-border, #c8d0e0) 85%, transparent);
    border-radius: 999px;
    padding: 0.2rem 0.65rem;
    background: color-mix(in srgb, var(--studio-panel-bg, #f7f9fc) 88%, white);
    color: var(--studio-text, #1f2937);
    font: inherit;
    font-size: 0.82rem;
    cursor: pointer;
  }

  .toolbar-button:not(:disabled):hover {
    background: color-mix(in srgb, var(--studio-accent, #4f6f8f) 12%, white);
  }

  .toolbar-select {
    max-width: 15rem;
    border: 1px solid color-mix(in srgb, var(--studio-border, #c8d0e0) 85%, transparent);
    border-radius: 999px;
    padding: 0.2rem 0.65rem;
    background: color-mix(in srgb, var(--studio-panel-bg, #f7f9fc) 88%, white);
    color: var(--studio-text, #1f2937);
    font: inherit;
    font-size: 0.82rem;
  }

  .toolbar-button:disabled,
  .toolbar-select:disabled {
    cursor: default;
    opacity: 0.5;
  }

  .toolbar-feedback {
    color: var(--studio-muted, #5b6472);
    font-size: 0.82rem;
  }

  .preview-panel {
    padding: 0.75rem 0.85rem;
    border: 1px dashed color-mix(in srgb, var(--studio-border, #c8d0e0) 80%, transparent);
    border-radius: 0.65rem;
    background: color-mix(in srgb, var(--studio-panel-bg, #f7f9fc) 70%, white);
  }

  .preview-label {
    margin: 0 0 0.45rem;
    font-size: 0.82rem;
    color: var(--studio-muted, #5b6472);
  }

  .preview-error {
    margin: 0;
    color: #9f1239;
    font-size: 0.9rem;
  }

  :global(.editorial-preview) {
    margin: 0;
    font-size: 1rem;
    line-height: 1.45;
  }
</style>
