<script>
  import { enhance } from '$app/forms';
  import { useI18n } from '$lib/i18n/context.js';
  import { APPEARANCE_PRESETS, isAppearancePreset } from '$lib/site-appearance.js';
  import { SOCIAL_NETWORK_IDS } from '$lib/social-networks.js';

  const t = useI18n();

  let { data, form } = $props();

  const siteForm = $derived(form?.siteForm ?? data.siteForm);
  const contactForm = $derived(form?.contactForm ?? data.contactForm);
  const socialForm = $derived(form?.socialForm ?? data.socialForm);
  const footerForm = $derived(form?.footerForm ?? data.footerForm);
  const appearanceForm = $derived(form?.appearanceForm ?? data.appearanceForm);
  const appearancePresets = $derived(data.appearancePresets);
  let presetDraft = $state('warm');

  $effect(() => {
    presetDraft = appearanceForm.preset;
  });

  const showCustomColors = $derived(presetDraft === 'custom');
  const previewColors = $derived(
    presetDraft === 'custom'
      ? appearanceForm
      : isAppearancePreset(presetDraft) && presetDraft !== 'custom'
        ? APPEARANCE_PRESETS[presetDraft]
        : appearanceForm
  );
</script>

<svelte:head>
  <title>{t('studio.site.pageTitle')}</title>
</svelte:head>

<p class="intro">
  {t('studio.site.intro')}
</p>

