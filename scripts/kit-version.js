import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import path from 'node:path';

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

/** @param {unknown} value */
export function readTrackedKitVersion(value) {
  const version = normalizeKitVersion(value);
  return typeof value === 'string' && value === `${version}\n` ? version : '';
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
 * Detect the version represented by an Atelier-Kit source checkout.
 *
 * @param {string} kitRoot
 * @returns {string}
 */
export function detectKitVersion(kitRoot) {
  const exactTag = spawnSync('git', ['-C', kitRoot, 'describe', '--tags', '--exact-match'], { encoding: 'utf8' });
  if (exactTag.status === 0) return normalizeKitVersion(exactTag.stdout);

  let changelogVersion = '';
  try {
    const content = readFileSync(path.join(kitRoot, 'CHANGELOG.md'), 'utf8');
    const match = content.match(/^##\s+(v?\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?)/m);
    changelogVersion = normalizeKitVersion(match?.[1]);
  } catch {
    // Missing or unreadable changelogs leave Git as the only version source.
  }

  const nearestTag = spawnSync('git', ['-C', kitRoot, 'describe', '--tags', '--abbrev=0'], { encoding: 'utf8' });
  if (nearestTag.status === 0) {
    const tag = normalizeKitVersion(nearestTag.stdout);
    if (changelogVersion && changelogVersion !== tag) return changelogVersion;
    const ahead = spawnSync('git', ['-C', kitRoot, 'rev-list', `${tag}..HEAD`, '--count'], { encoding: 'utf8' });
    const commitCount = Number.parseInt(String(ahead.stdout).trim(), 10);
    if (tag && Number.isFinite(commitCount) && commitCount > 0) return `${tag}+${commitCount}`;
    if (tag) return tag;
  }

  if (changelogVersion) return changelogVersion;
  return '';
}

/**
 * Resolve the applied Kit version from the tracked version file, falling back to
 * the upgrade manifest and changelog for legacy clients and upstream checkouts.
 *
 * @param {URL} rootUrl
 * @returns {string}
 */
export function resolveKitVersion(rootUrl = new URL('../', import.meta.url)) {
  try {
    const version = readTrackedKitVersion(
      readFileSync(new URL('.atelier-kit-version', rootUrl), 'utf8')
    );

    if (version) {
      return version;
    }
  } catch {
    // Missing and malformed tracked files intentionally use legacy fallbacks.
  }

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
