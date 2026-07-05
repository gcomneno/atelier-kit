// @ts-nocheck

import { guardStudio } from '$lib/server/studio-guard.js';
import { listNewsSummaries } from '$lib/server/studio-io.js';

export function load() {
  guardStudio();

  return {
    posts: listNewsSummaries()
  };
}
