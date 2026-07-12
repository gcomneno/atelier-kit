import { createTranslator } from '$lib/i18n/index.js';
import { resolveLocale } from '$lib/i18n/resolve-locale.js';
import { buildSearchIndex } from '$lib/server/search-index.js';
import { resolveAbsoluteImageUrl } from '$lib/site-meta.js';
import { resolveDocumentTitle } from '$lib/site-branding.js';
import {
  getFaqEntries,
  getAboutConfig,
  getFooterConfig,
  getLayoutConfig,
  getLayoutMenuNav,
  getSiteConfig,
  getSocialConfig,
  isFooterActive,
  getPublicMarkedTextValues
} from '$lib/server/showcase.js';

/** @param {{ url: URL }} event */
export function load({ url }) {
  const site = getSiteConfig();
  const social = getSocialConfig();
  const footer = getFooterConfig();
  const locale = resolveLocale(site.language);
  const t = createTranslator(locale);
  const ogImage = resolveAbsoluteImageUrl(site.og_image, url.origin, site.url);
  const layout = getLayoutConfig();
  const layoutMenuNav = getLayoutMenuNav(layout, locale);
  const faqEntries = getFaqEntries();
  const menuNav =
    faqEntries.length > 0
      ? [...layoutMenuNav, { href: '/faq', label: t('visitor.faq.navLabel') }]
      : layoutMenuNav;
  const documentTitle = resolveDocumentTitle(site);
  const aboutPortrait = getAboutConfig()?.portrait ?? null;

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
      tagline: site.tagline,
      hero_intro: site.hero_intro
    },
    seo: {
      ogImage,
      siteName: documentTitle
    },
    socialLinks: social.links,
    footer,
    footerActive: isFooterActive(footer),
    aboutPortrait,
    menuNav,
    searchIndex: buildSearchIndex(),
    markedTextValues: getPublicMarkedTextValues()
  };
}
