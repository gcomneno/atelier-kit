<script>
  import { enhance } from '$app/forms';
  import { useI18n } from '$lib/i18n/context.js';
  import { resolveLocale, SUPPORTED_LOCALES } from '$lib/i18n/resolve-locale.js';
  import { studioFormEnhance } from '$lib/studio-form-enhance.js';

  const t = useI18n();

  let { data, form } = $props();

  const siteForm = $derived(form?.siteForm ?? data.siteForm);
  let language = $state('en');

  $effect(() => {
    language = resolveLocale(siteForm.language);
  });
</script>

<svelte:head>
  <title>{t('studio.site.pageTitle')}</title>
</svelte:head>

<p class="studio-intro">{t('studio.site.intro')}</p>

<section class="studio-panel" aria-labelledby="site-settings-title">
  <div class="panel-heading">
    <h2 id="site-settings-title">{t('studio.site.identity.title')}</h2>
    <p>{t('studio.site.identity.intro')}</p>
  </div>

  <form method="POST" action="?/saveSite" use:enhance={studioFormEnhance}>
    <label>
      {t('studio.site.identity.siteTitle')}
      <input name="name" value={siteForm.name} required />
    </label>

    <label>
      {t('studio.site.identity.tagline')}
      <input name="tagline" value={siteForm.tagline} required />
    </label>

    <label>
      {t('studio.site.identity.heroIntro')}
      <span class="hint">{t('studio.site.identity.heroIntroHint')}</span>
      <textarea name="hero_intro" rows="12">{siteForm.hero_intro}</textarea>
    </label>

    <label>
      {t('studio.site.identity.heroSignature')}
      <span class="hint">{t('studio.site.identity.heroSignatureHint')}</span>
      <textarea name="hero_signature" rows="3">{siteForm.hero_signature}</textarea>
    </label>

    <label>
      {t('studio.site.identity.language')}
      <select name="language" bind:value={language}>
        {#each SUPPORTED_LOCALES as code}
          <option value={code}>{t(`studio.site.identity.languages.${code}`)}</option>
        {/each}
      </select>
    </label>

    <label>
      {t('studio.site.identity.notice')}
      <span class="hint">{t('studio.site.identity.noticeHint')}</span>
      <textarea name="notice" rows="3">{siteForm.notice}</textarea>
    </label>

    <label>
      {t('studio.site.identity.footerNote')}
      <span class="hint">{t('studio.site.identity.footerNoteHint')}</span>
      <input name="footer_note" value={siteForm.footer_note} />
    </label>

    <label>
      {t('studio.site.identity.siteUrl')}
      <span class="hint">{t('studio.site.identity.siteUrlHint')}</span>
      <input name="url" type="url" value={siteForm.url} placeholder="https://example.com" />
    </label>

    <label>
      {t('studio.site.identity.ogImage')}
      <span class="hint">{t('studio.site.identity.ogImageHint')}</span>
      <input name="og_image" value={siteForm.og_image} placeholder="/images/site/og.jpg" />
    </label>

    <div class="actions">
      <button type="submit">{t('studio.site.identity.save')}</button>
    </div>

    {#if form?.siteMessage}
      <p class={`status ${form.siteStatus || 'info'}`}>{form.siteMessage}</p>
    {/if}
  </form>
</section>
