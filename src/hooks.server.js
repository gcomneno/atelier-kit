import { resolveLocale } from '$lib/i18n/resolve-locale.js';
import { getSiteConfig } from '$lib/server/showcase.js';

/** @type {import('@sveltejs/kit').Handle} */
export async function handle({ event, resolve }) {
  let lang = 'en';

  try {
    const site = getSiteConfig();
    lang = resolveLocale(site.language);
  } catch {
    // Keep default during unusual build or missing config edge cases.
  }

  return resolve(event, {
    transformPageChunk: ({ html }) => html.replaceAll('%lang%', lang)
  });
}
