import { resolveLocale } from '$lib/i18n/resolve-locale.js';
import { buildSearchIndex } from '$lib/server/search-index.js';
import { resolveAbsoluteImageUrl } from '$lib/site-meta.js';
import { resolveDocumentTitle } from '$lib/site-branding.js';
import { getFooterConfig, getLayoutConfig, getLayoutMenuNav, getSiteConfig, getSocialConfig, isFooterActive } from '$lib/server/showcase.js';

/** @param {{ url: URL }} event */
export function load({ url }) {
  const site = getSiteConfig();
  const social = getSocialConfig();
  const footer = getFooterConfig();
  const locale = resolveLocale(site.language);
  const ogImage = resolveAbsoluteImageUrl(site.og_image, url.origin, site.url);
  const layout = getLayoutConfig();
  const menuNav = getLayoutMenuNav(layout, locale);
  const documentTitle = resolveDocumentTitle(site);

  return {
    locale,
    lang: locale,
    appearance: site.appearance,
    site: {
      name: site.name,
      header_title: site.header_title,
      intro_title: site.intro_title,
      header_logo: site.header_logo,
      header_logo_alt: site.header_logo_alt,
      favicon: site.favicon,
      tagline: site.tagline
    },
    seo: {
      ogImage,
      siteName: documentTitle
    },
    socialLinks: social.links,
    footer,
    footerActive: isFooterActive(footer),
    menuNav,
    searchIndex: buildSearchIndex()
  };
}
