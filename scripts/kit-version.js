import { readFileSync } from 'node:fs';

const VERSION_PATTERN = /^v?(\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?)$/;

/**
 * @param {unknown} value
 * @returns {string}
 */
export function normalizeKitVersion(value) {
  if (typeof value !== 'string') {
    return '';
  }

  const match = value.trim().match(VERSION_PATTERN);
  return match ? `v${match[1]}` : '';
}

/**
 * @param {unknown} manifest
 * @returns {string}
 */
export function readManifestKitVersion(manifest) {
  if (!manifest || typeof manifest !== 'object' || Array.isArray(manifest)) {
    return '';
  }

  const record = /** @type {Record<string, unknown>} */ (manifest);
  const kit =
    record.kit && typeof record.kit === 'object'
      ? /** @type {Record<string, unknown>} */ (record.kit)
      : {};
  const applied =
    record.applied && typeof record.applied === 'object'
      ? /** @type {Record<string, unknown>} */ (record.applied)
      : {};

  for (const candidate of [
    record.kitVersion,
    record.appliedVersion,
    record.version,
    kit.version,
    applied.version
  ]) {
    const version = normalizeKitVersion(candidate);

    if (version) {
      return version;
    }
  }

  return '';
}

/**
 * Resolve the applied Kit version from the upgrade manifest, falling back to the
 * latest changelog release for upstream checkouts and legacy clients.
 *
 * @param {URL} rootUrl
 * @returns {string}
 */
export function resolveKitVersion(rootUrl = new URL('../', import.meta.url)) {
  try {
    const manifest = JSON.parse(readFileSync(new URL('.atelier-kit-upgrade.json', rootUrl), 'utf8'));
    const version = readManifestKitVersion(manifest);

    if (version) {
      return version;
    }
  } catch {
    // Missing and malformed manifests intentionally use the legacy fallback.
  }

  try {
    const content = readFileSync(new URL('CHANGELOG.md', rootUrl), 'utf8');
    const match = content.match(/^##\s+(v?\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?)/m);
    return normalizeKitVersion(match?.[1]);
  } catch {
    return '';
  }
}
