import { guardStudio } from '$lib/server/studio-guard.js';
import { getOperatorLocale } from '$lib/i18n/server.js';

export function load({ locals }) {
  guardStudio(locals.hostedStudio);

  return {
    studio: true,
    locale: getOperatorLocale()
  };
}
