import { resolveLocale } from '$lib/i18n/resolve-locale.js';
import { resolveAbsoluteImageUrl } from '$lib/site-meta.js';
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

  return {
    locale,
    lang: locale,
    appearance: site.appearance,
    site: {
      name: site.name
    },
    seo: {
      ogImage,
      siteName: site.name
    },
    socialLinks: social.links,
    footer,
    footerActive: isFooterActive(footer),
    menuNav
  };
}
