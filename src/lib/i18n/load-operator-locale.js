// @ts-nocheck

import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { parse } from 'yaml';
import { resolveLocale } from './resolve-locale.js';

/**
 * Read operator locale from config/site.yaml (for Node scripts).
 * @param {string} [root]
 */
export function loadOperatorLocale(root = process.cwd()) {
  const sitePath = path.join(root, 'config/site.yaml');

  if (!existsSync(sitePath)) {
    return resolveLocale(process.env.ATELIER_LOCALE);
  }

  try {
    const data = parse(readFileSync(sitePath, 'utf8'));

    if (data && typeof data === 'object' && !Array.isArray(data)) {
      const site = /** @type {Record<string, unknown>} */ (data).site;

      if (site && typeof site === 'object' && !Array.isArray(site)) {
        const language = /** @type {{ language?: unknown }} */ (site).language;

        if (typeof language === 'string') {
          return resolveLocale(language);
        }
      }
    }
  } catch {
    // fall through
  }

  return resolveLocale(process.env.ATELIER_LOCALE);
}
