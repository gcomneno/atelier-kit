<script>
  import { setI18nContext } from '$lib/i18n/context.js';
  import { useI18n } from '$lib/i18n/context.js';

  let { data, children } = $props();

  setI18nContext(() => data.locale);

  const t = useI18n();
</script>

<div class="studio-shell">
  <header class="studio-header">
    <div>
      <p class="eyebrow">{t('studio.layout.eyebrow')}</p>
      <h1>{t('studio.layout.title')}</h1>
    </div>

    <nav aria-label="Studio">
      <a href="/studio">{t('studio.layout.nav.site')}</a>
      <a href="/studio/about">{t('studio.layout.nav.about')}</a>
      <a href="/studio/catalog">{t('studio.layout.nav.catalog')}</a>
      <a href="/studio/items">{t('studio.layout.nav.items')}</a>
      <a href="/studio/collections">{t('studio.layout.nav.collections')}</a>
      <a href="/studio/signal-clouds">{t('studio.layout.nav.signals')}</a>
      <a href="/studio/readiness">{t('studio.layout.nav.readiness')}</a>
      <a href="/" target="_blank" rel="noreferrer">{t('studio.layout.nav.preview')}</a>
    </nav>
  </header>

  {@render children()}
</div>

<style>
  .studio-shell {
    width: min(880px, calc(100% - 2rem));
    margin: 0 auto;
    padding: 2rem 0 4rem;
  }

  .studio-header {
    display: flex;
    justify-content: space-between;
    align-items: end;
    gap: 1.5rem;
    margin-bottom: 2rem;
    padding-bottom: 1.5rem;
    border-bottom: 1px solid rgb(47 40 31 / 0.12);
  }

  .eyebrow {
    margin: 0 0 0.35rem;
    color: #7d684f;
    font-size: 0.8rem;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }

  h1 {
    margin: 0;
    font-size: 1.75rem;
    font-weight: 600;
  }

  nav {
    display: flex;
    flex-wrap: wrap;
    gap: 0.75rem 1rem;
    font-size: 0.9rem;
  }

  nav a {
    color: #5a4632;
  }
</style>
