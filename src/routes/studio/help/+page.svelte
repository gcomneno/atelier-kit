<script>
  import StudioAccessGuide from '$lib/components/StudioAccessGuide.svelte';
  import { useI18n } from '$lib/i18n/context.js';

  const t = useI18n();

  /** @type {Array<{ id: string, labelKey: string }>} */
  const toc = [
    { id: 'workflow', labelKey: 'studio.help.toc.workflow' },
    { id: 'site', labelKey: 'studio.help.toc.site' },
    { id: 'atelier-mark', labelKey: 'studio.help.toc.atelierMark' },
    { id: 'content', labelKey: 'studio.help.toc.content' },
    { id: 'item-page', labelKey: 'studio.help.toc.itemPage' },
    { id: 'publish', labelKey: 'studio.help.toc.publish' },
    { id: 'upgrade', labelKey: 'studio.help.toc.upgrade' },
    { id: 'limits', labelKey: 'studio.help.toc.limits' },
    { id: 'safety', labelKey: 'studio.help.toc.safety' }
  ];

  /** @type {Array<{ href: string, navKey: string, descKey: string }>} */
  const siteLinks = [
    { href: '/studio/site/identity', navKey: 'identity', descKey: 'studio.help.pages.identity' },
    { href: '/studio/site/appearance', navKey: 'appearance', descKey: 'studio.help.pages.appearance' },
    { href: '/studio/site/hero', navKey: 'hero', descKey: 'studio.help.pages.hero' },
    { href: '/studio/site/layout', navKey: 'layout', descKey: 'studio.help.pages.layout' },
    { href: '/studio/site/contact', navKey: 'contact', descKey: 'studio.help.pages.contact' },
    { href: '/studio/site/social', navKey: 'social', descKey: 'studio.help.pages.social' },
    { href: '/studio/site/footer', navKey: 'footer', descKey: 'studio.help.pages.footer' }
  ];

  /** @type {Array<{ href: string, navKey: string, descKey: string }>} */
  const contentLinks = [
    { href: '/studio/about', navKey: 'about', descKey: 'studio.help.contentPages.about' },
    { href: '/studio/catalog', navKey: 'catalog', descKey: 'studio.help.contentPages.catalog' },
    { href: '/studio/items', navKey: 'items', descKey: 'studio.help.contentPages.items' },
    { href: '/studio/collections', navKey: 'collections', descKey: 'studio.help.contentPages.collections' },
    { href: '/studio/signal-clouds', navKey: 'signals', descKey: 'studio.help.contentPages.signals' },
    { href: '/studio/news', navKey: 'news', descKey: 'studio.help.contentPages.news' }
  ];

  const workflowSteps = [1, 2, 3, 4, 5];
  const atelierMarkWhere = [1, 2, 3, 4];
  const atelierMarkSyntax = [1, 2, 3, 4, 5];
  const atelierMarkStudio = [1, 2, 3];
  const itemInStudio = [1, 2, 3, 4];
  const itemElsewhere = [1, 2, 3, 4, 5];
  const yamlOnly = [1, 2, 3];
  const upgradeSteps = [1, 2, 3, 4, 5];
  const commands = ['validate', 'doctor', 'publish', 'upgrade'];
</script>

<svelte:head>
  <title>{t('studio.help.pageTitle')}</title>
</svelte:head>

<p class="studio-intro">{t('studio.help.intro')}</p>

