<script>
  import { useI18n } from '$lib/i18n/context.js';

  const t = useI18n();
</script>

<svelte:head>
  <title>{t('studio.dashboard.pageTitle')}</title>
</svelte:head>

<p class="studio-intro">{t('studio.dashboard.intro')}</p>

<section class="cards">
  <a class="studio-panel card" href="/studio/site/identity">
    <h2>{t('studio.dashboard.cards.identity.title')}</h2>
    <p>{t('studio.dashboard.cards.identity.description')}</p>
  </a>
  <a class="studio-panel card" href="/studio/site/appearance">
    <h2>{t('studio.dashboard.cards.appearance.title')}</h2>
    <p>{t('studio.dashboard.cards.appearance.description')}</p>
  </a>
  <a class="studio-panel card" href="/studio/site/hero">
    <h2>{t('studio.dashboard.cards.hero.title')}</h2>
    <p>{t('studio.dashboard.cards.hero.description')}</p>
  </a>
  <a class="studio-panel card" href="/studio/site/layout">
    <h2>{t('studio.dashboard.cards.layout.title')}</h2>
    <p>{t('studio.dashboard.cards.layout.description')}</p>
  </a>
  <a class="studio-panel card" href="/studio/site/contact">
    <h2>{t('studio.dashboard.cards.contact.title')}</h2>
    <p>{t('studio.dashboard.cards.contact.description')}</p>
  </a>
  <a class="studio-panel card" href="/studio/site/social">
    <h2>{t('studio.dashboard.cards.social.title')}</h2>
    <p>{t('studio.dashboard.cards.social.description')}</p>
  </a>
  <a class="studio-panel card" href="/studio/site/footer">
    <h2>{t('studio.dashboard.cards.footer.title')}</h2>
    <p>{t('studio.dashboard.cards.footer.description')}</p>
  </a>
  <a class="studio-panel card" href="/studio/readiness">
    <h2>{t('studio.dashboard.cards.readiness.title')}</h2>
    <p>{t('studio.dashboard.cards.readiness.description')}</p>
  </a>
</section>

<style>
  .cards {
    display: grid;
    gap: 1rem;
    grid-template-columns: repeat(auto-fit, minmax(13rem, 1fr));
  }

  .card {
    display: grid;
    gap: 0.45rem;
    color: inherit;
    text-decoration: none;
    transition:
      transform 100ms ease,
      border-color 100ms ease;
  }

  .card:hover {
    transform: translateY(-1px);
    border-color: color-mix(in srgb, var(--studio-accent) 40%, var(--studio-border));
  }

  .card h2 {
    margin: 0;
    font-size: 1.04rem;
  }

  .card p {
    margin: 0;
    color: var(--studio-muted);
    line-height: 1.45;
  }
</style>
