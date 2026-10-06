<script>
  import { FormStatus, SocialIcon } from 'giadaware-ui-components';
  import { RelationshipGraph } from 'giadaware-ui-components/visitor';
  import { useVisitorI18n } from '$lib/i18n/visitor-context.js';
  import { formatPageTitle } from '$lib/site-branding.js';

  let { data } = $props();
  const t = useVisitorI18n();

  let showFeedback = $state(false);
  let selected = $state('');
  let activated = $state('');

  const pageTitle = $derived(formatPageTitle(t('giadaUi.title'), data.site));
  const nodes = $derived([
    { id: 'idea', label: t('giadaUi.graph.idea') },
    { id: 'study', label: t('giadaUi.graph.study') },
    { id: 'work', label: t('giadaUi.graph.work') }
  ]);
  const edges = [
    { source: 'idea', target: 'study' },
    { source: 'study', target: 'work' }
  ];

  /** @returns {import('giadaware-ui-components/visitor').RelationshipGraphLabels} */
  function graphLabels() {
    return {
      region: t('giadaUi.graph.region'),
      controls: t('giadaUi.graph.controls'),
      zoomIn: t('giadaUi.graph.zoomIn'),
      zoomOut: t('giadaUi.graph.zoomOut'),
      resetView: t('giadaUi.graph.resetView'),
      fitGraph: t('giadaUi.graph.fitGraph'),
      panUp: t('giadaUi.graph.panUp'),
      panDown: t('giadaUi.graph.panDown'),
      panLeft: t('giadaUi.graph.panLeft'),
      panRight: t('giadaUi.graph.panRight'),
      empty: t('giadaUi.graph.empty'),
      summary: ({ nodeCount, edgeCount }) =>
        t('giadaUi.graph.summary', { nodeCount, edgeCount }),
      relationship: ({ sourceLabel, targetLabel }) =>
        t('giadaUi.graph.relationship', { sourceLabel, targetLabel })
    };
  }

  const labels = $derived(graphLabels());
</script>

<svelte:head>
  <title>{pageTitle}</title>
  <meta name="description" content={t('giadaUi.intro')} />
</svelte:head>

<main class="giada-ui-page">
  <a class="back-link" href="/">{t('common.backToShowcase')}</a>

  <header>
    <p class="eyebrow">{t('giadaUi.eyebrow')}</p>
    <h1>{t('giadaUi.title')}</h1>
    <p>{t('giadaUi.intro')}</p>
    <p>{t('giadaUi.packageOwns')}</p>
    <p>{t('giadaUi.consumerOwns')}</p>
    <p>{t('giadaUi.scope')}</p>
  </header>

  <section aria-labelledby="social-icon-title">
    <h2 id="social-icon-title">SocialIcon</h2>
    <p>{t('giadaUi.social.description')}</p>
    <a
      class="social-example"
      href="https://github.com/gcomneno/giadaware-ui-components"
      aria-label={t('giadaUi.social.label')}
    >
      <SocialIcon id="github" decorative={true} />
      <span>{t('giadaUi.repository')}</span>
    </a>
  </section>

  <section aria-labelledby="form-status-title">
    <h2 id="form-status-title">FormStatus</h2>
    <p>{t('giadaUi.status.description')}</p>
    <div class="sample-actions">
      <button type="button" onclick={() => { showFeedback = true; }}>
        {t('giadaUi.status.show')}
      </button>
      <button type="button" onclick={() => { showFeedback = false; }}>
        {t('giadaUi.status.clear')}
      </button>
    </div>
    <FormStatus
      message={showFeedback ? t('giadaUi.status.message') : ''}
      tone="info"
      durationMs={null}
    />
  </section>

  <section aria-labelledby="relationship-graph-title">
    <h2 id="relationship-graph-title">RelationshipGraph</h2>
    <p>{t('giadaUi.graph.description')}</p>
    <RelationshipGraph
      {nodes}
      {edges}
      {labels}
      onnodeselect={({ node }) => { selected = node.label; }}
      onnodeactivate={({ node }) => { activated = node.label; }}
      class="sample-relationship-graph"
    />
    <p aria-live="polite">
      {t('giadaUi.graph.selected', { label: selected || t('giadaUi.graph.none') })}
      {t('giadaUi.graph.activated', { label: activated || t('giadaUi.graph.none') })}
    </p>
  </section>

  <nav class="public-links" aria-label={t('giadaUi.linksLabel')}>
    <a href="https://github.com/gcomneno/giadaware-ui-components">
      {t('giadaUi.repository')}
    </a>
    <a href="https://github.com/gcomneno/giadaware-ui-components/blob/main/docs/interface-guide.md">
      {t('giadaUi.interfaceGuide')}
    </a>
    <a href="https://github.com/gcomneno/giadaware-ui-components#living-consumer-demo">
      {t('giadaUi.livingDemo')}
    </a>
  </nav>
</main>

<style>
  .giada-ui-page {
    display: grid;
    gap: 1.5rem;
    width: min(760px, calc(100% - 2rem));
    margin: 0 auto;
    padding: 1.25rem 0 4rem;
  }

  .back-link {
    font-weight: 600;
    text-decoration: none;
  }

  header,
  section {
    display: grid;
    gap: 0.75rem;
  }

  header > *,
  section > h2,
  section > p {
    margin: 0;
  }

  .eyebrow {
    color: var(--site-muted-text-color, #7d684f);
    font-size: 0.8rem;
    font-weight: 800;
    letter-spacing: 0.14em;
    text-transform: uppercase;
  }

  h1 {
    font-size: clamp(2.4rem, 8vw, 4rem);
    line-height: 0.95;
    letter-spacing: -0.05em;
  }

  p {
    line-height: 1.7;
  }

  section {
    padding: 1.15rem;
    border: 1px solid var(--site-border-color, #e4d8c7);
    border-radius: 1rem;
    background: var(--site-card-color, #fffaf2);
  }

  h2 {
    font-size: 1.2rem;
    letter-spacing: -0.02em;
  }

  .social-example,
  .sample-actions,
  .public-links {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 0.75rem;
  }

  .social-example :global(svg) {
    width: 1rem;
    height: 1rem;
  }

  button {
    padding: 0.6rem 0.85rem;
    border: 1px solid var(--site-border-color, #e4d8c7);
    border-radius: 0.6rem;
    background: var(--site-base-color, #f8f0e4);
    color: var(--site-text-color, #2f281f);
    font: inherit;
    cursor: pointer;
  }

  a:focus-visible,
  button:focus-visible {
    outline: 3px solid var(--site-accent-color, #8c3a44);
    outline-offset: 3px;
  }

  :global(.sample-relationship-graph) {
    --giu-relationship-graph-height: 18rem;
    --giu-relationship-graph-background: var(--site-card-color, #fffaf2);
    --giu-relationship-graph-border: var(--site-border-color, #e4d8c7);
    --giu-relationship-graph-color: var(--site-text-color, #2f281f);
    --giu-relationship-graph-focus: var(--site-accent-color, #8c3a44);
    --giu-relationship-graph-node-background: var(--site-base-color, #f8f0e4);
    --giu-relationship-graph-node-border: var(--site-accent-color, #8c3a44);
    --giu-relationship-graph-node-color: var(--site-text-color, #2f281f);
  }
</style>
