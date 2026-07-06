<script>
  import { enhance } from '$app/forms';
  import { useI18n } from '$lib/i18n/context.js';
  import { studioFormEnhance } from '$lib/studio-form-enhance.js';
  import { SOCIAL_NETWORK_IDS } from '$lib/social-networks.js';

  const t = useI18n();

  let { data, form } = $props();

  const socialForm = $derived(form?.socialForm ?? data.socialForm);
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

  <form method="POST" action="?/saveSocial" use:enhance={studioFormEnhance}>
    {#each SOCIAL_NETWORK_IDS as networkId}
      <label>
        {t(`studio.site.social.${networkId}`)}
        <input name={`url_${networkId}`} type="url" value={socialForm[networkId]} />
      </label>
    {/each}

    <div class="actions">
      <button type="submit">{t('studio.site.social.save')}</button>
    </div>

    {#if form?.socialMessage}
      <p class={`status ${form.socialStatus || 'info'}`}>{form.socialMessage}</p>
    {/if}
  </form>
</section>
