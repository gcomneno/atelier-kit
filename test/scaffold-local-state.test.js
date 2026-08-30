import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const kitRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const childEnv = { ...process.env };
delete childEnv.NODE_TEST_CONTEXT;

test('scaffold excludes source-local env state while preserving sanctioned env examples', () => {
  const parent = fs.mkdtempSync(
    path.join(os.tmpdir(), 'atelier-scaffold-local-state-')
  );
  const source = path.join(parent, 'kit');
  const target = path.join(parent, 'client');

  try {
    fs.mkdirSync(source, { recursive: true });

    fs.writeFileSync(
      path.join(source, 'package.json'),
      `${JSON.stringify(
        {
          name: 'atelier-kit',
          private: true,
          type: 'module',
          version: '0.0.1',
          scripts: {}
        },
        null,
        2
      )}\n`
    );

    fs.writeFileSync(
      path.join(source, '.atelier-kit-version'),
      'v9.9.9\n'
    );

    fs.writeFileSync(
      path.join(source, 'CHANGELOG.md'),
      '# Changelog\n\n## v9.9.9\n'
    );

    fs.writeFileSync(
      path.join(source, 'product-file.txt'),
      'public product surface\n'
    );

    fs.writeFileSync(
      path.join(source, '.env'),
      'SECRET_ROOT=must-not-propagate\n'
    );

    fs.writeFileSync(
      path.join(source, '.env.local'),
      'SECRET_LOCAL=must-not-propagate\n'
    );

    fs.writeFileSync(
      path.join(source, '.env.production'),
      'SECRET_PRODUCTION=must-not-propagate\n'
    );

    fs.writeFileSync(
      path.join(source, '.env.example'),
      'PUBLIC_EXAMPLE=value\n'
    );

    fs.writeFileSync(
      path.join(source, '.env.test'),
      'TEST_ONLY=value\n'
    );

    const scaffold = spawnSync(
      process.execPath,
      [
        path.join(kitRoot, 'scripts/scaffold-client.js'),
        target,
        '--template',
        'writing'
      ],
      {
        cwd: source,
        encoding: 'utf8',
        env: childEnv
      }
    );

    assert.equal(
      scaffold.status,
      0,
      `${scaffold.stdout}\n${scaffold.stderr}`
    );

    assert.equal(
      fs.existsSync(path.join(target, 'product-file.txt')),
      true,
      'ordinary product files must still be copied'
    );

    assert.equal(
      fs.existsSync(path.join(target, '.env')),
      false,
      '.env must not be copied'
    );

    assert.equal(
      fs.existsSync(path.join(target, '.env.local')),
      false,
      '.env.local must not be copied'
    );

    assert.equal(
      fs.existsSync(path.join(target, '.env.production')),
      false,
      '.env.production must not be copied'
    );

    assert.equal(
      fs.readFileSync(path.join(target, '.env.example'), 'utf8'),
      'PUBLIC_EXAMPLE=value\n',
      '.env.example must remain part of the scaffold surface'
    );

    assert.equal(
      fs.readFileSync(path.join(target, '.env.test'), 'utf8'),
      'TEST_ONLY=value\n',
      '.env.test must remain part of the scaffold surface'
    );
  } finally {
    fs.rmSync(parent, { recursive: true, force: true });
  }
});
