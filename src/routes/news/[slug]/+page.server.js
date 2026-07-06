import { error } from '@sveltejs/kit';
import { resolveAbsoluteImageUrl } from '$lib/site-meta.js';
import { getNewsPost, getSiteConfig } from '$lib/server/showcase.js';

/** @type {import('./$types').PageServerLoad} */
export function load({ params, url }) {
  const post = getNewsPost(params.slug);

  if (!post) {
    error(404, 'Not found');
  }

  const site = getSiteConfig();
  const description = post.excerpt || post.title;

  return {
    site,
    post,
    seo: {
      ogTitle: `${post.title} · ${site.name}`,
      ogDescription: description,
      ogImage: resolveAbsoluteImageUrl(site.og_image, url.origin, site.url)
    }
  };
}
