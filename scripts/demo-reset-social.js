#!/usr/bin/env node

import {
  resetDemoSocialSandbox
} from '../src/lib/server/demo-social-authoring.js';

async function main() {
  const result =
    await resetDemoSocialSandbox({
      environment: process.env
    });

  console.log(
    'Demo Social sandbox reset completed.'
  );
  console.log(
    `Previous revision: ${result.previousRevision}`
  );
  console.log(
    `New revision:      ${result.revision}`
  );
}

main().catch(() => {
  console.error(
    'Demo Social sandbox reset failed.'
  );
  process.exitCode = 1;
});