<nav class="help-toc studio-panel" aria-label={t('studio.help.tocTitle')}>
  <h2>{t('studio.help.tocTitle')}</h2>
  <ol>
    {#each toc as entry (entry.id)}
      <li><a href={`#${entry.id}`}>{t(entry.labelKey)}</a></li>
    {/each}
  </ol>
</nav>

<section id="workflow" class="studio-panel help-section">
  <div class="panel-heading">
    <h2>{t('studio.help.workflow.title')}</h2>
    <p>{t('studio.help.workflow.intro')}</p>
  </div>
  <ol class="help-steps">
    {#each workflowSteps as step}
      <li>{t(`studio.help.workflow.steps.${step}`)}</li>
    {/each}
  </ol>
</section>

<section id="site" class="studio-panel help-section">
  <div class="panel-heading">
    <h2>{t('studio.help.site.title')}</h2>
    <p>{t('studio.help.site.intro')}</p>
  </div>
  <ul class="help-links">
    {#each siteLinks as link (link.href)}
      <li>
        <a href={link.href}>{t(`studio.layout.nav.${link.navKey}`)}</a>
        <p>{t(link.descKey)}</p>
      </li>
    {/each}
  </ul>
</section>

<section id="atelier-mark" class="studio-panel help-section">
  <div class="panel-heading">
    <h2>{t('studio.help.atelierMark.title')}</h2>
    <p>{t('studio.help.atelierMark.intro')}</p>
  </div>

  <h3>{t('studio.help.atelierMark.whereTitle')}</h3>
  <ul class="help-bullets">
    {#each atelierMarkWhere as index}
      <li>{t(`studio.help.atelierMark.where.${index}`)}</li>
    {/each}
  </ul>

  <h3>{t('studio.help.atelierMark.syntaxTitle')}</h3>
  <ul class="help-bullets">
    {#each atelierMarkSyntax as index}
      <li>{t(`studio.help.atelierMark.syntax.${index}`)}</li>
    {/each}
  </ul>

  <h3>{t('studio.help.atelierMark.studioTitle')}</h3>
  <ol class="help-steps">
    {#each atelierMarkStudio as step}
      <li>{t(`studio.help.atelierMark.studio.${step}`)}</li>
    {/each}
  </ol>

  <p class="help-note">{t('studio.help.atelierMark.validationNote')}</p>
</section>

<section id="content" class="studio-panel help-section">
  <div class="panel-heading">
    <h2>{t('studio.help.content.title')}</h2>
    <p>{t('studio.help.content.intro')}</p>
  </div>
  <ul class="help-links">
    {#each contentLinks as link (link.href)}
      <li>
        <a href={link.href}>{t(`studio.layout.nav.${link.navKey}`)}</a>
        <p>{t(link.descKey)}</p>
      </li>
    {/each}
  </ul>
  <p class="help-note">{t('studio.help.content.orderNote')}</p>
</section>

<section id="item-page" class="studio-panel help-section">
  <div class="panel-heading">
    <h2>{t('studio.help.itemPage.title')}</h2>
    <p>{t('studio.help.itemPage.intro')}</p>
  </div>

  <h3>{t('studio.help.itemPage.inStudioTitle')}</h3>
  <ul class="help-bullets">
    {#each itemInStudio as index}
      <li>{t(`studio.help.itemPage.inStudio.${index}`)}</li>
    {/each}
  </ul>

  <h3>{t('studio.help.itemPage.elsewhereTitle')}</h3>
  <ul class="help-bullets">
    {#each itemElsewhere as index}
      <li>{t(`studio.help.itemPage.elsewhere.${index}`)}</li>
    {/each}
  </ul>

  <p class="help-note">{t('studio.help.itemPage.previewNote')}</p>
</section>

<section id="publish" class="studio-panel help-section">
  <div class="panel-heading">
    <h2>{t('studio.help.publish.title')}</h2>
    <p>{t('studio.help.publish.intro')}</p>
  </div>
  <ul class="help-bullets">
    <li>
      <a href="/" target="_blank" rel="noreferrer">{t('studio.layout.nav.preview')}</a>
      — {t('studio.help.publish.preview')}
    </li>
    <li>
      <a href="/studio/readiness">{t('studio.layout.nav.readiness')}</a>
      — {t('studio.help.publish.readiness')}
    </li>
  </ul>
  <h3>{t('studio.help.commands.title')}</h3>
  <p class="help-note">{t('studio.help.commands.intro')}</p>
  <ul class="help-commands">
    {#each commands as command}
      <li>
        <code>{t(`studio.help.commands.${command}.cmd`)}</code>
        <span>{t(`studio.help.commands.${command}.desc`)}</span>
      </li>
    {/each}
  </ul>
</section>

<section id="upgrade" class="studio-panel help-section">
  <div class="panel-heading">
    <h2>{t('studio.help.upgrade.title')}</h2>
    <p>{t('studio.help.upgrade.intro')}</p>
  </div>
  <ol class="help-steps">
    {#each upgradeSteps as step}
      <li>{t(`studio.help.upgrade.steps.${step}`)}</li>
    {/each}
  </ol>
  <p class="help-note">{t('studio.help.upgrade.note')}</p>
</section>

<section id="limits" class="studio-panel help-section">
  <div class="panel-heading">
    <h2>{t('studio.help.limits.title')}</h2>
    <p>{t('studio.help.limits.intro')}</p>
  </div>
  <ul class="help-bullets">
    {#each yamlOnly as index}
      <li>{t(`studio.help.limits.items.${index}`)}</li>
    {/each}
  </ul>
</section>

<section id="safety" class="help-section">
  <StudioAccessGuide />
</section>

<style>
  .help-toc h2 {
    margin: 0 0 0.75rem;
    font-size: 1.05rem;
  }

  .help-toc ol {
    margin: 0;
    padding-left: 1.25rem;
    display: grid;
    gap: 0.35rem;
    line-height: 1.45;
  }

  .help-toc a {
    color: var(--studio-accent);
    font-weight: 600;
    text-decoration: none;
  }

  .help-toc a:hover {
    text-decoration: underline;
  }

  .help-section {
    scroll-margin-top: 1rem;
  }

  .help-section + .help-section,
  .help-toc + .help-section {
    margin-top: 1rem;
  }

  .help-steps {
    margin: 0;
    padding-left: 1.25rem;
    display: grid;
    gap: 0.65rem;
    line-height: 1.55;
  }

  .help-links {
    list-style: none;
    margin: 0;
    padding: 0;
    display: grid;
    gap: 0.85rem;
  }

  .help-links a {
    color: var(--studio-accent);
    font-weight: 700;
    text-decoration: none;
  }

  .help-links a:hover {
    text-decoration: underline;
  }

  .help-links p {
    margin: 0.2rem 0 0;
    color: var(--studio-muted);
    font-size: 0.92rem;
    line-height: 1.5;
  }

  .help-section h3 {
    margin: 1.1rem 0 0.45rem;
    font-size: 0.95rem;
    font-weight: 700;
  }

  .help-section h3:first-of-type {
    margin-top: 0.35rem;
  }

  .help-bullets {
    margin: 0;
    padding-left: 1.2rem;
    display: grid;
    gap: 0.45rem;
    line-height: 1.55;
  }

  .help-bullets a {
    color: var(--studio-accent);
    font-weight: 600;
    text-decoration: none;
  }

  .help-bullets a:hover {
    text-decoration: underline;
  }

  .help-note {
    margin: 0.85rem 0 0;
    padding: 0.75rem 0.85rem;
    border-radius: 0.65rem;
    background: rgb(45 108 223 / 0.06);
    color: var(--studio-muted);
    font-size: 0.92rem;
    line-height: 1.5;
  }

  .help-commands {
    list-style: none;
    margin: 0.65rem 0 0;
    padding: 0;
    display: grid;
    gap: 0.55rem;
  }

  .help-commands li {
    display: grid;
    gap: 0.15rem;
  }

  .help-commands code {
    width: fit-content;
    padding: 0.2rem 0.45rem;
    border-radius: 0.4rem;
    background: rgb(47 40 31 / 0.06);
    font-size: 0.88rem;
  }

  .help-commands span {
    color: var(--studio-muted);
    font-size: 0.92rem;
    line-height: 1.45;
  }
</style>
