<script>
  import { useVisitorI18n } from '$lib/i18n/visitor-context.js';

  /** @typedef {{ id: string, url: string }} SocialLink */

  /** @type {{ name: string, links?: SocialLink[] }} */
  export let site = { name: '', links: [] };

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

<header class="site-header">
  <a class="site-name" href="/">{site.name}</a>

  {#if socialLinks.length > 0}
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
</header>

<style>
  .site-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
    width: min(1120px, calc(100% - 2rem));
    margin: 0 auto;
    padding: 1rem 0 0;
  }

  .site-name {
    font-size: 0.95rem;
    font-weight: 600;
    letter-spacing: 0.04em;
    text-decoration: none;
    text-transform: uppercase;
    color: inherit;
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
</style>
