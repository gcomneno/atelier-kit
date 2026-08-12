<script>
  import { RelationshipGraph } from 'giadaware-ui-components/visitor';
  import { formatPageTitle, resolveDocumentTitle } from '$lib/site-branding.js';
  import { useVisitorI18n } from '$lib/i18n/visitor-context.js';

  let { data } = $props();
  const t = useVisitorI18n();

  /**
   * @param {string} locale
   * @returns {import('giadaware-ui-components/visitor').RelationshipGraphLabels}
   */
  function buildRelationshipGraphLabels(locale) {
    const italian = locale === 'it';

    return {
      region: t('relationships.ariaLabel'),
      controls: italian ? 'Controlli del grafo' : 'Graph controls',
      zoomIn: italian ? 'Ingrandisci' : 'Zoom in',
      zoomOut: italian ? 'Riduci' : 'Zoom out',
      resetView: italian ? 'Reimposta vista' : 'Reset view',
      fitGraph: italian ? 'Adatta il grafo' : 'Fit graph',
      panUp: italian ? 'Sposta in alto' : 'Pan up',
      panDown: italian ? 'Sposta in basso' : 'Pan down',
      panLeft: italian ? 'Sposta a sinistra' : 'Pan left',
      panRight: italian ? 'Sposta a destra' : 'Pan right',
      empty: t('relationships.empty'),
      summary: ({ nodeCount, edgeCount }) =>
        italian
          ? `${nodeCount} nodi, ${edgeCount} relazioni dirette.`
          : `${nodeCount} nodes, ${edgeCount} directed relationships.`,
      relationship: ({ sourceLabel, targetLabel, relationship }) => {
        if (italian) {
          return relationship
            ? `${sourceLabel} verso ${targetLabel}: ${relationship}`
            : `${sourceLabel} verso ${targetLabel}`;
        }

        return relationship
          ? `${sourceLabel} to ${targetLabel}: ${relationship}`
          : `${sourceLabel} to ${targetLabel}`;
      }
    };
  }

  const siteLabel = $derived(resolveDocumentTitle(data.site));
  const pageTitle = $derived(formatPageTitle(t('relationships.pageTitle'), data.site));
  const metaDescription = $derived(
    siteLabel
      ? t('relationships.metaDescription', { siteName: siteLabel })
      : t('relationships.intro')
  );
  const relationshipGraphLabels = $derived(buildRelationshipGraphLabels(data.locale));
</script>

<svelte:head>
  <title>{pageTitle}</title>
  <meta name="description" content={metaDescription} />
</svelte:head>

<main class="page-shell">
  <nav aria-label={t('common.breadcrumb')}>
    <a href="/">{t('common.home')}</a>
  </nav>

  <header>
    <p class="eyebrow">{t('relationships.eyebrow')}</p>
    <h1>{t('relationships.title')}</h1>
    <p>{t('relationships.intro')}</p>
  </header>

  <RelationshipGraph
    nodes={data.graph.nodes}
    edges={data.graph.edges}
    labels={relationshipGraphLabels}
    class="catalog-relationship-graph"
  />
</main>

<style>
  .page-shell {
    display: grid;
    gap: 1.5rem;
    width: min(1120px, calc(100% - 2rem));
    margin: 0 auto;
    padding: 2rem 0 4rem;
  }

  nav a {
    color: color-mix(in srgb, var(--site-text-color, #2f281f) 72%, transparent);
    font-weight: 600;
    text-decoration: none;
  }

  nav a:hover {
    color: var(--site-text-color, #2f281f);
  }

  header {
    display: grid;
    gap: 0.75rem;
    max-width: 48rem;
  }

  header > * {
    margin: 0;
  }

  .eyebrow {
    color: color-mix(in srgb, var(--site-accent-color, #7d684f) 72%, var(--site-text-color, #2f281f));
    font-size: 0.8rem;
    font-weight: 800;
    letter-spacing: 0.14em;
    text-transform: uppercase;
  }

  h1 {
    font-size: clamp(2.5rem, 9vw, 6rem);
    line-height: 0.95;
    letter-spacing: -0.06em;
  }

  header p:last-child {
    color: color-mix(in srgb, var(--site-text-color, #2f281f) 82%, transparent);
    font-size: clamp(1rem, 2.5vw, 1.3rem);
    line-height: 1.5;
  }

  :global(.catalog-relationship-graph) {
    --giu-relationship-graph-height: min(38rem, 72vh);
    --giu-relationship-graph-background: var(--site-card-color, #fffaf2);
    --giu-relationship-graph-border: var(--site-border-color, #d8c9b6);
    --giu-relationship-graph-color: var(--site-text-color, #2f281f);
    --giu-relationship-graph-edge: color-mix(in srgb, var(--site-text-color, #2f281f) 58%, transparent);
    --giu-relationship-graph-focus: var(--site-accent-color, #8c3a44);
    --giu-relationship-graph-node-background: var(--site-base-color, #f8f0e4);
    --giu-relationship-graph-node-border: var(--site-accent-color, #8c3a44);
    --giu-relationship-graph-node-color: var(--site-text-color, #2f281f);
  }
</style>