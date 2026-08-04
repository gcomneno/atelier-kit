<script>
  import { FieldLabel } from 'giadaware-ui-components/studio';
  import { useI18n } from '$lib/i18n/context.js';

  /** @type {{ label: string, hint?: string, required?: boolean, optional?: boolean, hintId?: string }} */
  let {
    label,
    hint = '',
    required = false,
    optional = false,
    hintId
  } = $props();

  const t = useI18n();
</script>

<span class="atelier-field-label">
  <FieldLabel
    {label}
    {hint}
    {required}
    {optional}
    requiredLabel={t('studio.forms.required')}
    optionalLabel={t('studio.forms.optional')}
    {hintId}
    class="atelier-field-label__row"
  />
</span>

<style>
  .atelier-field-label {
    --giu-field-label-row-gap: 0.35rem;
    --giu-field-label-color: var(--studio-text);
    --giu-field-label-weight: 500;
    --giu-field-label-line-height: 1.4;
    --giu-field-label-marker-size: 0.85em;
    --giu-field-label-marker-weight: 500;
    --giu-field-label-required-color: #b42318;
    --giu-field-label-optional-color: var(--studio-muted);
    --giu-field-label-hint-gap: 0;
    --giu-field-label-hint-color: var(--studio-muted);
    --giu-field-label-hint-size: 0.85rem;
    --giu-field-label-hint-line-height: 1.4;

    display: grid;
    gap: 0.4rem;
  }

  :global(.atelier-field-label__row) {
    display: flex;
    flex-wrap: wrap;
    align-items: baseline;
  }
</style>
