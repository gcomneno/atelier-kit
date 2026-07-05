// @ts-nocheck

import { fail } from '@sveltejs/kit';
import { guardStudio } from '$lib/server/studio-guard.js';
import { appearanceFromForm, resolveSiteAppearance } from '$lib/site-appearance.js';
import { localizedAppearancePresets } from '$lib/i18n/index.js';
import { getOperatorLocale, getOperatorTranslator } from '$lib/i18n/server.js';
import {
  checkboxEnabled,
  optionalField,
  readProjectYaml,
  requiredField,
  runStructuralValidation,
  saveSiteBackgroundUpload,
  validationMessage,
  writeProjectYaml
} from '$lib/server/studio-io.js';

function isRecord(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function readString(record, key, fallback = '') {
  const value = record[key];
  return typeof value === 'string' ? value : fallback;
}

function loadAppearanceForm() {
  const data = readProjectYaml('config/site.yaml');
  const site = data.site;

  if (!isRecord(site)) {
    throw new Error('config/site.yaml is missing a site object.');
  }

  return resolveSiteAppearance(isRecord(site.appearance) ? site.appearance : undefined);
}

/**
 * @param {import('$lib/site-appearance.js').SiteAppearance} appearance
 * @param {string} [backgroundImage]
 */
function buildAppearanceYaml(appearance, backgroundImage = '') {
  /** @type {Record<string, string>} */
  const record =
    appearance.preset === 'custom'
      ? {
          preset: 'custom',
          base_color: appearance.base_color,
          accent_color: appearance.accent_color,
          text_color: appearance.text_color
        }
      : { preset: appearance.preset };

  if (backgroundImage) {
    record.background_image = backgroundImage;
  }

  return record;
}

function loadSiteForm() {
  const data = readProjectYaml('config/site.yaml');
  const site = data.site;

  if (!isRecord(site)) {
    throw new Error('config/site.yaml is missing a site object.');
  }

  return {
    name: readString(site, 'name'),
    tagline: readString(site, 'tagline'),
    language: readString(site, 'language', 'en'),
    notice: readString(site, 'notice'),
    footer_note: readString(site, 'footer_note')
  };
}

function loadContactForm() {
  const data = readProjectYaml('config/contact.yaml');
  const contact = data.contact;

  if (!isRecord(contact)) {
    return {
      email_enabled: true,
      email_label: 'Email this brief',
      email_address: '',
      email_subject_prefix: 'Interest in',
      whatsapp_enabled: false,
      whatsapp_label: 'WhatsApp this brief',
      whatsapp_phone: ''
    };
  }

  const email = isRecord(contact.email) ? contact.email : {};
  const whatsapp = isRecord(contact.whatsapp) ? contact.whatsapp : {};

  return {
    email_enabled: email.enabled === true,
    email_label: readString(email, 'label', 'Email this brief'),
    email_address: readString(email, 'address'),
    email_subject_prefix: readString(email, 'subject_prefix', 'Interest in'),
    whatsapp_enabled: whatsapp.enabled === true,
    whatsapp_label: readString(whatsapp, 'label', 'WhatsApp this brief'),
    whatsapp_phone: readString(whatsapp, 'phone')
  };
}

/** @param {{ ok: boolean, output: string }} validation @param {string} locale */
function saveMessage(validation, locale) {
  return validationMessage(validation, locale);
}

export function load() {
  guardStudio();
  const locale = getOperatorLocale();

  return {
    siteForm: loadSiteForm(),
    contactForm: loadContactForm(),
    appearanceForm: loadAppearanceForm(),
    appearancePresets: localizedAppearancePresets(locale)
  };
}

/** @type {import('./$types').Actions} */
export const actions = {
  saveSite: async ({ request }) => {
    guardStudio();

    const locale = getOperatorLocale();
    const t = getOperatorTranslator();
    const formData = await request.formData();

    try {
      const site = {
        name: requiredField(formData.get('name'), t('fields.siteTitle'), locale),
        tagline: requiredField(formData.get('tagline'), t('fields.tagline'), locale),
        language: optionalField(formData.get('language'), 'en'),
        notice: optionalField(formData.get('notice')),
        footer_note: optionalField(formData.get('footer_note'))
      };

      writeProjectYaml('config/site.yaml', { site });
      const validation = runStructuralValidation();

      return {
        siteStatus: validation.ok ? 'success' : 'warning',
        siteMessage: saveMessage(validation, locale),
        siteForm: site
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : t('server.saveSiteError');
      return fail(400, {
        siteStatus: 'error',
        siteMessage: message,
        siteForm: loadSiteForm()
      });
    }
  },

  saveContact: async ({ request }) => {
    guardStudio();

    const locale = getOperatorLocale();
    const t = getOperatorTranslator();
    const formData = await request.formData();

    try {
      const emailEnabled = checkboxEnabled(formData.get('email_enabled'));
      const whatsappEnabled = checkboxEnabled(formData.get('whatsapp_enabled'));
      const emailAddress = optionalField(formData.get('email_address'));
      const whatsappPhone = optionalField(formData.get('whatsapp_phone'));

      if (emailEnabled && emailAddress === '') {
        throw new Error(t('errors.contactEmailRequired'));
      }

      if (whatsappEnabled && whatsappPhone === '') {
        throw new Error(t('errors.contactWhatsappRequired'));
      }

      const contact = {
        email: {
          enabled: emailEnabled,
          label: optionalField(formData.get('email_label'), 'Email this brief'),
          address: emailAddress,
          subject_prefix: optionalField(formData.get('email_subject_prefix'), 'Interest in')
        },
        whatsapp: {
          enabled: whatsappEnabled,
          label: optionalField(formData.get('whatsapp_label'), 'WhatsApp this brief'),
          phone: whatsappPhone
        }
      };

      writeProjectYaml('config/contact.yaml', { contact });
      const validation = runStructuralValidation();

      return {
        contactStatus: validation.ok ? 'success' : 'warning',
        contactMessage: saveMessage(validation, locale),
        contactForm: {
          email_enabled: contact.email.enabled,
          email_label: contact.email.label,
          email_address: contact.email.address,
          email_subject_prefix: contact.email.subject_prefix,
          whatsapp_enabled: contact.whatsapp.enabled,
          whatsapp_label: contact.whatsapp.label,
          whatsapp_phone: contact.whatsapp.phone
        }
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : t('server.saveContactError');
      return fail(400, {
        contactStatus: 'error',
        contactMessage: message,
        contactForm: loadContactForm()
      });
    }
  },

  saveAppearance: async ({ request }) => {
    guardStudio();

    const locale = getOperatorLocale();
    const t = getOperatorTranslator();
    const formData = await request.formData();

    try {
      const appearance = appearanceFromForm(
        formData.get('preset'),
        formData.get('base_color'),
        formData.get('accent_color'),
        formData.get('text_color')
      );
      const data = readProjectYaml('config/site.yaml');

      if (!isRecord(data.site)) {
        throw new Error(t('errors.missingSite'));
      }

      const site = { ...data.site };
      const existingAppearance = isRecord(site.appearance) ? site.appearance : {};
      let backgroundImage =
        typeof existingAppearance.background_image === 'string'
          ? existingAppearance.background_image
          : '';

      if (checkboxEnabled(formData.get('remove_background'))) {
        backgroundImage = '';
      }

      const backgroundUpload = formData.get('background_upload');

      if (backgroundUpload instanceof File && backgroundUpload.size > 0) {
        backgroundImage = await saveSiteBackgroundUpload(backgroundUpload, locale);
      }

      site.appearance = buildAppearanceYaml(appearance, backgroundImage);

      writeProjectYaml('config/site.yaml', { site });
      const validation = runStructuralValidation();

      return {
        appearanceStatus: validation.ok ? 'success' : 'warning',
        appearanceMessage: saveMessage(validation, locale),
        appearanceForm: loadAppearanceForm()
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : t('server.saveAppearanceError');
      return fail(400, {
        appearanceStatus: 'error',
        appearanceMessage: message,
        appearanceForm: loadAppearanceForm()
      });
    }
  }
};
