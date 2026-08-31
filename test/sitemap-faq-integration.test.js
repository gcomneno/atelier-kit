import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';

const kitRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const projectEntries = [
  'config',
  'content',
  'scripts',
  'src',
  'static',
  'vendor',
  'jsconfig.json',
  'package.json',
  'package-lock.json',
  'vite.config.js'
];

/** @param {string} root */
function copyProject(root) {
  for (const entry of projectEntries) {
    fs.cpSync(path.join(kitRoot, entry), path.join(root, entry), {
      recursive: true
    });
  }

  fs.symlinkSync(
    path.join(kitRoot, 'node_modules'),
    path.join(root, 'node_modules'),
    process.platform === 'win32' ? 'junction' : 'dir'
  );
}

/**
 * @param {string} root
 * @param {string} signalCloudsYaml
 */
function writeSignalCloudsFixture(root, signalCloudsYaml) {
  fs.writeFileSync(
    path.join(root, 'config/signal-clouds.yaml'),
    signalCloudsYaml
  );
}

test('buildSitemapUrls includes /faq only when eligible FAQ entries exist', async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'atelier-sitemap-faq-'));
  const originalCwd = process.cwd();
  const originalStudio = process.env.ATELIER_STUDIO;

  /** @type {import('vite').ViteDevServer | undefined} */
  let server;

  try {
    copyProject(root);
    process.chdir(root);
    process.env.ATELIER_STUDIO = '1';

    writeSignalCloudsFixture(root, `signal_clouds:
  - id: shipping
    enabled: true
    question: Do you ship throughout Italy?
    faq:
      visible: true
      answer: Yes, we ship throughout Italy.
`);

    server = await createServer({
      root,
      cacheDir: path.join(root, '.vite-sitemap-test-cache'),
      optimizeDeps: {
        noDiscovery: true,
        include: []
      },
      ssr: {
        optimizeDeps: {
          noDiscovery: true,
          include: []
        }
      },
      server: {
        middlewareMode: true,
        hmr: false
      },
      appType: 'custom',
      logLevel: 'error'
    });

    const sitemap = await server.ssrLoadModule('/src/lib/server/sitemap.js');

    const withEligibleFaq = sitemap.buildSitemapUrls('https://example.test');

    assert.ok(
      withEligibleFaq.some(
        /** @param {{ loc: string }} entry */
        (entry) => entry.loc === 'https://example.test/faq'
      ),
      'expected /faq in sitemap when an eligible FAQ entry exists'
    );

    writeSignalCloudsFixture(root, `signal_clouds:
  - id: hidden
    enabled: true
    question: Should this appear?
    faq:
      visible: false
      answer: Hidden answer.
  - id: missing-answer
    enabled: true
    question: Missing answer?
    faq:
      visible: true
      answer: ''
`);

    const withoutEligibleFaq = sitemap.buildSitemapUrls('https://example.test');

    assert.equal(
      withoutEligibleFaq.some(
        /** @param {{ loc: string }} entry */
        (entry) => entry.loc === 'https://example.test/faq'
      ),
      false,
      'expected /faq to be omitted when no eligible FAQ entries exist'
    );
  } finally {
    await server?.close();
    process.chdir(originalCwd);

    if (originalStudio === undefined) {
      delete process.env.ATELIER_STUDIO;
    } else {
      process.env.ATELIER_STUDIO = originalStudio;
    }

    fs.rmSync(root, { recursive: true, force: true });
  }
});
