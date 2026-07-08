/**
 * @param {string | undefined | null} value
 */
function trimOrEmpty(value) {
  return typeof value === 'string' ? value.trim() : '';
}

/**
 * Resolve a site path or URL to an absolute URL.
 *
 * @param {string} path Site path (e.g. `/about`) or absolute URL
 * @param {string} origin Request origin, e.g. https://example.vercel.app
 * @param {string | undefined | null} [siteUrl] Optional canonical site URL from config
 * @returns {string}
 */
export function resolveAbsoluteUrl(path, origin, siteUrl = '') {
  const trimmed = trimOrEmpty(path);

  if (!trimmed) {
    return '';
  }

  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }

  const normalizedPath = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
  const base = trimOrEmpty(siteUrl) || trimOrEmpty(origin);

  if (!base) {
    return normalizedPath;
  }

  const normalizedBase = base.replace(/\/$/, '');
  return `${normalizedBase}${normalizedPath}`;
}

/**
 * Resolve a site image path or URL to an absolute URL for Open Graph crawlers.
 *
 * @param {string | undefined | null} image
 * @param {string} origin Request origin, e.g. https://example.vercel.app
 * @param {string | undefined | null} [siteUrl] Optional canonical site URL from config
 * @returns {string}
 */
export function resolveAbsoluteImageUrl(image, origin, siteUrl = '') {
  const trimmed = trimOrEmpty(image);

  if (!trimmed) {
    return '';
  }

  return resolveAbsoluteUrl(trimmed, origin, siteUrl);
}
