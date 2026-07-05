import { getFooterConfig, getSiteConfig, getSocialConfig, isFooterActive } from '$lib/server/showcase.js';

export function load() {
  const site = getSiteConfig();
  const social = getSocialConfig();
  const footer = getFooterConfig();

  return {
    lang: site.language || 'en',
    appearance: site.appearance,
    site: {
      name: site.name
    },
    socialLinks: social.links,
    footer,
    footerActive: isFooterActive(footer)
  };
}
