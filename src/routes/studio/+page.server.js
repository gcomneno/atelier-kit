import {
  createHostedPrivatePocDashboardData
} from '$lib/server/hosted-private-poc-dashboard.js';
import {
  guardStudio
} from '$lib/server/studio-guard.js';

export function load({ locals }) {
  guardStudio(locals.hostedStudio);

  return {
    hostedPrivatePoc:
      createHostedPrivatePocDashboardData(
        locals.hostedStudio
      )
  };
}
