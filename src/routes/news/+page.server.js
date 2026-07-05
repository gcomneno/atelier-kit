import { getNewsPosts, getSiteConfig } from '$lib/server/showcase.js';

/** @type {import('./$types').PageServerLoad} */
export function load() {
  return {
    site: getSiteConfig(),
    posts: getNewsPosts()
  };
}
