export const VERCEL_ANALYTICS_PROVIDER = 'vercel';

const DISABLED_SITE_ANALYTICS = Object.freeze({
  provider: '',
  enabled: false
});

/**
 * @param {unknown} value
 * @returns {value is Record<string, unknown>}
 */
function isRecord(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

/**
 * Runtime resolver deliberately fails closed. Structural validation is
 * responsible for rejecting malformed persisted configuration.
 *
 * @param {unknown} value
 * @returns {{ provider: '' | 'vercel', enabled: boolean }}
 */
export function resolveSiteAnalytics(value) {
  if (!isRecord(value)) {
    return DISABLED_SITE_ANALYTICS;
  }

  if (
    value.provider !== VERCEL_ANALYTICS_PROVIDER ||
    value.enabled !== true
  ) {
    return DISABLED_SITE_ANALYTICS;
  }

  return {
    provider: VERCEL_ANALYTICS_PROVIDER,
    enabled: true
  };
}

/**
 * Validate the optional persisted site.analytics contract.
 *
 * @param {unknown} value
 * @returns {{ ok: true } | { ok: false, reason: 'object' | 'provider' | 'enabled' }}
 */
export function validateSiteAnalyticsConfig(value) {
  if (value === undefined) {
    return { ok: true };
  }

  if (!isRecord(value)) {
    return { ok: false, reason: 'object' };
  }

  if (value.provider !== VERCEL_ANALYTICS_PROVIDER) {
    return { ok: false, reason: 'provider' };
  }

  if (typeof value.enabled !== 'boolean') {
    return { ok: false, reason: 'enabled' };
  }

  return { ok: true };
}

/**
 * @param {string} pathname
 */
export function isStudioAnalyticsPath(pathname) {
  return pathname === '/studio' || pathname.startsWith('/studio/');
}

/**
 * Vercel beforeSend boundary. It remains active after a client-side Visitor ->
 * Studio navigation, so Studio page views/events are discarded even when the
 * analytics script was initialized earlier in the Visitor session.
 *
 * @template {{ url?: unknown }} T
 * @param {T} event
 * @returns {T | null}
 */
export function filterVisitorAnalyticsEvent(event) {
  if (typeof event?.url !== 'string' || event.url === '') {
    return event;
  }

  try {
    const pathname = new URL(event.url, 'https://atelier.invalid').pathname;
    return isStudioAnalyticsPath(pathname) ? null : event;
  } catch {
    return event;
  }
}
