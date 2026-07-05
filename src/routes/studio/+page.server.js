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
import { isValidSocialUrl, normalizeSocialId, SOCIAL_NETWORK_IDS } from '$lib/social-networks.js';
import { isValidFooterHref } from '$lib/footer-links.js';

const MAX_FOOTER_COLUMNS = 3;
const MAX_FOOTER_LINKS = 5;

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

function loadSocialForm() {
  /** @type {Record<'instagram' | 'facebook' | 'x', string>} */
  const urls = {
    instagram: '',
    facebook: '',
    x: ''
  };

  const data = readProjectYaml('config/social.yaml');
  const social = data.social;

  if (!isRecord(social) || !Array.isArray(social.links)) {
    return urls;
  }

  for (const entry of social.links) {
    if (!isRecord(entry)) {
      continue;
    }

    const id = normalizeSocialId(readString(entry, 'id'));

    if (id) {
      urls[id] = readString(entry, 'url');
    }
  }

  return urls;
}

function emptyFooterForm() {
  return {
    copyright: '',
    legal_line: '',
    show_social: false,
    columns: Array.from({ length: MAX_FOOTER_COLUMNS }, () => ({
      title: '',
      links: Array.from({ length: MAX_FOOTER_LINKS }, () => ({ label: '', href: '' }))
    }))
  };
}

function loadFooterForm() {
  const form = emptyFooterForm();

  try {
    const data = readProjectYaml('config/footer.yaml');
    const footer = data.footer;

    if (!isRecord(footer)) {
      return form;
    }

    form.copyright = readString(footer, 'copyright');
    form.legal_line = readString(footer, 'legal_line');
    form.show_social = footer.show_social === true;

    if (Array.isArray(footer.columns)) {
      footer.columns.slice(0, MAX_FOOTER_COLUMNS).forEach((column, columnIndex) => {
        if (!isRecord(column)) {
          return;
        }

        form.columns[columnIndex].title = readString(column, 'title');

        if (Array.isArray(column.links)) {
          column.links.slice(0, MAX_FOOTER_LINKS).forEach((link, linkIndex) => {
            if (!isRecord(link)) {
              return;
            }

            form.columns[columnIndex].links[linkIndex] = {
              label: readString(link, 'label'),
              href: readString(link, 'href')
            };
          });
        }
      });
    }
  } catch {
    return form;
  }

  return form;
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
    socialForm: loadSocialForm(),
    footerForm: loadFooterForm(),
    footerColumnCount: MAX_FOOTER_COLUMNS,
    footerLinkCount: MAX_FOOTER_LINKS,
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

  saveSocial: async ({ request }) => {
    guardStudio();

    const locale = getOperatorLocale();
    const t = getOperatorTranslator();
    const formData = await request.formData();

    try {
      /** @type {{ id: 'instagram' | 'facebook' | 'x', url: string }[]} */
      const links = [];

      for (const id of SOCIAL_NETWORK_IDS) {
        const url = optionalField(formData.get(`url_${id}`));

        if (url === '') {
          continue;
        }

        if (!isValidSocialUrl(url)) {
          throw new Error(t('errors.socialUrlInvalid', { network: id }));
        }

        links.push({ id, url });
      }

      writeProjectYaml('config/social.yaml', { social: { links } });
      const validation = runStructuralValidation();

      return {
        socialStatus: validation.ok ? 'success' : 'warning',
        socialMessage: saveMessage(validation, locale),
        socialForm: loadSocialForm()
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : t('server.saveSocialError');
      return fail(400, {
        socialStatus: 'error',
        socialMessage: message,
        socialForm: loadSocialForm()
      });
    }
  },

  saveFooter: async ({ request }) => {
    guardStudio();

    const locale = getOperatorLocale();
    const t = getOperatorTranslator();
    const formData = await request.formData();

    try {
      /** @type {{ title: string, links: { label: string, href: string }[] }[]} */
      const columns = [];

      for (let columnIndex = 0; columnIndex < MAX_FOOTER_COLUMNS; columnIndex += 1) {
        const title = optionalField(formData.get(`column_${columnIndex}_title`));

        if (title === '') {
          continue;
        }

        /** @type {{ label: string, href: string }[]} */
        const links = [];

        for (let linkIndex = 0; linkIndex < MAX_FOOTER_LINKS; linkIndex += 1) {
          const label = optionalField(formData.get(`column_${columnIndex}_link_${linkIndex}_label`));

          if (label === '') {
            continue;
          }

          const href = optionalField(formData.get(`column_${columnIndex}_link_${linkIndex}_href`));

          if (href === '') {
            throw new Error(t('errors.footerLinkHrefRequired', { column: title, label }));
          }

          if (!isValidFooterHref(href)) {
            throw new Error(t('errors.footerLinkHrefInvalid', { column: title, label }));
          }

          links.push({ label, href });
        }

        columns.push({ title, links });
      }

      const footer = {
        columns,
        copyright: optionalField(formData.get('copyright')),
        legal_line: optionalField(formData.get('legal_line')),
        show_social: checkboxEnabled(formData.get('show_social'))
      };

      writeProjectYaml('config/footer.yaml', { footer });
      const validation = runStructuralValidation();

      return {
        footerStatus: validation.ok ? 'success' : 'warning',
        footerMessage: saveMessage(validation, locale),
        footerForm: loadFooterForm()
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : t('server.saveFooterError');
      return fail(400, {
        footerStatus: 'error',
        footerMessage: message,
        footerForm: loadFooterForm()
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
