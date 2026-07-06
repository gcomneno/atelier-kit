<script>
  import { page } from '$app/state';
  import { useI18n } from '$lib/i18n/context.js';

  const t = useI18n();

  const pathname = $derived(page.url.pathname);
  /** @param {string} href */
  const isActive = (href) => pathname === href;
  /** @param {string[]} prefixes */
  const isActiveGroup = (prefixes) => prefixes.some((prefix) => pathname.startsWith(prefix));
</script>

<nav class="studio-nav" aria-label="Studio">
  <ul class="studio-nav-list">
    <li>
      <a class:active={isActive('/studio')} href="/studio">
        {t('studio.layout.nav.dashboard')}
      </a>
    </li>

    <li class="group">
      <p class="group-title">{t('studio.layout.nav.siteGroup')}</p>
      <ul class="sub-list" class:active-group={isActiveGroup(['/studio/site/'])}>
        <li><a class:active={isActive('/studio/site/identity')} href="/studio/site/identity">{t('studio.layout.nav.identity')}</a></li>
        <li><a class:active={isActive('/studio/site/appearance')} href="/studio/site/appearance">{t('studio.layout.nav.appearance')}</a></li>
        <li><a class:active={isActive('/studio/site/hero')} href="/studio/site/hero">{t('studio.layout.nav.hero')}</a></li>
        <li><a class:active={isActive('/studio/site/layout')} href="/studio/site/layout">{t('studio.layout.nav.layout')}</a></li>
        <li><a class:active={isActive('/studio/site/contact')} href="/studio/site/contact">{t('studio.layout.nav.contact')}</a></li>
        <li><a class:active={isActive('/studio/site/social')} href="/studio/site/social">{t('studio.layout.nav.social')}</a></li>
        <li><a class:active={isActive('/studio/site/footer')} href="/studio/site/footer">{t('studio.layout.nav.footer')}</a></li>
      </ul>
    </li>

    <li class="group">
      <p class="group-title">{t('studio.layout.nav.contentGroup')}</p>
      <ul class="sub-list" class:active-group={isActiveGroup(['/studio/about', '/studio/catalog', '/studio/items', '/studio/collections', '/studio/news', '/studio/signal-clouds'])}>
        <li><a class:active={isActive('/studio/about')} href="/studio/about">{t('studio.layout.nav.about')}</a></li>
        <li><a class:active={isActive('/studio/catalog')} href="/studio/catalog">{t('studio.layout.nav.catalog')}</a></li>
        <li><a class:active={pathname.startsWith('/studio/items')} href="/studio/items">{t('studio.layout.nav.items')}</a></li>
        <li><a class:active={pathname.startsWith('/studio/collections')} href="/studio/collections">{t('studio.layout.nav.collections')}</a></li>
        <li><a class:active={pathname.startsWith('/studio/news')} href="/studio/news">{t('studio.layout.nav.news')}</a></li>
        <li><a class:active={isActive('/studio/signal-clouds')} href="/studio/signal-clouds">{t('studio.layout.nav.signals')}</a></li>
      </ul>
    </li>

    <li class="group">
      <p class="group-title">{t('studio.layout.nav.publishGroup')}</p>
      <ul class="sub-list" class:active-group={isActiveGroup(['/studio/readiness', '/studio/help'])}>
        <li><a class:active={isActive('/studio/readiness')} href="/studio/readiness">{t('studio.layout.nav.readiness')}</a></li>
        <li><a class:active={isActive('/studio/help')} href="/studio/help">{t('studio.layout.nav.help')}</a></li>
        <li><a href="/" target="_blank" rel="noreferrer">{t('studio.layout.nav.preview')}</a></li>
      </ul>
    </li>
  </ul>
</nav>

<style>
  .studio-nav {
    width: 100%;
  }

  .studio-nav-list,
  .sub-list {
    list-style: none;
    margin: 0;
    padding: 0;
  }

  .studio-nav-list {
    display: grid;
    gap: 0.4rem;
  }

  .group {
    margin-top: 0.35rem;
    padding-top: 0.45rem;
    border-top: 1px solid var(--studio-border);
  }

  .group-title {
    margin: 0 0 0.45rem;
    color: var(--studio-muted);
    font-size: 0.74rem;
    font-weight: 700;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }

  .sub-list {
    display: grid;
    gap: 0.3rem;
    padding-left: 0.35rem;
  }

  .studio-nav a {
    display: block;
    border-radius: 0.65rem;
    padding: 0.46rem 0.65rem;
    color: var(--studio-text);
    font-size: 0.92rem;
    text-decoration: none;
    transition: background-color 120ms ease;
  }

  .studio-nav a:hover {
    background: rgb(45 108 223 / 0.08);
  }

  .studio-nav a.active {
    background: rgb(45 108 223 / 0.16);
    color: #143870;
    font-weight: 600;
  }

  .sub-list.active-group {
    border-left: 2px solid rgb(45 108 223 / 0.35);
    padding-left: 0.55rem;
    margin-left: 0.1rem;
  }
</style>
