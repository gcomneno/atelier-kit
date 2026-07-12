import { resolveAbsoluteImageUrl, resolveAbsoluteUrl } from '$lib/site-meta.js';
import { resolveDocumentTitle } from '$lib/site-branding.js';
import { buildFaqPageSchema } from '$lib/signal-cloud-faq.js';
import { markedTextToPlainText } from '$lib/marked-text.js';

/**
 * @param {{ excerpt?: string, body: string }} post
 */
function postDescription(post) {
  if (post.excerpt) {
    return markedTextToPlainText(post.excerpt);
  }

  const firstLine = post.body.split('\n').find((line) => line.trim() !== '');

  return markedTextToPlainText(firstLine?.trim() ?? '');
}

/**
 * @param {string} date
 */
function formatDatePublished(date) {
  const parsed = new Date(`${date}T12:00:00Z`);

  if (Number.isNaN(parsed.getTime())) {
    return date;
  }

  return parsed.toISOString();
}

/**
 * @param {{ id: string, title: string, date: string, excerpt?: string, body: string, image_file?: string }} post
 * @param {{ name: string, url?: string, og_image?: string }} site
 * @param {string} origin
 */
export function buildBlogPostingJsonLd(post, site, origin) {
  const pageUrl = resolveAbsoluteUrl(`/news/${post.id}`, origin, site.url);
  const description = postDescription(post);
  const imageFile = post.image_file || site.og_image;
  const image = imageFile ? resolveAbsoluteImageUrl(imageFile, origin, site.url) : '';
  const publisherName = resolveDocumentTitle(site);

  return {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: markedTextToPlainText(post.title),
    datePublished: formatDatePublished(post.date),
    description,
    url: pageUrl,
    mainEntityOfPage: pageUrl,
    ...(publisherName
      ? {
          publisher: {
            '@type': 'Organization',
            name: publisherName
          }
        }
      : {}),
    ...(image ? { image } : {})
  };
}

/**
 * @param {NonNullable<ReturnType<import('$lib/server/showcase.js').getAboutConfig>>} about
 * @param {{ name: string, url?: string }} site
 * @param {string} origin
 */
export function buildAboutPageJsonLd(about, site, origin) {
  const pageUrl = resolveAbsoluteUrl('/about', origin, site.url);
  const description = markedTextToPlainText(about.intro || about.title);
  const siteLabel = resolveDocumentTitle(site);

  /** @type {Record<string, unknown>} */
  const mainEntity = about.portrait
    ? {
        '@type': 'Person',
        name: markedTextToPlainText(about.title),
        description,
        ...(about.portrait.image_file
          ? {
              image: resolveAbsoluteImageUrl(about.portrait.image_file, origin, site.url)
            }
          : {})
      }
    : {
        '@type': 'Organization',
        ...(siteLabel ? { name: siteLabel } : {}),
        description
      };

  return {
    '@context': 'https://schema.org',
    '@type': 'AboutPage',
    name: markedTextToPlainText(about.title),
    description,
    url: pageUrl,
    mainEntity
  };
}

/**
 * @param {Array<{ question: string, answer: string }>} entries
 * @param {{ url?: string }} site
 * @param {string} origin
 */
export function buildFaqPageJsonLd(entries, site, origin) {
  const pageUrl = resolveAbsoluteUrl('/faq', origin, site.url);

  return buildFaqPageSchema(entries.map((entry) => ({
    question: markedTextToPlainText(entry.question),
    answer: markedTextToPlainText(entry.answer)
  })), pageUrl);
}
