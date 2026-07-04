// @ts-nocheck

import { guardStudio } from '$lib/server/studio-guard.js';
import { runContentDoctorReport } from '$lib/server/studio-io.js';

export function load() {
  guardStudio();

  const report = runContentDoctorReport();

  return {
    report
  };
}
