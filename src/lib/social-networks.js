/** @typedef {'instagram' | 'facebook' | 'x'} SocialNetworkId */

/** @type {SocialNetworkId[]} */
export const SOCIAL_NETWORK_IDS = ['instagram', 'facebook', 'x'];

/** @type {Record<string, SocialNetworkId>} */
export const SOCIAL_NETWORK_ALIASES = {
  twitter: 'x'
};

/**
 * @param {string} id
 * @returns {SocialNetworkId | ''}
 */
export function normalizeSocialId(id) {
  const lower = id.trim().toLowerCase();
  const normalized = SOCIAL_NETWORK_ALIASES[lower] ?? lower;

  if (SOCIAL_NETWORK_IDS.includes(/** @type {SocialNetworkId} */ (normalized))) {
    return /** @type {SocialNetworkId} */ (normalized);
  }

  return '';
}

/**
 * @param {string} url
 */
export function isValidSocialUrl(url) {
  try {
    const parsed = new URL(url.trim());
    return parsed.protocol === 'https:' || parsed.protocol === 'http:';
  } catch {
    return false;
  }
}
