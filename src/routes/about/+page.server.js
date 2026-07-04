import { error } from '@sveltejs/kit';
import { getAboutConfig, getSiteConfig } from '$lib/server/showcase.js';

export function load() {
  const about = getAboutConfig();

  if (!about) {
    error(404, 'About page not available');
  }

  return {
    site: getSiteConfig(),
    about
  };
}
