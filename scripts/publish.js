#!/usr/bin/env node

import { spawnSync } from 'node:child_process';
import process from 'node:process';

const DEPLOY = process.argv.includes('--deploy');
const STRICT = process.argv.includes('--strict');

/** @type {[string, string[]][]} */
const steps = [
  ['Structural validation', ['run', 'content:validate']],
  ['Content Doctor', ['run', 'content:doctor', ...(STRICT ? ['--', '--strict'] : [])]],
  ['Type and Svelte checks', ['run', 'check']],
  ['Production build', ['run', 'build']]
];

function runStep(label, args) {
  console.log(`\n→ ${label}`);

  const result = spawnSync('npm', args, {
    stdio: 'inherit',
    shell: false
  });

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

console.log('Atelier-Kit publish prep');
console.log('This runs validation, doctor, check and build.');

for (const [label, args] of steps) {
  runStep(label, args);
}

if (DEPLOY) {
  console.log('\n→ Vercel production deploy');
  const deploy = spawnSync('npx', ['vercel', '--prod'], { stdio: 'inherit' });

  if (deploy.status !== 0) {
    process.exit(deploy.status ?? 1);
  }
} else {
  console.log('\nPublish prep complete.');
  console.log('Preview locally with: npm run preview');
  console.log('Deploy to Vercel with: npm run publish -- --deploy');
}
