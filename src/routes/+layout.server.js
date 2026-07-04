import { getSiteConfig } from '$lib/server/showcase.js';

export function load() {
  const site = getSiteConfig();

  return {
    lang: site.language || 'en'
  };
}
