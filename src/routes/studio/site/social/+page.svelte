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
  const demoSocial = $derived(form?.demoSocial ?? data.demoSocial);
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

<PageIntro>
  {t(
    demoSocial
      ? 'studio.demo.intro'
      : hostedSocial
        ? 'studio.hosted.intro'
        : 'studio.site.intro'
  )}
</PageIntro>

<Panel title={t('studio.site.social.title')} id="social-settings" class="atelier-studio-panel">

  <div class="panel-summary">
    <p>{demoSocial ? t('studio.demo.socialIntro') : t('studio.site.social.intro')}</p>
    {#if demoSocial}
      <p>{t('studio.demo.expiryNote')}</p>
    {/if}
  </div>

  {#if hostedSocial}
    <div class="hosted-authoring-state" data-testid="hosted-authoring-state">
      <strong>{t('studio.hosted.authoringState.title')}</strong>
      <p>{t('studio.hosted.authoringState.revision', { revision: hostedSocial.authoringRevision })}</p>
      <p>{t('studio.hosted.authoringState.deploymentManual')}</p>
    </div>
  {/if}

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
    {:else if demoSocial}
      <input
        type="hidden"
        name="demo_csrf_token"
        value={demoSocial.csrfToken}
      />
      <input
        type="hidden"
        name="authoring_revision"
        value={demoSocial.authoringRevision}
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

    {#if demoSocial && form?.socialStatus === 'success'}
      <div class="demo-after-save">
        <p>{t('studio.demo.savedNote')}</p>
        <a href="/">{t('studio.demo.viewUpdatedSite')}</a>
      </div>
    {/if}
  </form>
</Panel>

<style>
  .hosted-authoring-state {
    display: grid;
    gap: 0.35rem;
    padding: 0.85rem 1rem;
    border: 1px solid var(--studio-border);
    border-radius: 0.75rem;
    background: rgb(45 108 223 / 0.06);
  }

  .hosted-authoring-state strong,
  .hosted-authoring-state p {
    margin: 0;
  }

  .hosted-authoring-state p {
    color: var(--studio-muted);
    line-height: 1.5;
    overflow-wrap: anywhere;
  }

  .demo-after-save {
    display: grid;
    gap: 0.45rem;
    padding: 0.85rem 1rem;
    border: 1px solid var(--studio-border);
    border-radius: 0.75rem;
    background: rgb(45 108 223 / 0.06);
  }

  .demo-after-save p {
    margin: 0;
    color: var(--studio-muted);
    line-height: 1.5;
  }

  .demo-after-save a {
    width: fit-content;
    color: var(--studio-accent);
    font-weight: 700;
  }
</style>
