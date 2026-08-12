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
    <h1>
      {t(
        data.demoAuthoring
          ? 'studio.layout.demoTitle'
          : data.hostedAuthoring
            ? 'studio.layout.hostedTitle'
            : 'studio.layout.title'
      )}
    </h1>
    <StudioNav
      hostedAuthoring={data.hostedAuthoring}
      demoAuthoring={data.demoAuthoring}
    />
  </aside>

  <main class="studio-content">
    {@render children()}
  </main>
</div>

<style>
  .studio-shell {
    --giu-button-background: var(--studio-accent);
    --giu-button-hover-background: color-mix(in srgb, var(--studio-accent) 82%, #000);
    --giu-button-active-background: color-mix(in srgb, var(--studio-accent) 68%, #000);
    --giu-button-border-color: transparent;
    --giu-button-border-radius: 999px;
    --giu-button-padding: 0.7rem 1.15rem;
    --giu-button-focus-color: var(--studio-accent);
    --giu-button-disabled-opacity: 0.45;
    --giu-page-intro-margin: 0 0 1.25rem;
    --giu-page-intro-color: var(--studio-muted);
    --giu-page-intro-line-height: 1.65;
    --giu-page-intro-link-color: var(--studio-accent);
    --giu-form-actions-gap: 1rem;

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
    color: var(--studio-eyebrow, var(--studio-accent));
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
    --giu-panel-gap: 1rem;
    --giu-panel-padding: 1.35rem;
    --giu-panel-border-width: 1px;
    --giu-panel-border-color: var(--studio-border);
    --giu-panel-border-radius: 0.9rem;
    --giu-panel-color: var(--studio-text);
    --giu-panel-background: var(--studio-surface);
    --giu-panel-header-gap: 0.75rem;
    --giu-panel-title-size: 1.2rem;
    --giu-panel-description-gap: 0.35rem;
    --giu-panel-description-color: var(--studio-muted);
    --giu-surface-padding: 1.35rem;
    --giu-surface-border-width: 1px;
    --giu-surface-border-color: var(--studio-border);
    --giu-surface-border-radius: 0.9rem;
    --giu-surface-color: var(--studio-text);
    --giu-surface-background: var(--studio-surface);

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


  :global(.atelier-studio-panel),
  :global(.atelier-studio-surface) {
    box-shadow: var(--studio-shadow);
  }

  :global(.atelier-studio-panel .panel-summary) {
    display: grid;
    gap: 0.25rem;
    color: var(--studio-muted);
  }

  :global(.atelier-studio-panel .panel-summary > *) {
    margin: 0;
  }

  :global(.studio-content > :is(.atelier-studio-panel, .atelier-studio-surface) + :is(.atelier-studio-panel, .atelier-studio-surface)) {
    margin-top: 1rem;
  }




  :global(:is(.atelier-studio-panel, .atelier-studio-surface) .create-link) {
    margin: 0;
  }

  :global(:is(.atelier-studio-panel, .atelier-studio-surface) .create-link a) {
    color: var(--studio-accent);
    font-weight: 600;
    text-decoration: none;
  }

  :global(:is(.atelier-studio-panel, .atelier-studio-surface) .create-link a:hover) {
    text-decoration: underline;
  }

  :global(:is(.atelier-studio-panel, .atelier-studio-surface) .empty) {
    margin: 0;
    color: var(--studio-muted);
  }

  :global(:is(.atelier-studio-panel, .atelier-studio-surface) .record-list) {
    list-style: none;
    margin: 0;
    padding: 0;
    display: grid;
    gap: 0.75rem;
  }

  :global(:is(.atelier-studio-panel, .atelier-studio-surface) .record-list a) {
    display: grid;
    gap: 0.2rem;
    padding: 0.9rem 1rem;
    border-radius: 0.75rem;
    background: #fff;
    border: 1px solid var(--studio-border);
    color: inherit;
    text-decoration: none;
  }

  :global(:is(.atelier-studio-panel, .atelier-studio-surface) .record-list a:hover) {
    border-color: color-mix(in srgb, var(--studio-accent) 35%, var(--studio-border));
  }

  :global(:is(.atelier-studio-panel, .atelier-studio-surface) .record-list span) {
    color: var(--studio-muted);
    font-size: 0.9rem;
  }

  :global(:is(.atelier-studio-panel, .atelier-studio-surface) .badge) {
    display: inline-block;
    width: fit-content;
    margin-top: 0.25rem;
    padding: 0.15rem 0.5rem;
    border-radius: 999px;
    background: rgb(45 108 223 / 0.1);
    color: #143870;
    font-size: 0.8rem;
    font-weight: 600;
  }

  :global(:is(.atelier-studio-panel, .atelier-studio-surface) form),
  :global(:is(.atelier-studio-panel, .atelier-studio-surface) .studio-form),
  :global(:is(.atelier-studio-panel, .atelier-studio-surface) .appearance-form) {
    display: grid;
    gap: 0.95rem;
  }

  :global(:is(.atelier-studio-panel, .atelier-studio-surface) fieldset) {
    margin: 0;
    padding: 0;
    border: 0;
    display: grid;
    gap: 0.95rem;
  }

  :global(:is(.atelier-studio-panel, .atelier-studio-surface) legend) {
    margin-bottom: 0.25rem;
    font-weight: 600;
  }

  :global(:is(.atelier-studio-panel, .atelier-studio-surface) label) {
    display: grid;
    gap: 0.4rem;
    font-size: 0.95rem;
    color: var(--studio-text);
  }

  :global(:is(.atelier-studio-panel, .atelier-studio-surface) .checkbox) {
    grid-template-columns: auto 1fr;
    align-items: center;
    gap: 0.65rem;
  }

  :global(:is(.atelier-studio-panel, .atelier-studio-surface) .hint) {
    color: var(--studio-muted);
    font-size: 0.85rem;
  }

  :global(:is(.atelier-studio-panel, .atelier-studio-surface) .form-legend),
  :global(.studio-form .form-legend),
  :global(.panel .form-legend) {
    margin: 0.15rem 0 0;
    color: var(--studio-muted);
    font-size: 0.85rem;
    line-height: 1.5;
    text-align: right;
  }

  :global(.form-legend .legend-required) {
    color: #b42318;
    font-weight: 700;
    text-decoration: none;
  }

  :global(.form-legend .legend-optional) {
    color: var(--studio-muted);
    font-weight: 500;
  }

  :global(:is(.atelier-studio-panel, .atelier-studio-surface) input),
  :global(:is(.atelier-studio-panel, .atelier-studio-surface) textarea),
  :global(:is(.atelier-studio-panel, .atelier-studio-surface) select) {
    width: 100%;
    border: 1px solid var(--studio-border);
    border-radius: 0.65rem;
    padding: 0.7rem 0.8rem;
    background: #fff;
    color: var(--studio-text);
    font: inherit;
  }

  :global(:is(.atelier-studio-panel, .atelier-studio-surface) input:disabled:not([type='checkbox'])),
  :global(:is(.atelier-studio-panel, .atelier-studio-surface) textarea:disabled),
  :global(:is(.atelier-studio-panel, .atelier-studio-surface) select:disabled) {
    background: #eef1f4;
    color: #6b7280;
    cursor: not-allowed;
  }

  :global(:is(.atelier-studio-panel, .atelier-studio-surface) label:has(> input:disabled:not([type='checkbox']))),
  :global(:is(.atelier-studio-panel, .atelier-studio-surface) label:has(> textarea:disabled)) {
    opacity: 0.72;
  }

  :global(:is(.atelier-studio-panel, .atelier-studio-surface) textarea) {
    resize: vertical;
  }


  :global(:is(.atelier-studio-panel, .atelier-studio-surface) .status) {
    margin: 0;
    padding: 0.85rem 1rem;
    border-radius: 0.75rem;
    white-space: pre-wrap;
    line-height: 1.5;
  }

  :global(:is(.atelier-studio-panel, .atelier-studio-surface) .status.success) {
    background: rgb(32 142 88 / 0.12);
    color: #176742;
  }

  :global(:is(.atelier-studio-panel, .atelier-studio-surface) .status.warning) {
    background: rgb(214 155 35 / 0.15);
    color: #6b4b0a;
  }

  :global(:is(.atelier-studio-panel, .atelier-studio-surface) .status.error) {
    background: rgb(191 56 56 / 0.12);
    color: #7f2222;
  }

  :global(:is(.atelier-studio-panel, .atelier-studio-surface) .status.info) {
    background: rgb(45 108 223 / 0.1);
    color: #143870;
  }
</style>
