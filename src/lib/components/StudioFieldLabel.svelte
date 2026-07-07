<script>
  import { useI18n } from '$lib/i18n/context.js';

  /** @type {{ label: string, hint?: string, required?: boolean, optional?: boolean }} */
  let { label, hint = '', required = false, optional = false } = $props();

  const t = useI18n();
</script>

<span class="field-label-row">
  <span class="field-label">{label}</span>
  {#if required}
    <abbr class="field-badge required" title={t('studio.forms.required')}>*</abbr>
  {:else if optional}
    <span class="field-badge optional">{t('studio.forms.optional')}</span>
  {/if}
</span>
{#if hint}
  <span class="hint">{hint}</span>
{/if}
