/** Framework kit credit — not client-editable via site config. */
export const KIT_NAME = 'Atelier-Kit';
export const KIT_PROJECT_URL = 'https://github.com/gcomneno/atelier-kit';
/** Latest release from CHANGELOG.md, injected at build/dev time via Vite. */
export const KIT_VERSION = import.meta.env.KIT_VERSION ?? '';

/**
 * @param {string} locale
 * @returns {{ prefix: string, brand: string, suffix: string }}
 */
export function getKitCreditParts(locale) {
  const suffix = KIT_VERSION ? ` ${KIT_VERSION}` : '';

  return locale === 'it'
    ? { prefix: 'Realizzato con ', brand: KIT_NAME, suffix }
    : { prefix: 'Built with ', brand: KIT_NAME, suffix };
}

/**
 * @param {string} locale
 */
export function getKitCreditLabel(locale) {
  const { prefix, brand, suffix } = getKitCreditParts(locale);
  return `${prefix}${brand}${suffix}`;
}
