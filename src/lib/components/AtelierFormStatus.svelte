<script>
  import { FormStatus } from 'giadaware-ui-components';
  import {
    resolveAtelierFormStatusDuration,
    resolveAtelierFormStatusTone
  } from '$lib/form-status-adapter.js';

  /** @type {{ message?: string, status?: string, durationMs?: number | null }} */
  let { message = '', status = 'info', durationMs } = $props();

  const tone = $derived(resolveAtelierFormStatusTone(status));
  const resolvedDurationMs = $derived(resolveAtelierFormStatusDuration(tone, durationMs));
</script>

<FormStatus
  {message}
  {tone}
  durationMs={resolvedDurationMs}
  class="atelier-form-status"
/>

<style>
  :global(.atelier-form-status) {
    --giu-form-status-padding: 0.85rem 1rem;
    --giu-form-status-border-width: 0;
    --giu-form-status-border-radius: 0.75rem;
    --giu-form-status-line-height: 1.5;
    --giu-form-status-success-background: rgb(32 142 88 / 0.12);
    --giu-form-status-success-color: #176742;
    --giu-form-status-warning-background: rgb(214 155 35 / 0.15);
    --giu-form-status-warning-color: #6b4b0a;
    --giu-form-status-error-background: rgb(191 56 56 / 0.12);
    --giu-form-status-error-color: #7f2222;
    --giu-form-status-info-background: rgb(45 108 223 / 0.1);
    --giu-form-status-info-color: #143870;
  }
</style>
