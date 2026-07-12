import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { pathToFileURL } from 'node:url';

import {
  normalizeKitVersion,
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

test('supports current and legacy manifest version shapes', () => {
  assert.equal(readManifestKitVersion({ kitVersion: 'v0.3.0' }), 'v0.3.0');
  assert.equal(readManifestKitVersion({ appliedVersion: '0.2.0' }), 'v0.2.0');
  assert.equal(readManifestKitVersion({ version: 'v0.1.0' }), 'v0.1.0');
  assert.equal(readManifestKitVersion({ kit: { version: '0.4.0-beta.1' } }), 'v0.4.0-beta.1');
  assert.equal(readManifestKitVersion({ applied: { version: 'v0.5.0+2' } }), 'v0.5.0+2');
});

test('prefers the applied manifest version over the changelog', () => {
  withVersionFiles(
    {
      '.atelier-kit-upgrade.json': JSON.stringify({ kitVersion: '0.3.0+5' }),
      'CHANGELOG.md': '## v0.2.0\n'
    },
    (rootUrl) => assert.equal(resolveKitVersion(rootUrl), 'v0.3.0+5')
  );
});

test('falls back to changelog for missing, malformed and unusable manifests', () => {
  for (const manifest of [undefined, '{broken', JSON.stringify({ kitVersion: 'development' })]) {
    /** @type {Record<string, string>} */
    const files = { 'CHANGELOG.md': '## v0.2.0\n' };

    if (manifest !== undefined) {
      files['.atelier-kit-upgrade.json'] = manifest;
    }

    withVersionFiles(files, (rootUrl) => assert.equal(resolveKitVersion(rootUrl), 'v0.2.0'));
  }
});

test('returns an empty version when neither source is usable', () => {
  withVersionFiles({ '.atelier-kit-upgrade.json': '{}' }, (rootUrl) => {
    assert.equal(resolveKitVersion(rootUrl), '');
  });
});
