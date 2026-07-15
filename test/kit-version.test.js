import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { pathToFileURL } from 'node:url';

import {
  detectKitVersion,
  normalizeKitVersion,
  readTrackedKitVersion,
  readManifestKitVersion,
  resolveKitVersion
} from '../scripts/kit-version.js';

/**
 * @param {Record<string, string>} files
 * @param {(rootUrl: URL) => void} callback
 */
function withVersionFiles(files, callback) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'atelier-kit-version-'));

  try {
    for (const [relativePath, content] of Object.entries(files)) {
      fs.writeFileSync(path.join(root, relativePath), content);
    }

    return callback(pathToFileURL(`${root}${path.sep}`));
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
}

test('normalizes supported version strings consistently', () => {
  assert.equal(normalizeKitVersion(' 0.3.0 '), 'v0.3.0');
  assert.equal(normalizeKitVersion('v0.3.0+5'), 'v0.3.0+5');
  assert.equal(normalizeKitVersion('dev-0.3.0'), '');
});

test('does not detect a source archive version from package.json', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'atelier-kit-archive-'));

  try {
    fs.writeFileSync(path.join(root, 'package.json'), JSON.stringify({ version: '0.0.1' }));
    assert.equal(detectKitVersion(root), '');
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('detects a source archive version from CHANGELOG without Git', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'atelier-kit-archive-'));

  try {
    fs.writeFileSync(path.join(root, 'package.json'), JSON.stringify({ version: '0.0.1' }));
    fs.writeFileSync(path.join(root, 'CHANGELOG.md'), '# Changelog\n\n## v0.4.2\n');
    assert.equal(detectKitVersion(root), 'v0.4.2');
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('accepts only the canonical tracked-file representation', () => {
  assert.equal(readTrackedKitVersion('v0.4.0\n'), 'v0.4.0');
  assert.equal(readTrackedKitVersion('v0.4.1-rc.1\n'), 'v0.4.1-rc.1');
  assert.equal(readTrackedKitVersion('v0.4.0+13\n'), 'v0.4.0+13');
  assert.equal(readTrackedKitVersion('v0.4.1-rc.1+build.7\n'), 'v0.4.1-rc.1+build.7');
  assert.equal(readTrackedKitVersion('0.4.0\n'), '');
  assert.equal(readTrackedKitVersion(' v0.4.0\n'), '');
  assert.equal(readTrackedKitVersion('v0.4.0'), '');
});

test('supports current and legacy manifest version shapes', () => {
  assert.equal(readManifestKitVersion({ kitVersion: 'v0.3.0' }), 'v0.3.0');
  assert.equal(readManifestKitVersion({ appliedVersion: '0.2.0' }), 'v0.2.0');
  assert.equal(readManifestKitVersion({ version: 'v0.1.0' }), 'v0.1.0');
  assert.equal(readManifestKitVersion({ kit: { version: '0.4.0-beta.1' } }), 'v0.4.0-beta.1');
  assert.equal(readManifestKitVersion({ applied: { version: 'v0.5.0+2' } }), 'v0.5.0+2');
});

test('prefers the tracked version over the manifest and changelog', () => {
  withVersionFiles(
    {
      '.atelier-kit-version': 'v0.4.0\n',
      '.atelier-kit-upgrade.json': JSON.stringify({ kitVersion: '0.3.0+5' }),
      'CHANGELOG.md': '## v0.2.0\n'
    },
    (rootUrl) => assert.equal(resolveKitVersion(rootUrl), 'v0.4.0')
  );
});

test('resolves a deployed tracked version without the ignored manifest', () => {
  withVersionFiles(
    { '.atelier-kit-version': 'v0.4.0\n' },
    (rootUrl) => assert.equal(resolveKitVersion(rootUrl), 'v0.4.0')
  );
});

test('falls back to the legacy manifest when the tracked file is unusable', () => {
  for (const tracked of [undefined, 'development\n', ' v0.4.0\n', 'v0.4.0']) {
    /** @type {Record<string, string>} */
    const files = { '.atelier-kit-upgrade.json': JSON.stringify({ kitVersion: '0.3.0+5' }) };
    if (tracked !== undefined) files['.atelier-kit-version'] = tracked;
    withVersionFiles(files, (rootUrl) => assert.equal(resolveKitVersion(rootUrl), 'v0.3.0+5'));
  }
});

test('falls back to changelog for missing, malformed and unusable tracked files and manifests', () => {
  for (const manifest of [undefined, '{broken', JSON.stringify({ kitVersion: 'development' })]) {
    /** @type {Record<string, string>} */
    const files = { 'CHANGELOG.md': '## v0.2.0\n' };

    if (manifest !== undefined) {
      files['.atelier-kit-upgrade.json'] = manifest;
    }

    withVersionFiles(files, (rootUrl) => assert.equal(resolveKitVersion(rootUrl), 'v0.2.0'));
  }
});

test('returns an empty version when no source is usable', () => {
  withVersionFiles({ '.atelier-kit-upgrade.json': '{}' }, (rootUrl) => {
    assert.equal(resolveKitVersion(rootUrl), '');
  });
});
