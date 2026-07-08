// @ts-nocheck

import { dev } from '$app/environment';
import { error } from '@sveltejs/kit';

/**
 * Production-safe studio gating (ADR 0007 — Path B: Atelier Desktop).
 *
 * Write routes are enabled only during local authoring:
 * - Vite dev (`dev === true`), or
 * - explicit `ATELIER_STUDIO=1` (studio:launch / Atelier Desktop on 127.0.0.1).
 *
 * Production Vercel builds must never set `ATELIER_STUDIO`. The public site stays read-only;
 * clients edit via Atelier Desktop on their machine, not via the live URL.
 *
 * @see docs/architecture/adr-0007-production-safe-studio-desktop.md
 */

/** @returns {boolean} */
export function isStudioEnabled() {
  return dev || process.env.ATELIER_STUDIO === '1';
}

export function guardStudio() {
  if (!isStudioEnabled()) {
    error(404, 'Not found');
  }
}
