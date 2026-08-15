import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { parse, stringify } from 'yaml';

const kitRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..'
);

/** @type {NodeJS.ProcessEnv} */
const childEnv = {
  ...process.env,
  ATELIER_STUDIO: '1'
};

delete childEnv.NODE_TEST_CONTEXT;

test('Local Studio enables and disables site-owned Vercel Analytics without changing unrelated site configuration', () => {
  const parent = fs.mkdtempSync(
    path.join(
      os.tmpdir(),
      'atelier-site-analytics-'
    )
  );

  const target =
    path.join(parent, 'client');

  try {
    const scaffold = spawnSync(
      process.execPath,
      [
        path.join(
          kitRoot,
          'scripts/scaffold-client.js'
        ),
        target,
        '--template',
        'writing'
      ],
      {
        cwd: kitRoot,
        encoding: 'utf8',
        env: childEnv
      }
    );

    assert.equal(
      scaffold.status,
      0,
      `${scaffold.stdout}\n${scaffold.stderr}`
    );

    const sitePath =
      path.join(
        target,
        'config/site.yaml'
      );

    const config =
      parse(
        fs.readFileSync(
          sitePath,
          'utf8'
        )
      );

    config.site.operator_extension = {
      keep: 'unchanged'
    };

    fs.writeFileSync(
      sitePath,
      stringify(config)
    );

    fs.symlinkSync(
      path.join(
        kitRoot,
        'node_modules'
      ),
      path.join(
        target,
        'node_modules'
      ),
      'dir'
    );

    const probe = `
      import assert from 'node:assert/strict';
      import fs from 'node:fs';
      import { createServer } from 'vite';
      import { parse } from 'yaml';

      const server = await createServer({
        root: process.cwd(),
        cacheDir: '.vite-analytics-test-cache',
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
          middlewareMode: true
        },
        appType: 'custom'
      });

      try {
        const studio = await server.ssrLoadModule(
          '/src/lib/server/studio-site-server.js'
        );

        const initial =
          studio.loadAnalyticsForm();

        assert.deepEqual(
          initial,
          {
            provider: '',
            enabled: false
          }
        );

        const enable = new FormData();
        enable.set(
          'analytics_enabled',
          'on'
        );

        const enabledResponse =
          await studio.saveAnalyticsAction({
            request: new Request(
              'http://localhost/studio/site/analytics',
              {
                method: 'POST',
                body: enable
              }
            )
          });

        assert.notEqual(
          enabledResponse?.status,
          400
        );

        let saved =
          parse(
            fs.readFileSync(
              'config/site.yaml',
              'utf8'
            )
          ).site;

        assert.deepEqual(
          saved.analytics,
          {
            provider: 'vercel',
            enabled: true
          }
        );

        assert.deepEqual(
          saved.operator_extension,
          {
            keep: 'unchanged'
          }
        );

        assert.deepEqual(
          studio.loadAnalyticsForm(),
          {
            provider: 'vercel',
            enabled: true
          }
        );

        const disable =
          new FormData();

        const disabledResponse =
          await studio.saveAnalyticsAction({
            request: new Request(
              'http://localhost/studio/site/analytics',
              {
                method: 'POST',
                body: disable
              }
            )
          });

        assert.notEqual(
          disabledResponse?.status,
          400
        );

        saved =
          parse(
            fs.readFileSync(
              'config/site.yaml',
              'utf8'
            )
          ).site;

        assert.equal(
          Object.hasOwn(
            saved,
            'analytics'
          ),
          false
        );

        assert.deepEqual(
          saved.operator_extension,
          {
            keep: 'unchanged'
          }
        );

        assert.deepEqual(
          studio.loadAnalyticsForm(),
          {
            provider: '',
            enabled: false
          }
        );
      } finally {
        await server.close();
      }
    `;

    const result = spawnSync(
      process.execPath,
      [
        '--input-type=module',
        '--eval',
        probe
      ],
      {
        cwd: target,
        encoding: 'utf8',
        env: childEnv
      }
    );

    assert.equal(
      result.status,
      0,
      `${result.stdout}\n${result.stderr}`
    );

    const saved =
      parse(
        fs.readFileSync(
          sitePath,
          'utf8'
        )
      ).site;

    assert.equal(
      Object.hasOwn(
        saved,
        'analytics'
      ),
      false
    );

    assert.deepEqual(
      saved.operator_extension,
      {
        keep: 'unchanged'
      }
    );
  } finally {
    fs.rmSync(
      parent,
      {
        recursive: true,
        force: true
      }
    );
  }
});
