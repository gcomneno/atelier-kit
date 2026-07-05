<script>
  import { isExternalFooterHref } from '$lib/footer-links.js';
  import { useVisitorI18n } from '$lib/i18n/visitor-context.js';

  /** @typedef {{ label: string, href: string }} FooterLink */
  /** @typedef {{ title: string, links: FooterLink[] }} FooterColumn */
  /** @typedef {{ id: string, url: string }} SocialLink */

  /** @type {{ columns: FooterColumn[], copyright: string, legal_line: string, show_social: boolean }} */
  export let footer = { columns: [], copyright: '', legal_line: '', show_social: false };

  /** @type {SocialLink[]} */
  export let socialLinks = [];

  const t = useVisitorI18n();

  /** @param {string} id */
  function ariaLabel(id) {
    const labels = {
      instagram: t('social.instagram'),
      facebook: t('social.facebook'),
      x: t('social.x')
    };

    return labels[/** @type {keyof typeof labels} */ (id)] ?? id;
  }
</script>

<footer class="site-footer">
  <div class="footer-inner">
    {#if footer.columns.length > 0}
      <div class="footer-columns">
        {#each footer.columns as column (column.title)}
          <nav class="footer-column" aria-label={column.title}>
            <h2 class="column-title">{column.title}</h2>
            <ul>
              {#each column.links as link (link.href + link.label)}
                <li>
                  <a
                    href={link.href}
                    {...isExternalFooterHref(link.href)
                      ? { target: '_blank', rel: 'noopener noreferrer' }
                      : {}}
                  >
                    {link.label}
                  </a>
                </li>
              {/each}
            </ul>
          </nav>
        {/each}
      </div>
    {/if}

    <div class="footer-meta">
      {#if footer.show_social && socialLinks.length > 0}
        <nav class="social-nav" aria-label={t('common.socialLinks')}>
          {#each socialLinks as link (link.id)}
            <a
              class="social-link"
              href={link.url}
              target="_blank"
              rel="me noopener noreferrer"
              aria-label={ariaLabel(link.id)}
            >
              {#if link.id === 'instagram'}
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path
                    d="M7 3h10a4 4 0 0 1 4 4v10a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4V7a4 4 0 0 1 4-4zm5 4.5A5.5 5.5 0 1 0 16.5 13 5.5 5.5 0 0 0 12 7.5zm6.25-2.38a1.12 1.12 0 1 0-1.12 1.12 1.12 1.12 0 0 0 1.12-1.12zM12 9.75A3.25 3.25 0 1 1 8.75 13 3.25 3.25 0 0 1 12 9.75z"
                  />
                </svg>
              {:else if link.id === 'facebook'}
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path
                    d="M13.5 4H16V1.14A13.86 13.86 0 0 0 11.64 0C7.28 0 4.5 2.55 4.5 7.22V11H2v3.45h2.5V24h4.64v-9.55H13l.5-3.45H9.14V7.75c0-1.05.28-1.77 1.73-1.77z"
                  />
                </svg>
              {:else}
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path
                    d="M17.3 3H20l-6.4 7.32L21 21h-5.9l-4.6-6-5.3 6H2.4l6.9-7.9L3 3h6l4.2 5.5L17.3 3zm-2.1 16.2h1.6L7.1 4.7H5.4l9.8 14.5z"
                  />
                </svg>
              {/if}
            </a>
          {/each}
        </nav>
      {/if}

      {#if footer.copyright}
        <p class="copyright">{footer.copyright}</p>
      {/if}

      {#if footer.legal_line}
        <p class="legal-line">{footer.legal_line}</p>
      {/if}
    </div>
  </div>
</footer>

<style>
  .site-footer {
    margin-top: auto;
    border-top: 1px solid color-mix(in srgb, var(--site-text-color, #2f281f) 14%, transparent);
    color: color-mix(in srgb, var(--site-text-color, #2f281f) 72%, transparent);
    background: color-mix(in srgb, var(--site-base-color, #f8f0e4) 88%, white);
  }

  .footer-inner {
    width: min(1120px, calc(100% - 2rem));
    margin: 0 auto;
    padding: 2.5rem 0 2rem;
    display: grid;
    gap: 2rem;
  }

  .footer-columns {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(min(100%, 10rem), 1fr));
    gap: 1.5rem 2rem;
  }

  .footer-column ul {
    margin: 0;
    padding: 0;
    list-style: none;
    display: grid;
    gap: 0.45rem;
  }

  .column-title {
    margin: 0 0 0.65rem;
    font-size: 0.75rem;
    font-weight: 700;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: var(--site-text-color, #2f281f);
  }

  .footer-column a {
    font-size: 0.92rem;
    text-decoration: none;
    color: inherit;
    opacity: 0.88;
    transition: opacity 120ms ease;
  }

  .footer-column a:hover {
    opacity: 1;
    color: var(--site-text-color, #2f281f);
  }

  .footer-meta {
    display: grid;
    gap: 0.75rem;
    padding-top: 0.25rem;
    border-top: 1px solid color-mix(in srgb, var(--site-text-color, #2f281f) 10%, transparent);
  }

  .social-nav {
    display: flex;
    align-items: center;
    gap: 0.65rem;
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

  .social-link svg {
    width: 1rem;
    height: 1rem;
    fill: currentColor;
  }

  .copyright,
  .legal-line {
    margin: 0;
    font-size: 0.85rem;
    line-height: 1.5;
  }

  .legal-line {
    opacity: 0.85;
  }
</style>
