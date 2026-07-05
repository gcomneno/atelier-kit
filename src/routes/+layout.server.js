import { resolveLocale } from '$lib/i18n/resolve-locale.js';
import { getFooterConfig, getSiteConfig, getSocialConfig, isFooterActive } from '$lib/server/showcase.js';

export function load() {
  const site = getSiteConfig();
  const social = getSocialConfig();
  const footer = getFooterConfig();
  const locale = resolveLocale(site.language);

  return {
    locale,
    lang: locale,
    appearance: site.appearance,
    site: {
      name: site.name
    },
    socialLinks: social.links,
    footer,
    footerActive: isFooterActive(footer)
  };
}
