// @ts-nocheck

import { fail } from '@sveltejs/kit';
import { guardStudio } from '$lib/server/studio-guard.js';
import {
  checkboxEnabled,
  optionalField,
  readProjectYaml,
  requiredField,
  runStructuralValidation,
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

/** @param {{ ok: boolean, output: string }} validation */
function saveMessage(validation) {
  return validationMessage(validation);
}

export function load() {
  guardStudio();

  return {
    siteForm: loadSiteForm(),
    contactForm: loadContactForm()
  };
}

/** @type {import('./$types').Actions} */
export const actions = {
  saveSite: async ({ request }) => {
    guardStudio();

    const formData = await request.formData();

    try {
      const site = {
        name: requiredField(formData.get('name'), 'Site title'),
        tagline: requiredField(formData.get('tagline'), 'Tagline'),
        language: optionalField(formData.get('language'), 'en'),
        notice: optionalField(formData.get('notice')),
        footer_note: optionalField(formData.get('footer_note'))
      };

      writeProjectYaml('config/site.yaml', { site });
      const validation = runStructuralValidation();

      return {
        siteStatus: validation.ok ? 'success' : 'warning',
        siteMessage: saveMessage(validation),
        siteForm: site
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Could not save site settings.';
      return fail(400, {
        siteStatus: 'error',
        siteMessage: message,
        siteForm: loadSiteForm()
      });
    }
  },

  saveContact: async ({ request }) => {
    guardStudio();

    const formData = await request.formData();

    try {
      const emailEnabled = checkboxEnabled(formData.get('email_enabled'));
      const whatsappEnabled = checkboxEnabled(formData.get('whatsapp_enabled'));
      const emailAddress = optionalField(formData.get('email_address'));
      const whatsappPhone = optionalField(formData.get('whatsapp_phone'));

      if (emailEnabled && emailAddress === '') {
        throw new Error('Contact email is required when email contact is enabled.');
      }

      if (whatsappEnabled && whatsappPhone === '') {
        throw new Error('WhatsApp phone number is required when WhatsApp contact is enabled.');
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
        contactMessage: saveMessage(validation),
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
      const message = error instanceof Error ? error.message : 'Could not save contact settings.';
      return fail(400, {
        contactStatus: 'error',
        contactMessage: message,
        contactForm: loadContactForm()
      });
    }
  }
};
