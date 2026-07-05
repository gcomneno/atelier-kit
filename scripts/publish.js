#!/usr/bin/env node

import { spawnSync } from 'node:child_process';
import process from 'node:process';
import { createTranslator } from '../src/lib/i18n/index.js';
import { loadOperatorLocale } from '../src/lib/i18n/load-operator-locale.js';

const DEPLOY = process.argv.includes('--deploy');
const STRICT = process.argv.includes('--strict');
const locale = loadOperatorLocale();
const t = createTranslator(locale);

/** @type {[string, string[]][]} */
const steps = [
  [t('publish.stepValidation'), ['run', 'content:validate']],
  [t('publish.stepDoctor'), ['run', 'content:doctor', ...(STRICT ? ['--', '--strict'] : [])]],
  [t('publish.stepCheck'), ['run', 'check']],
  [t('publish.stepBuild'), ['run', 'build']]
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

console.log(t('publish.title'));
console.log(t('publish.intro'));

for (const [label, args] of steps) {
  runStep(label, args);
}

if (DEPLOY) {
  console.log(`\n→ ${t('publish.stepDeploy')}`);
  const deploy = spawnSync('npx', ['vercel', '--prod'], { stdio: 'inherit' });

  if (deploy.status !== 0) {
    process.exit(deploy.status ?? 1);
  }
} else {
  console.log(`\n${t('publish.complete')}`);
  console.log(t('publish.previewHint'));
  console.log(t('publish.deployHint'));
}