<section class="panel" aria-labelledby="appearance-settings-title">
  <div class="panel-heading">
    <h2 id="appearance-settings-title">{t('studio.site.appearance.title')}</h2>
    <p>{t('studio.site.appearance.intro')}</p>
  </div>

  <form
    method="POST"
    action="?/saveAppearance"
    enctype="multipart/form-data"
    use:enhance
    class="appearance-form"
  >
    <label>
      {t('studio.site.appearance.preset')}
      <select name="preset" bind:value={presetDraft}>
        {#each appearancePresets as preset}
          <option value={preset.id}>{preset.label}</option>
        {/each}
      </select>
    </label>

    {#if showCustomColors}
      <div class="color-fields">
        <label>
          {t('studio.site.appearance.baseColor')}
          <input name="base_color" type="color" value={appearanceForm.base_color} />
        </label>

        <label>
          {t('studio.site.appearance.accentColor')}
          <input name="accent_color" type="color" value={appearanceForm.accent_color} />
        </label>

        <label>
          {t('studio.site.appearance.textColor')}
          <input name="text_color" type="color" value={appearanceForm.text_color} />
        </label>
      </div>
    {:else}
      <input type="hidden" name="base_color" value={appearanceForm.base_color} />
      <input type="hidden" name="accent_color" value={appearanceForm.accent_color} />
      <input type="hidden" name="text_color" value={appearanceForm.text_color} />
    {/if}

    <div
      class="appearance-preview"
      style={`--preview-base: ${previewColors.base_color}; --preview-accent: ${previewColors.accent_color}; --preview-text: ${previewColors.text_color}`}
      aria-hidden="true"
    >
      <span>{t('studio.site.appearance.preview')}</span>
    </div>

    <label>
      {t('studio.site.appearance.backgroundImage')}
      <span class="hint">{t('studio.site.appearance.backgroundHint')}</span>
      <input type="file" name="background_upload" accept="image/jpeg,image/png,image/webp" />
    </label>

    {#if appearanceForm.background_image}
      <p class="hint">{t('studio.site.appearance.currentBackground', { path: appearanceForm.background_image })}</p>
      <label class="checkbox">
        <input type="checkbox" name="remove_background" />
        {t('studio.site.appearance.removeBackground')}
      </label>
    {/if}

    <div class="actions">
      <button type="submit">{t('studio.site.appearance.save')}</button>
    </div>

    {#if form?.appearanceMessage}
      <p class={`status ${form.appearanceStatus || 'info'}`}>{form.appearanceMessage}</p>
    {/if}
  </form>
</section>

<section class="panel" aria-labelledby="site-settings-title">
  <div class="panel-heading">
    <h2 id="site-settings-title">{t('studio.site.identity.title')}</h2>
    <p>{t('studio.site.identity.intro')}</p>
  </div>

  <form method="POST" action="?/saveSite" use:enhance>
    <label>
      {t('studio.site.identity.siteTitle')}
      <input name="name" value={siteForm.name} required />
    </label>

    <label>
      {t('studio.site.identity.tagline')}
      <input name="tagline" value={siteForm.tagline} required />
    </label>

    <label>
      {t('studio.site.identity.language')}
      <input name="language" value={siteForm.language} />
    </label>

    <label>
      {t('studio.site.identity.notice')}
      <span class="hint">{t('studio.site.identity.noticeHint')}</span>
      <textarea name="notice" rows="3">{siteForm.notice}</textarea>
    </label>

    <label>
      {t('studio.site.identity.footerNote')}
      <input name="footer_note" value={siteForm.footer_note} />
    </label>

    <div class="actions">
      <button type="submit">{t('studio.site.identity.save')}</button>
    </div>

    {#if form?.siteMessage}
      <p class={`status ${form.siteStatus || 'info'}`}>{form.siteMessage}</p>
    {/if}
  </form>
</section>

<section class="panel" aria-labelledby="contact-settings-title">
  <div class="panel-heading">
    <h2 id="contact-settings-title">{t('studio.site.contact.title')}</h2>
    <p>{t('studio.site.contact.intro')}</p>
  </div>

  <form method="POST" action="?/saveContact" use:enhance>
    <fieldset>
      <legend>{t('studio.site.contact.emailLegend')}</legend>

      <label class="checkbox">
        <input type="checkbox" name="email_enabled" checked={contactForm.email_enabled} />
        {t('studio.site.contact.emailEnabled')}
      </label>

      <label>
        {t('studio.site.contact.emailAddress')}
        <input name="email_address" type="email" value={contactForm.email_address} />
      </label>

      <label>
        {t('studio.site.contact.emailLabel')}
        <input name="email_label" value={contactForm.email_label} />
      </label>

      <label>
        {t('studio.site.contact.emailSubjectPrefix')}
        <input name="email_subject_prefix" value={contactForm.email_subject_prefix} />
      </label>
    </fieldset>

    <fieldset>
      <legend>{t('studio.site.contact.whatsappLegend')}</legend>

      <label class="checkbox">
        <input type="checkbox" name="whatsapp_enabled" checked={contactForm.whatsapp_enabled} />
        {t('studio.site.contact.whatsappEnabled')}
      </label>

      <label>
        {t('studio.site.contact.whatsappPhone')}
        <input name="whatsapp_phone" value={contactForm.whatsapp_phone} />
      </label>

      <label>
        {t('studio.site.contact.whatsappLabel')}
        <input name="whatsapp_label" value={contactForm.whatsapp_label} />
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

<section class="panel" aria-labelledby="social-settings-title">
  <div class="panel-heading">
    <h2 id="social-settings-title">{t('studio.site.social.title')}</h2>
    <p>{t('studio.site.social.intro')}</p>
  </div>

  <form method="POST" action="?/saveSocial" use:enhance>
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

<section class="panel" aria-labelledby="footer-settings-title">
  <div class="panel-heading">
    <h2 id="footer-settings-title">{t('studio.site.footer.title')}</h2>
    <p>{t('studio.site.footer.intro')}</p>
  </div>

  <form method="POST" action="?/saveFooter" use:enhance>
    <label>
      {t('studio.site.footer.copyright')}
      <input name="copyright" value={footerForm.copyright} />
    </label>

    <label>
      {t('studio.site.footer.legalLine')}
      <input name="legal_line" value={footerForm.legal_line} />
    </label>

    <label class="checkbox">
      <input type="checkbox" name="show_social" checked={footerForm.show_social} />
      {t('studio.site.footer.showSocial')}
    </label>

    {#each footerForm.columns as column, columnIndex}
      <fieldset>
        <legend>{t('studio.site.footer.columnLegend', { number: columnIndex + 1 })}</legend>

        <label>
          {t('studio.site.footer.columnTitle')}
          <span class="hint">{t('studio.site.footer.columnTitleHint')}</span>
          <input name={`column_${columnIndex}_title`} value={column.title} />
        </label>

        {#each column.links as link, linkIndex}
          <div class="link-fields">
            <label>
              {t('studio.site.footer.linkLabel', { number: linkIndex + 1 })}
              <input
                name={`column_${columnIndex}_link_${linkIndex}_label`}
                value={link.label}
              />
            </label>

            <label>
              {t('studio.site.footer.linkHref')}
              <input
                name={`column_${columnIndex}_link_${linkIndex}_href`}
                value={link.href}
              />
            </label>
          </div>
        {/each}
      </fieldset>
    {/each}

    <div class="actions">
      <button type="submit">{t('studio.site.footer.save')}</button>
    </div>

    {#if form?.footerMessage}
      <p class={`status ${form.footerStatus || 'info'}`}>{form.footerMessage}</p>
    {/if}
  </form>
</section>

<section class="panel next-steps" aria-labelledby="next-steps-title">
  <div class="panel-heading">
    <h2 id="next-steps-title">{t('studio.site.nextSteps.title')}</h2>
    <p>{t('studio.site.nextSteps.intro')}</p>
  </div>

  <p><a href="/studio/readiness">{t('studio.site.nextSteps.link')}</a></p>
  <pre><code>npm run publish
npm run publish -- --deploy</code></pre>
</section>

<style>
  .intro {
    margin: 0 0 1.5rem;
    color: #5a4632;
    line-height: 1.6;
  }

  .panel {
    margin-bottom: 1.5rem;
    padding: 1.5rem;
    border: 1px solid rgb(47 40 31 / 0.12);
    border-radius: 1rem;
    background: rgb(255 250 242 / 0.82);
  }

  .panel-heading h2 {
    margin: 0 0 0.35rem;
    font-size: 1.2rem;
  }

  .panel-heading p {
    margin: 0 0 1rem;
    color: #7d684f;
  }

  form,
  .appearance-form {
    display: grid;
    gap: 1rem;
  }

  fieldset {
    margin: 0;
    padding: 0;
    border: 0;
    display: grid;
    gap: 1rem;
  }

  legend {
    margin-bottom: 0.25rem;
    font-weight: 600;
  }

  label {
    display: grid;
    gap: 0.4rem;
    font-size: 0.95rem;
  }

  .checkbox {
    grid-template-columns: auto 1fr;
    align-items: center;
    gap: 0.65rem;
  }

  .hint {
    color: #7d684f;
    font-size: 0.85rem;
  }

  .color-fields {
    display: grid;
    gap: 1rem;
    grid-template-columns: repeat(auto-fit, minmax(10rem, 1fr));
  }

  .link-fields {
    display: grid;
    gap: 1rem;
    grid-template-columns: repeat(auto-fit, minmax(12rem, 1fr));
    padding: 0.75rem 0 0.25rem;
    border-top: 1px solid rgb(47 40 31 / 0.08);
  }

  input[type='color'] {
    width: 100%;
    height: 2.75rem;
    padding: 0.2rem;
    cursor: pointer;
  }

  .appearance-preview {
    display: grid;
    place-items: center;
    min-height: 4.5rem;
    border-radius: 0.85rem;
    border: 1px solid rgb(47 40 31 / 0.12);
    color: var(--preview-text);
    background:
      radial-gradient(
        circle at top left,
        color-mix(in srgb, var(--preview-accent) 35%, transparent),
        transparent 12rem
      ),
      var(--preview-base);
  }

  .appearance-preview span {
    padding: 0.35rem 0.75rem;
    border-radius: 999px;
    background: color-mix(in srgb, var(--preview-base) 72%, white);
    font-size: 0.85rem;
    font-weight: 600;
  }

  input,
  textarea,
  select {
    width: 100%;
    padding: 0.7rem 0.8rem;
    border: 1px solid rgb(47 40 31 / 0.18);
    border-radius: 0.65rem;
    background: #fffdf9;
    color: inherit;
    font: inherit;
  }

  textarea {
    resize: vertical;
  }

  .actions {
    display: flex;
    justify-content: flex-start;
  }

  button {
    border: 0;
    border-radius: 999px;
    padding: 0.75rem 1.2rem;
    background: #2f281f;
    color: #f8f0e4;
    font: inherit;
    cursor: pointer;
  }

  .status {
    margin: 0;
    padding: 0.85rem 1rem;
    border-radius: 0.75rem;
    white-space: pre-wrap;
    line-height: 1.5;
  }

  .status.success {
    background: rgb(56 102 65 / 0.12);
    color: #2f4f35;
  }

  .status.warning {
    background: rgb(158 106 33 / 0.14);
    color: #6a4a1b;
  }

  .status.error {
    background: rgb(132 46 46 / 0.12);
    color: #6d2a2a;
  }

  .next-steps pre {
    margin: 0;
    padding: 1rem;
    overflow-x: auto;
    border-radius: 0.75rem;
    background: #2f281f;
    color: #f8f0e4;
  }
</style>
