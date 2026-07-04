#!/usr/bin/env node

import { existsSync } from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import process from 'node:process';

const ROOT = process.cwd();
const SITE_CONFIG = path.join(ROOT, 'config/site.yaml');
const STUDIO_URL = 'http://127.0.0.1:5173/studio';

if (!existsSync(SITE_CONFIG)) {
  console.error('ERROR: config/site.yaml not found.');
  console.error('Run studio:launch from an Atelier-Kit site folder.');
  process.exit(1);
}

function openBrowser(url) {
  const platform = process.platform;
  const command =
    platform === 'darwin' ? 'open' : platform === 'win32' ? 'cmd' : 'xdg-open';
  const args = platform === 'win32' ? ['/c', 'start', '', url] : [url];

  spawn(command, args, {
    detached: true,
    stdio: 'ignore'
  }).unref();
}

console.log('');
console.log('Atelier-Kit studio launch');
console.log('Starting local authoring and opening the browser...');
console.log('');

setTimeout(() => {
  openBrowser(STUDIO_URL);
}, 1800);

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
