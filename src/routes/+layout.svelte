<script>
  import { page } from '$app/state';
  import SiteFooter from '$lib/components/SiteFooter.svelte';
  import KitCredit from '$lib/components/KitCredit.svelte';
  import SiteHeader from '$lib/components/SiteHeader.svelte';
  import { setVisitorI18nContext } from '$lib/i18n/visitor-context.js';
  import { appearanceCssVariables } from '$lib/site-appearance.js';
  import { markedTextFontPresets } from '$lib/marked-text.js';
  import { fontStylesheetHrefs } from '$lib/site-typography.js';
  import { STUDIO_HEAD_STYLE } from '$lib/studio-theme.js';

  let { children, data } = $props();
  const isStudio = $derived(page.url.pathname.startsWith('/studio'));

  setVisitorI18nContext(() => data.locale);

  /**
   * @param {string} href
   */
  function faviconTypeFromHref(href) {
    const lower = href.toLowerCase();

    if (lower.endsWith('.svg')) return 'image/svg+xml';
    if (lower.endsWith('.png')) return 'image/png';
    if (lower.endsWith('.webp')) return 'image/webp';
    if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) return 'image/jpeg';
    if (lower.endsWith('.ico')) return 'image/x-icon';

    return undefined;
  }

  const appearanceStyle = $derived(
    Object.entries(appearanceCssVariables(data.appearance))
      .map(([key, value]) => `${key}: ${value}`)
      .join('; ')
  );
  const hasBackgroundImage = $derived(Boolean(data.appearance?.background_image));
  const backgroundFit = $derived(data.appearance?.background_fit ?? 'top');
  const publicFontHrefs = $derived(
    isStudio
      ? []
      : fontStylesheetHrefs([
          data.appearance?.font_preset ?? 'inter',
          ...markedTextFontPresets(data.markedTextValues ?? [])
        ])
  );
  const faviconHref = $derived(data.site?.favicon || '/favicon.svg');
  const faviconType = $derived(faviconTypeFromHref(faviconHref));
  const appearanceRootStyle = $derived(
    `:root, body { ${appearanceStyle}; color-scheme: var(--site-color-scheme, light); background-color: var(--site-base-color, #f8f0e4); color: var(--site-text-color, #2f281f); font-family: var(--site-font-family, ui-sans-serif, system-ui, sans-serif); }`
  );
</script>

