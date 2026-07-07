<script>
  import { page } from '$app/state';
  import SiteFooter from '$lib/components/SiteFooter.svelte';
  import KitCredit from '$lib/components/KitCredit.svelte';
  import SiteHeader from '$lib/components/SiteHeader.svelte';
  import { setVisitorI18nContext } from '$lib/i18n/visitor-context.js';
  import { appearanceCssVariables } from '$lib/site-appearance.js';
  import { fontStylesheetHref } from '$lib/site-typography.js';
  import { STUDIO_HEAD_STYLE } from '$lib/studio-theme.js';

  let { children, data } = $props();
  const isStudio = $derived(page.url.pathname.startsWith('/studio'));

  setVisitorI18nContext(() => data.locale);

  const appearanceStyle = $derived(
    Object.entries(appearanceCssVariables(data.appearance))
      .map(([key, value]) => `${key}: ${value}`)
      .join('; ')
  );
  const hasBackgroundImage = $derived(Boolean(data.appearance?.background_image));
  const publicFontHref = $derived(
    isStudio ? null : fontStylesheetHref(data.appearance?.font_preset ?? 'inter')
  );
  const appearanceRootStyle = $derived(
    `:root, body { ${appearanceStyle}; color-scheme: var(--site-color-scheme, light); background-color: var(--site-base-color, #f8f0e4); color: var(--site-text-color, #2f281f); font-family: var(--site-font-family, ui-sans-serif, system-ui, sans-serif); }`
  );
</script>

<svelte:head>
  {#if isStudio}
    {@html STUDIO_HEAD_STYLE}
  {:else}
    {@html `<style id="site-appearance">${appearanceRootStyle}</style>`}
    {#if publicFontHref}
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="anonymous" />
      <link rel="stylesheet" href={publicFontHref} />
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
  <div
    class="site-root"
    class:has-background-image={hasBackgroundImage}
    style={`${appearanceStyle}${hasBackgroundImage ? `; --site-bg-url: url(${data.appearance.background_image})` : ''}`}
  >
    <SiteHeader
      site={data.site}
      menuNav={data.menuNav}
      socialLinks={data.socialLinks}
      footer={data.footerActive ? data.footer : null}
      overlay={hasBackgroundImage}
    />
    {@render children()}
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
    background:
      radial-gradient(
        circle at top left,
        color-mix(in srgb, var(--site-accent-color, #d6be9a) 42%, transparent),
        transparent 32rem
      ),
      var(--site-base-color, #f8f0e4);
  }

  .site-root :global(h1),
  .site-root :global(h2),
  .site-root :global(h3) {
    color: var(--site-heading-color, var(--site-text-color, #2f281f));
  }

  .site-root.has-background-image {
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

  /* Chrome <111 (e.g. Windows 7) — no color-mix(): keep solid theme colors */
  @supports not (color: color-mix(in srgb, red, blue)) {
    .site-root,
    .site-root.has-background-image {
      background: var(--site-base-color, #f8f0e4);
    }

    .site-root.has-background-image {
      background-color: var(--site-base-color, #f8f0e4);
      background-image: var(--site-bg-url, none);
      background-position: center top;
      background-size: cover;
      background-repeat: no-repeat;
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

  .site-kit-credit-bar {
    width: min(1120px, calc(100% - 2rem));
    margin: 0 auto;
    padding: 0 0 1.25rem;
  }
</style>
