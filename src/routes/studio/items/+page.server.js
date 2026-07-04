// @ts-nocheck

import { guardStudio } from '$lib/server/studio-guard.js';
import { listItemSummaries } from '$lib/server/studio-io.js';

export function load() {
  guardStudio();

  return {
    items: listItemSummaries()
  };
}
