import { getSiteConfig, getSocialConfig } from '$lib/server/showcase.js';

export function load() {
  const site = getSiteConfig();
  const social = getSocialConfig();

  return {
    lang: site.language || 'en',
    appearance: site.appearance,
    site: {
      name: site.name
    },
    socialLinks: social.links
  };
}
