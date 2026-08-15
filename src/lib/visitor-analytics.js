import {
  filterVisitorAnalyticsEvent,
  isStudioAnalyticsPath,
  resolveSiteAnalytics
} from './site-analytics.js';

/** @type {Promise<void> | null} */
let injectionPromise = null;

/**
 * @param {unknown} settings
 * @param {string} pathname
 */
export function shouldInitializeVisitorAnalytics(settings, pathname) {
  const analytics = resolveSiteAnalytics(settings);

  return (
    analytics.enabled &&
    analytics.provider === 'vercel' &&
    !isStudioAnalyticsPath(pathname)
  );
}

/**
 * Initialize Vercel Analytics only from a Visitor route.
 *
 * Direct Studio loads never import the analytics package. If Analytics was
 * already initialized during a Visitor session, beforeSend still drops every
 * later Studio event.
 *
 * @param {unknown} settings
 * @param {string} pathname
 * @param {() => Promise<{ injectAnalytics: (options?: object) => void }>} [loadAnalytics]
 * @returns {Promise<void> | null}
 */
export function initializeVisitorAnalytics(
  settings,
  pathname,
  loadAnalytics = () => import('@vercel/analytics/sveltekit')
) {
  if (!shouldInitializeVisitorAnalytics(settings, pathname)) {
    return null;
  }

  if (!injectionPromise) {
    injectionPromise = Promise.resolve(loadAnalytics()).then((analytics) => {
      if (typeof analytics.injectAnalytics !== 'function') {
        throw new Error(
          'Vercel SvelteKit Analytics injectAnalytics() export is unavailable.'
        );
      }

      analytics.injectAnalytics({
        beforeSend: filterVisitorAnalyticsEvent
      });
    });
  }

  return injectionPromise;
}

/**
 * Test-only reset for the module-level single-injection guard.
 */
export function resetVisitorAnalyticsForTests() {
  injectionPromise = null;
}
