/**
 * @param {string} href
 * @returns {boolean}
 */
export function isValidFooterHref(href) {
  const trimmed = href.trim();

  if (trimmed.startsWith('/')) {
    return true;
  }

  if (trimmed.toLowerCase().startsWith('mailto:')) {
    return trimmed.length > 'mailto:'.length;
  }

  try {
    const url = new URL(trimmed);

    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

/**
 * @param {string} href
 * @returns {boolean}
 */
export function isExternalFooterHref(href) {
  return /^https?:\/\//i.test(href.trim());
}
