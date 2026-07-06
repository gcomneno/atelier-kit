/**
 * @param {string | undefined | null} value
 */
function trimOrEmpty(value) {
  return typeof value === 'string' ? value.trim() : '';
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

  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }

  const base = trimOrEmpty(siteUrl) || trimOrEmpty(origin);

  if (!base) {
    return trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
  }

  const normalizedBase = base.replace(/\/$/, '');

  if (trimmed.startsWith('/')) {
    return `${normalizedBase}${trimmed}`;
  }

  return `${normalizedBase}/${trimmed}`;
}
