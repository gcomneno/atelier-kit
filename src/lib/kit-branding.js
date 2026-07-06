/** Framework kit credit — not client-editable via site config. */
export const KIT_NAME = 'Atelier-Kit';
export const KIT_PROJECT_URL = 'https://github.com/gcomneno/atelier-kit';

/**
 * @param {string} locale
 * @returns {{ prefix: string, brand: string }}
 */
export function getKitCreditParts(locale) {
  return locale === 'it'
    ? { prefix: 'Realizzato con ', brand: KIT_NAME }
    : { prefix: 'Built with ', brand: KIT_NAME };
}

/**
 * @param {string} locale
 */
export function getKitCreditLabel(locale) {
  const { prefix, brand } = getKitCreditParts(locale);
  return `${prefix}${brand}`;
}
