import { error } from '@sveltejs/kit';
import { getNewsPost, getSiteConfig } from '$lib/server/showcase.js';

/** @type {import('./$types').PageServerLoad} */
export function load({ params }) {
  const post = getNewsPost(params.slug);

  if (!post) {
    error(404, 'Not found');
  }

  return {
    site: getSiteConfig(),
    post
  };
}
