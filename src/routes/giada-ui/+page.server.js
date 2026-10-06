import { error } from '@sveltejs/kit';
import { getStudioRuntimeMode } from '$lib/server/studio-guard.js';

export const prerender = false;

/** @type {import('./$types').PageServerLoad} */
export function load() {
  if (getStudioRuntimeMode() !== 'demo') {
    error(404, 'Not found');
  }

  return {};
}
