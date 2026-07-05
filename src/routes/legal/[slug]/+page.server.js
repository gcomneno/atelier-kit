import { error } from '@sveltejs/kit';
import { getLegalPage, getSiteConfig } from '$lib/server/showcase.js';

/** @type {import('./$types').PageServerLoad} */
export function load({ params }) {
  const legal = getLegalPage(params.slug);

  if (!legal) {
    error(404, 'Not found');
  }

  return {
    legal,
    site: getSiteConfig()
  };
}
