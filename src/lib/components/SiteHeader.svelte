<script>
  import EditorialText from '$lib/components/EditorialText.svelte';
  import { markedTextToPlainText } from '$lib/marked-text.js';
  import SiteSearch from '$lib/components/SiteSearch.svelte';
  import SocialIcon from '$lib/components/SocialIcon.svelte';
  import { useVisitorI18n } from '$lib/i18n/visitor-context.js';
  import { resolveHeaderTitle } from '$lib/site-branding.js';

  /** @typedef {{ id: string, url: string }} SocialLink */
  /** @typedef {{ href: string, label: string }} MenuNavItem */
  /** @typedef {import('$lib/search-index.js').SearchEntry} SearchEntry */

  /** @type {{ site: { name: string, header_title?: string, header_logo?: string, header_logo_alt?: string }, menuNav?: MenuNavItem[], socialLinks?: SocialLink[], footer?: { show_social: boolean } | null, overlay?: boolean, searchIndex?: SearchEntry[] }} */
  let {
    site,
    menuNav = [],
    socialLinks = [],
    footer = null,
    overlay = false,
    searchIndex = []
  } = $props();

  const t = useVisitorI18n();

  const headerTitle = $derived(resolveHeaderTitle(site));
  const headerLogo = $derived(site.header_logo?.trim() || '');
  const headerLogoAlt = $derived(site.header_logo_alt?.trim() || markedTextToPlainText(headerTitle));

  /** @param {string} id */
  function ariaLabel(id) {
    const labels = {
      instagram: t('social.instagram'),
      facebook: t('social.facebook'),
      x: t('social.x'),
      github: t('social.github')
    };

    return labels[/** @type {keyof typeof labels} */ (id)] ?? id;
  }
</script>

<header class="site-header" class:overlay>
  <div class="header-inner">
    <a class="site-brand" href="/">
      {#if headerLogo}
        <img class="site-logo" src={headerLogo} alt={headerLogoAlt} />
      {/if}
      {#if headerTitle}
        <EditorialText tag="span" class="site-name" value={headerTitle} />
      {/if}
    </a>

    {#if searchIndex.length > 0 || menuNav.length > 0 || (footer?.show_social && socialLinks.length > 0)}
      <div class="header-actions">
        {#if menuNav.length > 0}
          <nav class="site-nav" aria-label={t('common.siteNav')}>
            {#each menuNav as item (item.href)}
              <a class="site-nav-link" href={item.href}><EditorialText value={item.label} /></a>
            {/each}
          </nav>
        {/if}

        {#if searchIndex.length > 0}
          <SiteSearch entries={searchIndex} {overlay} />
        {/if}

        {#if footer?.show_social && socialLinks.length > 0}
          <nav class="social-nav" aria-label={t('common.socialLinks')}>
            {#each socialLinks as link (link.id)}
              <a
                class="social-link"
                href={link.url}
                target="_blank"
                rel="me noopener noreferrer"
                aria-label={ariaLabel(link.id)}
              >
                <SocialIcon id={link.id} />
              </a>
            {/each}
          </nav>
        {/if}
      </div>
    {/if}
  </div>
</header>

<style>
  .site-header {
    border-bottom: 1px solid var(--site-border-color, color-mix(in srgb, var(--site-text-color, #2f281f) 14%, transparent));
    color: var(--site-muted-text-color, color-mix(in srgb, var(--site-text-color, #2f281f) 72%, transparent));
    background: color-mix(in srgb, var(--site-base-color, #f8f0e4) 88%, white);
  }

  .site-header.overlay {
    position: relative;
    z-index: 3;
    border-bottom-color: color-mix(in srgb, var(--site-text-color, #e8e0d4) 18%, transparent);
    color: color-mix(in srgb, var(--site-text-color, #e8e0d4) 88%, transparent);
    background: linear-gradient(
      180deg,
      color-mix(in srgb, var(--site-base-color, #0f0e0d) 72%, transparent) 0%,
      color-mix(in srgb, var(--site-base-color, #0f0e0d) 28%, transparent) 100%
    );
    backdrop-filter: blur(4px);
  }

  .site-header.overlay :global(.site-name) {
    color: var(--site-header-title-color, var(--site-heading-color, var(--site-text-color, #e8e0d4)));
    text-shadow: 0 1px 16px rgb(0 0 0 / 0.65);
  }

  .site-header.overlay .social-link {
    background: color-mix(in srgb, var(--site-base-color, #0f0e0d) 45%, transparent);
    border-color: color-mix(in srgb, var(--site-text-color, #e8e0d4) 22%, transparent);
  }

  .header-inner {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1.25rem;
    width: min(1120px, calc(100% - 2rem));
    margin: 0 auto;
    padding: 1rem 0;
  }

  .site-brand {
    display: inline-flex;
    align-items: center;
    gap: 0.65rem;
    flex-shrink: 0;
    text-decoration: none;
    color: inherit;
  }

  .site-logo {
    display: block;
    width: auto;
    max-width: min(12rem, 42vw);
    max-height: 2.5rem;
    object-fit: contain;
  }

  :global(.site-name) {
    font-size: clamp(0.95rem, 2.5vw, 1.1rem);
    font-weight: 600;
    letter-spacing: 0.03em;
    line-height: 1.25;
    text-transform: none;
    color: var(--site-header-title-color, var(--site-heading-color, var(--site-text-color, #2f281f)));
  }

  .header-actions {
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: 1rem;
    margin-left: auto;
    min-width: 0;
  }

  .site-nav {
    display: flex;
    align-items: center;
    justify-content: flex-end;
    flex-wrap: wrap;
    gap: 0.35rem 1rem;
  }

  .site-nav-link {
    font-size: 0.88rem;
    font-weight: 600;
    letter-spacing: 0.04em;
    text-decoration: none;
    white-space: nowrap;
    color: var(--site-text-color, #2f281f);
  }

  .site-header.overlay .site-nav-link {
    color: var(--site-text-color, #e8e0d4);
  }

  .site-nav-link:hover {
    text-decoration: underline;
  }

  .social-nav {
    display: flex;
    align-items: center;
    gap: 0.65rem;
    flex-shrink: 0;
  }

  .social-link {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 2rem;
    height: 2rem;
    border-radius: 999px;
    color: var(--site-text-color, #2f281f);
    background: color-mix(in srgb, var(--site-base-color, #f8f0e4) 55%, white);
    border: 1px solid color-mix(in srgb, var(--site-text-color, #2f281f) 12%, transparent);
    text-decoration: none;
    transition: background 120ms ease;
  }

  .social-link:hover {
    background: color-mix(in srgb, var(--site-accent-color, #d6be9a) 35%, white);
  }

  .social-link :global(svg) {
    width: 1rem;
    height: 1rem;
    fill: currentColor;
  }

  @media (max-width: 720px) {
    .header-inner {
      align-items: flex-start;
      flex-direction: column;
    }

    .header-actions {
      width: 100%;
      margin-left: 0;
      flex-direction: column;
      align-items: flex-start;
    }

    .site-nav {
      justify-content: flex-start;
    }
  }
</style>
