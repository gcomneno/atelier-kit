import { guardStudio } from '$lib/server/studio-guard.js';
export function load() {
  guardStudio();
  return {};
}
