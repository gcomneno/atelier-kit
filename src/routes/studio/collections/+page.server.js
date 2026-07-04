// @ts-nocheck

import { guardStudio } from '$lib/server/studio-guard.js';
import { listCollectionSummaries } from '$lib/server/studio-io.js';

export function load() {
  guardStudio();

  return {
    collections: listCollectionSummaries()
  };
}
