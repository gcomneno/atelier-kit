<script>
  import { enhance } from '$app/forms';
  import StudioAccessGuide from '$lib/components/StudioAccessGuide.svelte';
  import { APPEARANCE_PRESETS, isAppearancePreset } from '$lib/site-appearance.js';

  let { data, form } = $props();

  const siteForm = $derived(form?.siteForm ?? data.siteForm);
  const contactForm = $derived(form?.contactForm ?? data.contactForm);
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
  <title>Studio · Site settings</title>
</svelte:head>

<StudioAccessGuide />

<p class="intro">
  Edit the public site identity, appearance and contact actions here. Changes are saved directly to the project files.
  After saving, refresh the preview tab if the homepage does not update immediately.
</p>

<section class="panel" aria-labelledby="appearance-settings-title">
  <div class="panel-heading">
    <h2 id="appearance-settings-title">Site appearance</h2>
    <p>Background and text colors for the public showcase.</p>
  </div>

  <form method="POST" action="?/saveAppearance" use:enhance class="appearance-form">
    <label>
      Color preset
      <select name="preset" bind:value={presetDraft}>
        {#each appearancePresets as preset}
          <option value={preset.id}>{preset.label}</option>
        {/each}
      </select>
    </label>

    {#if showCustomColors}
      <div class="color-fields">
        <label>
          Base background
          <input name="base_color" type="color" value={appearanceForm.base_color} />
        </label>

        <label>
          Accent glow
          <input name="accent_color" type="color" value={appearanceForm.accent_color} />
        </label>

        <label>
          Text color
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
      <span>Preview</span>
    </div>

    <div class="actions">
      <button type="submit">Save appearance</button>
    </div>

    {#if form?.appearanceMessage}
      <p class={`status ${form.appearanceStatus || 'info'}`}>{form.appearanceMessage}</p>
    {/if}
  </form>
</section>

<section class="panel" aria-labelledby="site-settings-title">
  <div class="panel-heading">
    <h2 id="site-settings-title">Site identity</h2>
    <p>Title, tagline and visitor-facing notice text.</p>
  </div>

  <form method="POST" action="?/saveSite" use:enhance>
    <label>
      Site title
      <input name="name" value={siteForm.name} required />
    </label>

    <label>
      Tagline
      <input name="tagline" value={siteForm.tagline} required />
    </label>

    <label>
      Language
      <input name="language" value={siteForm.language} />
    </label>

    <label>
      Public notice
      <span class="hint">Leave empty to hide the notice banner.</span>
      <textarea name="notice" rows="3">{siteForm.notice}</textarea>
    </label>

    <label>
      Footer note
      <input name="footer_note" value={siteForm.footer_note} />
    </label>

    <div class="actions">
      <button type="submit">Save site settings</button>
    </div>

    {#if form?.siteMessage}
      <p class={`status ${form.siteStatus || 'info'}`}>{form.siteMessage}</p>
    {/if}
  </form>
</section>

<section class="panel" aria-labelledby="contact-settings-title">
  <div class="panel-heading">
    <h2 id="contact-settings-title">Contact actions</h2>
    <p>Visitor Brief email and optional WhatsApp contact.</p>
  </div>

  <form method="POST" action="?/saveContact" use:enhance>
    <fieldset>
      <legend>Email</legend>

      <label class="checkbox">
        <input type="checkbox" name="email_enabled" checked={contactForm.email_enabled} />
        Enable email contact
      </label>

      <label>
        Contact email
        <input name="email_address" type="email" value={contactForm.email_address} />
      </label>

      <label>
        Email button label
        <input name="email_label" value={contactForm.email_label} />
      </label>

      <label>
        Email subject prefix
        <input name="email_subject_prefix" value={contactForm.email_subject_prefix} />
      </label>
    </fieldset>

    <fieldset>
      <legend>WhatsApp</legend>

      <label class="checkbox">
        <input type="checkbox" name="whatsapp_enabled" checked={contactForm.whatsapp_enabled} />
        Enable WhatsApp contact
      </label>

      <label>
        WhatsApp phone number
        <input name="whatsapp_phone" value={contactForm.whatsapp_phone} />
      </label>

      <label>
        WhatsApp button label
        <input name="whatsapp_label" value={contactForm.whatsapp_label} />
      </label>
    </fieldset>

    <div class="actions">
      <button type="submit">Save contact settings</button>
    </div>

    {#if form?.contactMessage}
      <p class={`status ${form.contactStatus || 'info'}`}>{form.contactMessage}</p>
    {/if}
  </form>
</section>

<section class="panel next-steps" aria-labelledby="next-steps-title">
  <div class="panel-heading">
    <h2 id="next-steps-title">Before publishing</h2>
    <p>Review publish readiness in the studio or run the publish script from the project folder.</p>
  </div>

  <p><a href="/studio/readiness">Open publish readiness</a></p>
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
