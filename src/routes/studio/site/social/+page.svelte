<script>
  import { Button, FormActions, PageIntro, Panel } from 'giadaware-ui-components/studio';
  import { enhance } from '$app/forms';
  import StudioFieldLabel from '$lib/components/StudioFieldLabel.svelte';
  import StudioFormLegend from '$lib/components/StudioFormLegend.svelte';
  import StudioFormStatus from '$lib/components/AtelierFormStatus.svelte';
  import { useI18n } from '$lib/i18n/context.js';
  import { studioFormDirty, studioFormEnhanceDirty } from '$lib/studio-form-dirty.js';
  import { SOCIAL_NETWORK_IDS } from '$lib/social-networks.js';

  const t = useI18n();

  let { data, form } = $props();

  const socialForm = $derived(form?.socialForm ?? data.socialForm);
  const hostedSocial = $derived(form?.hostedSocial ?? data.hostedSocial);
  let isDirty = $state(false);
  /** @type {import('$lib/studio-form-dirty.js').StudioFormDirtyControl} */
  const dirtyControl = {};

  $effect(() => {
    socialForm;
    dirtyControl.resetBaseline?.();
  });
</script>

<svelte:head>
  <title>{t('studio.site.pageTitle')}</title>
</svelte:head>

<PageIntro>{t('studio.site.intro')}</PageIntro>

<Panel title={t('studio.site.social.title')} id="social-settings" class="atelier-studio-panel">

  <div class="panel-summary">
    <p>{t('studio.site.social.intro')}</p>
  </div>

  <form
    method="POST"
    action="?/saveSocial"
    use:studioFormDirty={{ setDirty: (value) => (isDirty = value), dirtyControl }}
    use:enhance={() => studioFormEnhanceDirty(dirtyControl)}
  >
    {#if hostedSocial}
      <input
        type="hidden"
        name="hosted_csrf_token"
        value={hostedSocial.csrfToken}
      />
      <input
        type="hidden"
        name="authoring_revision"
        value={hostedSocial.authoringRevision}
      />
    {/if}

    <StudioFormLegend />

    {#each SOCIAL_NETWORK_IDS as networkId}
      <label>
        <StudioFieldLabel
          label={t(`studio.site.social.${networkId}`)}
          hint={networkId === 'github' ? t('studio.site.social.githubHint') : ''}
          optional
        />
        <input name={`url_${networkId}`} type="url" value={socialForm[networkId]} />
      </label>
    {/each}

    <FormActions>
      <Button type="submit" disabled={!isDirty}>{t('studio.site.social.save')}</Button>
    </FormActions>

    <StudioFormStatus message={form?.socialMessage} status={form?.socialStatus} />
  </form>
</Panel>
