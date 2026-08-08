// @ts-nocheck

import { dev } from '$app/environment';
import { error } from '@sveltejs/kit';
import {
  canAccessStudio,
  resolveStudioRuntimeMode
} from '$lib/studio-runtime.js';

/**
 * Production-safe Studio gating.
 *
 * ADR 0007:
 * - Vite development is Local Studio.
 * - ATELIER_STUDIO=1 enables controlled Local Studio.
 *
 * ADR 0008:
 * - ATELIER_STUDIO_MODE=hosted identifies the separate Hosted Studio runtime.
 * - Hosted Studio remains inaccessible until authentication/authorization is
 *   implemented and supplies a trusted server-side authorization result.
 *
 * Visitor production, invalid configuration, and unauthenticated Hosted Studio
 * fail closed with 404.
 *
 * @see docs/architecture/adr-0007-production-safe-studio-desktop.md
 * @see docs/architecture/adr-0008-hosted-studio-architecture.md
 */

/** @returns {'visitor' | 'local' | 'hosted' | 'invalid'} */
export function getStudioRuntimeMode() {
  return resolveStudioRuntimeMode(dev, process.env);
}

/**
 * Backward-compatible helper for existing callers/tests.
 *
 * Hosted Studio intentionally remains disabled here until the authentication
 * vertical provides an authorization context.
 *
 * @returns {boolean}
 */
export function isStudioEnabled() {
  return canAccessStudio(getStudioRuntimeMode());
}

export function guardStudio() {
  if (!isStudioEnabled()) {
    error(404, 'Not found');
  }
}
