<script>
  import { enhance } from '$app/forms';
  import StudioFieldLabel from '$lib/components/StudioFieldLabel.svelte';
  import StudioFormLegend from '$lib/components/StudioFormLegend.svelte';
  import StudioFormStatus from '$lib/components/StudioFormStatus.svelte';
  import { useI18n } from '$lib/i18n/context.js';
  import { studioFormDirty, studioFormEnhanceDirty } from '$lib/studio-form-dirty.js';
  import { SOCIAL_NETWORK_IDS } from '$lib/social-networks.js';

  const t = useI18n();

  let { data, form } = $props();

  const socialForm = $derived(form?.socialForm ?? data.socialForm);
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

<p class="studio-intro">{t('studio.site.intro')}</p>

<section class="studio-panel" aria-labelledby="social-settings-title">
  <div class="panel-heading">
    <h2 id="social-settings-title">{t('studio.site.social.title')}</h2>
    <p>{t('studio.site.social.intro')}</p>
  </div>

  <form
    method="POST"
    action="?/saveSocial"
    use:studioFormDirty={{ setDirty: (value) => (isDirty = value), dirtyControl }}
    use:enhance={() => studioFormEnhanceDirty(dirtyControl)}
  >
    <StudioFormLegend />

    {#each SOCIAL_NETWORK_IDS as networkId}
      <label>
        <StudioFieldLabel label={t(`studio.site.social.${networkId}`)} optional />
        <input name={`url_${networkId}`} type="url" value={socialForm[networkId]} />
      </label>
    {/each}

    <div class="actions">
      <button type="submit" disabled={!isDirty}>{t('studio.site.social.save')}</button>
    </div>

    <StudioFormStatus message={form?.socialMessage} status={form?.socialStatus} />
  </form>
</section>
