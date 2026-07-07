<script>
  import { useI18n } from '$lib/i18n/context.js';

  const t = useI18n();

  /** @typedef {'site' | 'content' | 'publish' | 'system'} StudioZoneId */

  /** @type {Array<{ id: StudioZoneId, href: string, tone: StudioZoneId }>} */
  const zones = [
    { id: 'site', href: '/studio/site/identity', tone: 'site' },
    { id: 'content', href: '/studio/about', tone: 'content' },
    { id: 'publish', href: '/studio/readiness', tone: 'publish' },
    { id: 'system', href: '/studio/system', tone: 'system' }
  ];
</script>

<svelte:head>
  <title>{t('studio.dashboard.pageTitle')}</title>
</svelte:head>

<p class="studio-intro">{t('studio.dashboard.intro')}</p>

<section class="zones" aria-label={t('studio.dashboard.zonesLegend')}>
  {#each zones as zone (zone.id)}
    <a class="zone studio-panel tone-{zone.tone}" href={zone.href}>
      <p class="zone-eyebrow">{t(`studio.dashboard.zones.${zone.id}.eyebrow`)}</p>
      <h2>{t(`studio.dashboard.zones.${zone.id}.title`)}</h2>
      <p class="zone-description">{t(`studio.dashboard.zones.${zone.id}.description`)}</p>
    </a>
  {/each}
</section>

<style>
  .zones {
    display: grid;
    gap: 1rem;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    align-items: stretch;
  }

  .zone {
    display: flex;
    flex-direction: column;
    gap: 0.55rem;
    height: 100%;
    min-height: 10rem;
    color: inherit;
    text-decoration: none;
    transition:
      transform 120ms ease,
      box-shadow 120ms ease;
  }

  .zone:hover {
    transform: translateY(-2px);
    box-shadow: 0 14px 34px rgb(15 23 42 / 0.1);
  }

  .zone-eyebrow {
    margin: 0;
    font-size: 0.74rem;
    font-weight: 700;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    opacity: 0.82;
  }

  .zone h2 {
    margin: 0;
    font-size: 1.35rem;
    line-height: 1.2;
  }

  .zone-description {
    margin: 0;
    color: var(--studio-muted);
    line-height: 1.5;
  }

  .tone-site {
    border-color: #c5d8f8;
    background: linear-gradient(160deg, #eef4ff 0%, #fff 58%);
  }

  .tone-site .zone-eyebrow {
    color: #1f4f9c;
  }

  .tone-content {
    border-color: #ecd9b8;
    background: linear-gradient(160deg, #fdf6ec 0%, #fff 58%);
  }

  .tone-content .zone-eyebrow {
    color: #8a5a12;
  }

  .tone-publish {
    border-color: #b8dcc8;
    background: linear-gradient(160deg, #ecf8f1 0%, #fff 58%);
  }

  .tone-publish .zone-eyebrow {
    color: #1f6b42;
  }

  .tone-system {
    border-color: #d4c5e8;
    background: linear-gradient(160deg, #f3eef9 0%, #fff 58%);
  }

  .tone-system .zone-eyebrow {
    color: #5c3d8f;
  }

  @media (max-width: 920px) {
    .zones {
      grid-template-columns: 1fr;
    }
  }
</style>
