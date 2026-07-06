<script>
  import { enhance } from '$app/forms';
  import { useI18n } from '$lib/i18n/context.js';
  import { studioFormEnhance } from '$lib/studio-form-enhance.js';

  const t = useI18n();

  let { data, form } = $props();

  const contactForm = $derived(form?.contactForm ?? data.contactForm);
  let emailEnabled = $state(false);
  let whatsappEnabled = $state(false);

  $effect(() => {
    emailEnabled = contactForm.email_enabled;
    whatsappEnabled = contactForm.whatsapp_enabled;
  });
</script>

<svelte:head>
  <title>{t('studio.site.pageTitle')}</title>
</svelte:head>

<p class="studio-intro">{t('studio.site.intro')}</p>

<section class="studio-panel" aria-labelledby="contact-settings-title">
  <div class="panel-heading">
    <h2 id="contact-settings-title">{t('studio.site.contact.title')}</h2>
    <p>{t('studio.site.contact.intro')}</p>
  </div>

  <form method="POST" action="?/saveContact" use:enhance={studioFormEnhance}>
    <fieldset>
      <legend>{t('studio.site.contact.emailLegend')}</legend>

      <label class="checkbox">
        <input type="checkbox" name="email_enabled" bind:checked={emailEnabled} />
        {t('studio.site.contact.emailEnabled')}
      </label>

      <label>
        {t('studio.site.contact.emailAddress')}
        <input
          name="email_address"
          type="email"
          disabled={!emailEnabled}
          value={contactForm.email_address}
        />
      </label>

      <label>
        {t('studio.site.contact.emailLabel')}
        <input name="email_label" disabled={!emailEnabled} value={contactForm.email_label} />
      </label>

      <label>
        {t('studio.site.contact.emailSubjectPrefix')}
        <input
          name="email_subject_prefix"
          disabled={!emailEnabled}
          value={contactForm.email_subject_prefix}
        />
      </label>
    </fieldset>

    <fieldset>
      <legend>{t('studio.site.contact.whatsappLegend')}</legend>

      <label class="checkbox">
        <input type="checkbox" name="whatsapp_enabled" bind:checked={whatsappEnabled} />
        {t('studio.site.contact.whatsappEnabled')}
      </label>

      <label>
        {t('studio.site.contact.whatsappPhone')}
        <input name="whatsapp_phone" disabled={!whatsappEnabled} value={contactForm.whatsapp_phone} />
      </label>

      <label>
        {t('studio.site.contact.whatsappLabel')}
        <input name="whatsapp_label" disabled={!whatsappEnabled} value={contactForm.whatsapp_label} />
      </label>
    </fieldset>

    <div class="actions">
      <button type="submit">{t('studio.site.contact.save')}</button>
    </div>

    {#if form?.contactMessage}
      <p class={`status ${form.contactStatus || 'info'}`}>{form.contactMessage}</p>
    {/if}
  </form>
</section>
