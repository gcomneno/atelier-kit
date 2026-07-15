<script>
  import { untrack } from 'svelte';
  import { useI18n } from '$lib/i18n/context.js';
  import {
    EDITORIAL_MARK_TAGS,
    parseEditorialMarkup
  } from '$lib/editorial-markup.js';
  import { FONT_PRESET_IDS } from '$lib/site-typography.js';
  import { notifyMarkedTextEdit, wrapMarkedTextSelection } from '$lib/marked-text.js';
  import EditorialText from '$lib/components/EditorialText.svelte';

  /** @type {{ name: string, hint?: string, value?: string, rows?: number, multiline?: boolean, disabled?: boolean, required?: boolean, placeholder?: string, display?: { wrap?: string, quote_color?: string } | null, showEpigraphControls?: boolean, onvaluechange?: (name: string, value: string) => void }} */
  let {
    name,
    hint = '',
    value = '',
    rows = 3,
    multiline = false,
    disabled = false,
    required = false,
    placeholder = '',
    display = null,
    showEpigraphControls = false,
    onvaluechange
  } = $props();

  const t = useI18n();

  let draft = $state(untrack(() => value));
  /** @type {HTMLTextAreaElement | HTMLInputElement | null} */
  let field = $state(null);

  let wrapDraft = $state(untrack(() => display?.wrap ?? 'none'));
  let quoteColorDraft = $state(untrack(() => display?.quote_color ?? 'text'));

  $effect(() => {
    draft = value;
    wrapDraft = display?.wrap ?? 'none';
    quoteColorDraft = display?.quote_color ?? 'text';
  });

  $effect(() => {
    onvaluechange?.(name, draft);
  });

  const previewDisplay = $derived(
    showEpigraphControls
      ? {
          wrap: wrapDraft,
          quote_color: quoteColorDraft
        }
      : display
  );

  const preview = $derived(parseEditorialMarkup(draft));
  const previewParagraphs = $derived(
    multiline
      ? draft.trim().split(/\n\s*\n/).map((paragraph) => paragraph.trim()).filter(Boolean)
      : [draft]
  );
  const previewClass = $derived(showEpigraphControls ? 'tagline hero-epigraph' : 'editorial-preview');

  /** @param {string} tag */
  function wrapSelection(tag) {
    if (!field) {
      return;
    }

    const start = field.selectionStart ?? draft.length;
    const end = field.selectionEnd ?? draft.length;
    const edit = wrapMarkedTextSelection(draft, start, end, tag);
    draft = edit.value;
    notifyMarkedTextEdit(field, edit.value);

    queueMicrotask(() => {
      if (!field) {
        return;
      }

      field.focus();
      field.setSelectionRange(edit.cursor, edit.cursor);
    });
  }

  /** @param {Event & { currentTarget: HTMLSelectElement }} event */
  function applyFont(event) {
    const preset = event.currentTarget.value;
    if (!preset) return;
    wrapSelection(`font:${preset}`);
    event.currentTarget.value = '';
  }
</script>

<div class="editorial-field">
  <div class="toolbar" role="toolbar" aria-label={t('studio.editorial.toolbar')}>
    {#each EDITORIAL_MARK_TAGS as tag (tag)}
      <button type="button" class="toolbar-button" onclick={() => wrapSelection(tag)}>
        {t(`studio.editorial.tags.${tag}`)}
      </button>
    {/each}
    <select class="toolbar-select" aria-label={t('studio.editorial.inlineFont')} onchange={applyFont}>
      <option value="">{t('studio.editorial.inlineFont')}</option>
      {#each FONT_PRESET_IDS as preset (preset)}
        <option value={preset}>{t(`presets.font.${preset}`)}</option>
      {/each}
    </select>
  </div>

  {#if multiline}
    <textarea {name} bind:this={field} bind:value={draft} {rows} {disabled} {required} {placeholder}></textarea>
  {:else}
    <input {name} bind:this={field} bind:value={draft} {disabled} {required} {placeholder} />
  {/if}

  {#if showEpigraphControls}
    <div class="epigraph-controls">
      <label>
        {t('studio.editorial.taglineWrap')}
        <select name="tagline_display_wrap" bind:value={wrapDraft}>
          <option value="none">{t('studio.editorial.taglineWrapNone')}</option>
          <option value="epigraph">{t('studio.editorial.taglineWrapEpigraph')}</option>
        </select>
      </label>

      <label>
        {t('studio.editorial.quoteColor')}
        <select name="tagline_display_quote_color" bind:value={quoteColorDraft}>
          <option value="text">{t('studio.editorial.quoteColorText')}</option>
          <option value="accent">{t('studio.editorial.quoteColorAccent')}</option>
          <option value="heading">{t('studio.editorial.quoteColorHeading')}</option>
          <option value="intro">{t('studio.editorial.quoteColorIntro')}</option>
        </select>
      </label>
    </div>
  {/if}

  {#if hint}
    <span class="hint">{hint}</span>
  {/if}

  {#if draft.trim()}
    <div class="preview-panel" aria-live="polite">
      <p class="preview-label">{t('studio.editorial.preview')}</p>
      {#if preview.ok}
        {#each previewParagraphs as paragraph}
          <EditorialText value={paragraph} display={previewDisplay} tag="p" class={previewClass} />
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

  .toolbar-button:hover {
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

  .epigraph-controls {
    display: grid;
    gap: 0.65rem;
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
