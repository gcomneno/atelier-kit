<script>
  /** @type {{ message?: string, status?: string, durationMs?: number }} */
  let { message = '', status = 'info', durationMs = 5000 } = $props();

  let visible = $state(false);

  $effect(() => {
    if (!message) {
      visible = false;
      return;
    }

    visible = true;

    const timer = setTimeout(() => {
      visible = false;
    }, durationMs);

    return () => clearTimeout(timer);
  });

  const tone = $derived(
    status === 'success' || status === 'warning' || status === 'error' ? status : 'info'
  );
</script>

{#if visible && message}
  <p class={`status ${tone}`} role="status" aria-live="polite">{message}</p>
{/if}

<style>
  .status {
    margin: 0;
    padding: 0.85rem 1rem;
    border-radius: 0.75rem;
    white-space: pre-wrap;
    line-height: 1.5;
  }

  .status.success {
    background: rgb(32 142 88 / 0.12);
    color: #176742;
  }

  .status.warning {
    background: rgb(214 155 35 / 0.15);
    color: #6b4b0a;
  }

  .status.error {
    background: rgb(191 56 56 / 0.12);
    color: #7f2222;
  }

  .status.info {
    background: rgb(45 108 223 / 0.1);
    color: #143870;
  }
</style>
