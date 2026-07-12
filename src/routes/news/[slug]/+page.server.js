import { error } from '@sveltejs/kit';
import { buildBlogPostingJsonLd } from '$lib/server/json-ld.js';
import { resolveAbsoluteImageUrl } from '$lib/site-meta.js';
import { formatPageTitle } from '$lib/site-branding.js';
import { markedTextToPlainText } from '$lib/marked-text.js';
import { getLayoutPageData, getNewsPost, getSiteConfig } from '$lib/server/showcase.js';

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
    ...getLayoutPageData('news'),
    seo: {
      ogTitle: formatPageTitle(markedTextToPlainText(post.title), site),
      ogDescription: markedTextToPlainText(description),
      ogImage: resolveAbsoluteImageUrl(site.og_image, url.origin, site.url)
    },
    jsonLd: buildBlogPostingJsonLd(post, site, url.origin)
  };
}
