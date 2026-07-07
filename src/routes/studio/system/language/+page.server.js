// @ts-nocheck

import { redirect } from '@sveltejs/kit';
import { guardStudio } from '$lib/server/studio-guard.js';

export function load() {
  guardStudio();
  redirect(308, '/studio/system');
}
