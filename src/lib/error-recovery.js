/**
 * Select the global error-page recovery destination from the requested URL.
 *
 * @param {string} pathname
 * @param {number} status
 */
export function getErrorRecovery(pathname, status) {
  const isMissingItem =
    status === 404 && /^\/items\/([^/]+)\/?$/.test(pathname);

  if (isMissingItem) {
    return { href: '/catalog', labelKey: 'common.backToCatalog' };
  }

  if (pathname === '/studio' || pathname.startsWith('/studio/')) {
    return { href: '/studio', labelKey: 'error.backToStudio' };
  }

  return { href: '/', labelKey: 'error.backToHome' };
}
