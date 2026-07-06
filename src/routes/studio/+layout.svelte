<script>
  import { setI18nContext } from '$lib/i18n/context.js';
  import { useI18n } from '$lib/i18n/context.js';
  import StudioNav from '$lib/components/StudioNav.svelte';

  let { data, children } = $props();

  setI18nContext(() => data.locale);

  const t = useI18n();
</script>

<div class="studio-shell">
  <aside class="studio-sidebar">
    <p class="eyebrow">{t('studio.layout.eyebrow')}</p>
    <h1>{t('studio.layout.title')}</h1>
    <StudioNav />
  </aside>

  <main class="studio-content">
    {@render children()}
  </main>
</div>

<style>
  .studio-shell {
    width: min(1100px, calc(100% - 2rem));
    margin: 0 auto;
    padding: 2rem 0 3rem;
    display: flex;
    align-items: flex-start;
    gap: 1.5rem;
  }

  .studio-sidebar {
    position: sticky;
    top: 1rem;
    flex: 0 0 240px;
    max-height: calc(100vh - 2rem);
    overflow: auto;
    padding: 1rem;
    border: 1px solid var(--studio-border);
    border-radius: 1rem;
    background: var(--studio-surface);
    box-shadow: var(--studio-shadow);
  }

  .eyebrow {
    margin: 0 0 0.4rem;
    color: var(--studio-muted);
    font-size: 0.76rem;
    font-weight: 700;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }

  h1 {
    margin: 0 0 1rem;
    font-size: 1.4rem;
    font-weight: 600;
  }

  .studio-content {
    min-width: 0;
    flex: 1;
    display: grid;
    align-content: start;
    gap: 1rem;
  }

  @media (max-width: 920px) {
    .studio-shell {
      flex-direction: column;
    }

    .studio-sidebar {
      position: static;
      max-height: none;
      width: 100%;
      flex-basis: auto;
    }
  }

  :global(.studio-intro) {
    margin: 0 0 1.25rem;
    color: var(--studio-muted);
    line-height: 1.65;
  }

  :global(.studio-panel) {
    padding: 1.35rem;
    border: 1px solid var(--studio-border);
    border-radius: 0.9rem;
    background: var(--studio-surface);
    box-shadow: var(--studio-shadow);
  }

  :global(.studio-panel + .studio-panel) {
    margin-top: 1rem;
  }

  :global(.studio-panel h2) {
    margin: 0 0 0.4rem;
    font-size: 1.15rem;
  }

  :global(.studio-panel .panel-heading p) {
    margin: 0 0 1rem;
    color: var(--studio-muted);
  }

  :global(.studio-panel form),
  :global(.studio-panel .studio-form),
  :global(.studio-panel .appearance-form) {
    display: grid;
    gap: 0.95rem;
  }

  :global(.studio-panel fieldset) {
    margin: 0;
    padding: 0;
    border: 0;
    display: grid;
    gap: 0.95rem;
  }

  :global(.studio-panel legend) {
    margin-bottom: 0.25rem;
    font-weight: 600;
  }

  :global(.studio-panel label) {
    display: grid;
    gap: 0.4rem;
    font-size: 0.95rem;
    color: var(--studio-text);
  }

  :global(.studio-panel .checkbox) {
    grid-template-columns: auto 1fr;
    align-items: center;
    gap: 0.65rem;
  }

  :global(.studio-panel .hint) {
    color: var(--studio-muted);
    font-size: 0.85rem;
  }

  :global(.studio-panel input),
  :global(.studio-panel textarea),
  :global(.studio-panel select) {
    width: 100%;
    border: 1px solid var(--studio-border);
    border-radius: 0.65rem;
    padding: 0.7rem 0.8rem;
    background: #fff;
    color: var(--studio-text);
    font: inherit;
  }

  :global(.studio-panel input:disabled:not([type='checkbox'])),
  :global(.studio-panel textarea:disabled),
  :global(.studio-panel select:disabled) {
    background: #eef1f4;
    color: #6b7280;
    cursor: not-allowed;
  }

  :global(.studio-panel label:has(> input:disabled:not([type='checkbox']))),
  :global(.studio-panel label:has(> textarea:disabled)) {
    opacity: 0.72;
  }

  :global(.studio-panel textarea) {
    resize: vertical;
  }

  :global(.studio-panel .actions) {
    display: flex;
    justify-content: flex-start;
  }

  :global(.studio-panel button) {
    border: 0;
    border-radius: 999px;
    padding: 0.7rem 1.15rem;
    background: var(--studio-accent);
    color: #fff;
    font: inherit;
    font-weight: 600;
    cursor: pointer;
  }

  :global(.studio-panel button:disabled) {
    opacity: 0.45;
    cursor: not-allowed;
  }

  :global(.studio-panel .status) {
    margin: 0;
    padding: 0.85rem 1rem;
    border-radius: 0.75rem;
    white-space: pre-wrap;
    line-height: 1.5;
  }

  :global(.studio-panel .status.success) {
    background: rgb(32 142 88 / 0.12);
    color: #176742;
  }

  :global(.studio-panel .status.warning) {
    background: rgb(214 155 35 / 0.15);
    color: #6b4b0a;
  }

  :global(.studio-panel .status.error) {
    background: rgb(191 56 56 / 0.12);
    color: #7f2222;
  }
</style>
