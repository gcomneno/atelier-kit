// @ts-nocheck

import { dev } from '$app/environment';
import { error } from '@sveltejs/kit';

/** @returns {boolean} */
export function isStudioEnabled() {
  return dev || process.env.ATELIER_STUDIO === '1';
}

export function guardStudio() {
  if (!isStudioEnabled()) {
    error(404, 'Not found');
  }
}
