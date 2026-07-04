#!/usr/bin/env node

import { existsSync } from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import process from 'node:process';

const ROOT = process.cwd();
const SITE_CONFIG = path.join(ROOT, 'config/site.yaml');

if (!existsSync(SITE_CONFIG)) {
  console.error('ERROR: config/site.yaml not found.');
  console.error('Run the studio from an Atelier-Kit site folder.');
  process.exit(1);
}

console.log('');
console.log('Atelier-Kit studio');
console.log('Local authoring only. Do not expose this server publicly.');
console.log('');
console.log('Open: http://127.0.0.1:5173/studio');
console.log('Preview site: http://127.0.0.1:5173/');
console.log('');

const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const child = spawn(npmCommand, ['run', 'dev', '--', '--host', '127.0.0.1', '--port', '5173'], {
  cwd: ROOT,
  stdio: 'inherit',
  env: {
    ...process.env,
    ATELIER_STUDIO: '1'
  }
});

child.on('exit', (code) => {
  process.exit(code ?? 1);
});