<svelte:head>
  <link rel="icon" href={faviconHref} type={faviconType} />
  {#if faviconHref === '/favicon.svg'}
    <link rel="alternate icon" href="/favicon.ico" />
  {/if}

  {#if isStudio}
    {@html STUDIO_HEAD_STYLE}
  {:else}
    {@html `<style id="site-appearance">${appearanceRootStyle}</style>`}
    {#if publicFontHrefs.length > 0}
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="anonymous" />
      {#each publicFontHrefs as href (href)}
        <link rel="stylesheet" {href} />
      {/each}
    {/if}
  {/if}
  {#if data.seo?.ogImage}
    <meta property="og:image" content={data.seo.ogImage} />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:image" content={data.seo.ogImage} />
  {/if}
  {#if data.seo?.siteName}
    <meta property="og:site_name" content={data.seo.siteName} />
  {/if}
</svelte:head>

{#if isStudio}
  {@render children()}
{:else}
  <div class="site-root" style={appearanceStyle}>
    <SiteHeader
      site={data.site}
      menuNav={data.menuNav}
      socialLinks={data.socialLinks}
      footer={data.footerActive ? data.footer : null}
      searchIndex={data.searchIndex}
    />
    <div
      class="site-content"
      class:has-background-image={hasBackgroundImage}
      data-bg-fit={hasBackgroundImage ? backgroundFit : undefined}
      style={hasBackgroundImage ? `--site-bg-url: url(${data.appearance.background_image})` : undefined}
    >
      {@render children()}
    </div>
    {#if data.footerActive && data.footer}
      <SiteFooter
        footer={data.footer}
        socialLinks={data.footer.show_social ? data.socialLinks : []}
        locale={data.locale}
      />
    {:else}
      <footer class="site-kit-credit-bar">
        <KitCredit locale={data.locale} />
      </footer>
    {/if}
  </div>
{/if}

<style>
  :global(*) {
    box-sizing: border-box;
  }

  :global(html) {
    background-color: var(--site-base-color, #f8f0e4);
  }

  :global(body) {
    margin: 0;
    min-height: 100vh;
    font-family: var(
      --site-font-family,
      ui-sans-serif,
      system-ui,
      -apple-system,
      BlinkMacSystemFont,
      "Segoe UI",
      sans-serif
    );
  }

  :global(a) {
    color: inherit;
  }

  :global(img) {
    max-width: 100%;
  }

  :global(.hero-intro),
  :global(.hero-intro-body) {
    font-style: normal;
  }

  .site-root {
    display: flex;
    flex-direction: column;
    min-height: 100vh;
    color: var(--site-text-color, #2f281f);
    background-color: var(--site-base-color, #f8f0e4);
  }

  .site-root :global(h1),
  .site-root :global(h2),
  .site-root :global(h3) {
    color: var(--site-heading-color, var(--site-text-color, #2f281f));
  }

  .site-content {
    display: flex;
    flex: 1;
    flex-direction: column;
    min-width: 0;
    background-color: var(--site-base-color, #f8f0e4);
    background:
      radial-gradient(
        circle at top left,
        color-mix(in srgb, var(--site-accent-color, #d6be9a) 42%, transparent),
        transparent 32rem
      ),
      var(--site-base-color, #f8f0e4);
  }

  .site-content.has-background-image {
    background-color: var(--site-base-color, #f8f0e4);
    background:
      radial-gradient(
        circle at top left,
        color-mix(in srgb, var(--site-accent-color, #d6be9a) 35%, transparent),
        transparent 32rem
      ),
      var(--site-bg-url) center top / cover no-repeat,
      var(--site-base-color, #f8f0e4);
  }

  .site-content.has-background-image[data-bg-fit='center'] {
    background:
      radial-gradient(
        circle at top left,
        color-mix(in srgb, var(--site-accent-color, #d6be9a) 35%, transparent),
        transparent 32rem
      ),
      var(--site-bg-url) center center / cover no-repeat,
      var(--site-base-color, #f8f0e4);
  }

  .site-content.has-background-image[data-bg-fit='contain'] {
    background:
      radial-gradient(
        circle at top left,
        color-mix(in srgb, var(--site-accent-color, #d6be9a) 35%, transparent),
        transparent 32rem
      ),
      var(--site-bg-url) center center / contain no-repeat,
      var(--site-base-color, #f8f0e4);
  }

  .site-root :global(.page-shell:not(.with-sidebar) .home-intro) {
    display: flex;
    flex: 1;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    min-height: min(72vh, calc(100vh - 9rem));
    text-align: center;
  }

  .site-root :global(.page-shell:not(.with-sidebar) .hero-head) {
    display: grid;
    justify-items: center;
    align-content: center;
    width: 100%;
    text-align: center;
  }

  .site-root :global(.page-shell:not(.with-sidebar) .hero-head h1) {
    max-width: 20ch;
    color: var(--site-intro-title-color, var(--site-heading-color, var(--site-text-color, #2f281f)));
    text-align: center;
  }

  .site-root :global(.page-shell:not(.with-sidebar) .hero-head .tagline),
  .site-root :global(.page-shell:not(.with-sidebar) .hero-head .hero-intro-card) {
    text-align: center;
    margin-inline: auto;
  }

  .site-root :global(.page-shell:not(.with-sidebar) .hero-head .hero-intro-card) {
    width: min(100%, 46rem);
  }

  .site-root :global(.page-shell:not(.with-sidebar) .hero-head .hero-intro) {
    text-align: center;
  }

  .site-root :global(.page-shell:not(.with-sidebar) .hero-head .hero-signature) {
    text-align: right;
  }

  /* Chrome <111 (e.g. Windows 7) — no color-mix(): keep solid theme colors */
  @supports not (color: color-mix(in srgb, red, blue)) {
    .site-root,
    .site-content,
    .site-content.has-background-image {
      background: var(--site-base-color, #f8f0e4);
    }

    .site-content.has-background-image {
      background-color: var(--site-base-color, #f8f0e4);
      background-image: var(--site-bg-url, none);
      background-position: center top;
      background-size: cover;
      background-repeat: no-repeat;
    }

    .site-content.has-background-image[data-bg-fit='center'] {
      background-position: center center;
      background-size: cover;
    }

    .site-content.has-background-image[data-bg-fit='contain'] {
      background-position: center center;
      background-size: contain;
    }

    :global(.catalog-sidebar--dark),
    :global(.catalog-sidebar--dark .widget-title),
    :global(.catalog-sidebar--dark .news-teaser),
    :global(main header h1) {
      color: var(--site-heading-color, var(--site-text-color, #2f281f));
    }

    :global(main header p),
    :global(main .eyebrow) {
      color: var(--site-text-color, #2f281f);
    }

    :global(.catalog-sidebar--dark .widget) {
      background-color: var(--site-card-color, var(--site-base-color, #f8f0e4));
    }
  }

  .site-content > :global(main) {
    display: flex;
    flex: 1;
    flex-direction: column;
    min-width: 0;
  }

  .site-content > :global(main .page-shell) {
    display: flex;
    flex: 1;
    flex-direction: column;
    min-width: 0;
  }

  .site-kit-credit-bar {
    width: min(1120px, calc(100% - 2rem));
    margin: 0 auto;
    padding: 0 0 1.25rem;
  }
</style>
