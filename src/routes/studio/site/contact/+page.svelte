<script>
  import { enhance } from '$app/forms';
  import StudioFieldLabel from '$lib/components/StudioFieldLabel.svelte';
  import StudioFormLegend from '$lib/components/StudioFormLegend.svelte';
  import StudioFormStatus from '$lib/components/AtelierFormStatus.svelte';
  import MarkedTextField from '$lib/components/MarkedTextField.svelte';
  import { useI18n } from '$lib/i18n/context.js';
  import { studioFormDirty, studioFormEnhanceDirty } from '$lib/studio-form-dirty.js';

  const t = useI18n();

  let { data, form } = $props();

  const contactForm = $derived(form?.contactForm ?? data.contactForm);
  let emailEnabled = $state(false);
  let whatsappEnabled = $state(false);
  let isDirty = $state(false);
  /** @type {import('$lib/studio-form-dirty.js').StudioFormDirtyControl} */
  const dirtyControl = {};

  $effect(() => {
    emailEnabled = contactForm.email_enabled;
    whatsappEnabled = contactForm.whatsapp_enabled;
    dirtyControl.resetBaseline?.();
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

  <form
    method="POST"
    action="?/saveContact"
    use:studioFormDirty={{ setDirty: (value) => (isDirty = value), dirtyControl }}
    use:enhance={() => studioFormEnhanceDirty(dirtyControl)}
  >
    <StudioFormLegend />

    <fieldset>
      <legend>{t('studio.site.contact.emailLegend')}</legend>

      <label class="checkbox">
        <input type="checkbox" name="email_enabled" bind:checked={emailEnabled} />
        {t('studio.site.contact.emailEnabled')}
      </label>

      <label>
        <StudioFieldLabel
          label={t('studio.site.contact.emailAddress')}
          required={emailEnabled}
          hint={emailEnabled ? t('studio.forms.requiredWhenEnabled') : ''}
        />
        <input
          name="email_address"
          type="email"
          disabled={!emailEnabled}
          value={contactForm.email_address}
          required={emailEnabled}
        />
      </label>

      <label>
        <StudioFieldLabel label={t('studio.site.contact.emailLabel')} optional />
        <MarkedTextField name="email_label" disabled={!emailEnabled} value={contactForm.email_label} />
      </label>

      <label>
        <StudioFieldLabel label={t('studio.site.contact.emailSubjectPrefix')} optional />
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
        <StudioFieldLabel
          label={t('studio.site.contact.whatsappPhone')}
          required={whatsappEnabled}
          hint={whatsappEnabled ? t('studio.forms.requiredWhenEnabled') : ''}
        />
        <input
          name="whatsapp_phone"
          disabled={!whatsappEnabled}
          value={contactForm.whatsapp_phone}
          required={whatsappEnabled}
        />
      </label>

      <label>
        <StudioFieldLabel label={t('studio.site.contact.whatsappLabel')} optional />
        <MarkedTextField name="whatsapp_label" disabled={!whatsappEnabled} value={contactForm.whatsapp_label} />
      </label>
    </fieldset>

    <div class="actions">
      <button type="submit" disabled={!isDirty}>{t('studio.site.contact.save')}</button>
    </div>

    <StudioFormStatus message={form?.contactMessage} status={form?.contactStatus} />
  </form>
</section>
