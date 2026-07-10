// @ts-nocheck

import { fail } from '@sveltejs/kit';
import { guardStudio } from '$lib/server/studio-guard.js';
import { appearanceFromForm, deriveCardColor, resolveSiteAppearance } from '$lib/site-appearance.js';
import { localizedAppearancePresets, localizedFontPresets } from '$lib/i18n/index.js';
import { resolveLocale } from '$lib/i18n/resolve-locale.js';
import { getOperatorLocale, getOperatorTranslator } from '$lib/i18n/server.js';
import {
  DEFAULT_LATEST_NEWS_COUNT,
  DEFAULT_LAYOUT_PRESET,
  isLayoutPreset,
  LAYOUT_PRESETS,
  MAX_LATEST_NEWS_COUNT
} from '$lib/layout-presets.js';
import {
  LAYOUT_BLOCK_IDS,
  isLayoutPlacement,
  migrateLegacyLayoutBlocks,
  normalizeLayoutBlocks,
  resolveLayoutPreset
} from '$lib/layout-blocks.js';
import {
  checkboxEnabled,
  optionalField,
  readProjectYaml,
  requiredField,
  runStructuralValidation,
  saveSiteBackgroundUpload,
  saveHeaderLogoUpload,
  saveSiteFaviconUpload,
  saveHeroBannerUpload,
  validationMessage,
  writeProjectYaml
} from '$lib/server/studio-io.js';
import { isValidSocialUrl, normalizeSocialId, SOCIAL_NETWORK_IDS } from '$lib/social-networks.js';
import { isValidFooterHref } from '$lib/footer-links.js';
import {
  parseTaglineDisplay,
  resolveTaglineQuoteColor,
  validateEditorialFields
} from '$lib/editorial-markup.js';

const MAX_FOOTER_COLUMNS = 4;
const MAX_FOOTER_LINKS = 4;

function isRecord(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function readString(record, key, fallback = '') {
  const value = record[key];
  return typeof value === 'string' ? value : fallback;
}

export function loadAppearanceForm() {
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
  const record = {
    preset: appearance.preset,
    base_color: appearance.base_color,
    accent_color: appearance.accent_color,
    text_color: appearance.text_color,
    heading_color: appearance.heading_color,
    card_color: appearance.card_color ?? deriveCardColor(appearance.base_color),
    font_preset: appearance.font_preset,
    header_title_color: appearance.header_title_color,
    intro_title_color: appearance.intro_title_color,
    background_fit: appearance.background_fit
  };

  if (backgroundImage) {
    record.background_image = backgroundImage;
  }

  return record;
}

export function loadHeroBannerForm() {
  const data = readProjectYaml('config/site.yaml');
  const site = data.site;

  if (!isRecord(site)) {
    throw new Error('config/site.yaml is missing a site object.');
  }

  const banner =
    site.hero_banner && typeof site.hero_banner === 'object' && !Array.isArray(site.hero_banner)
      ? site.hero_banner
      : {};

  return {
    show: banner.show === true,
    image_file: readString(banner, 'image_file'),
    description: readString(banner, 'description'),
    caption: readString(banner, 'caption'),
    href: readString(banner, 'href')
  };
}

export function loadSiteForm() {
  const data = readProjectYaml('config/site.yaml');
  const site = data.site;

  if (!isRecord(site)) {
    throw new Error('config/site.yaml is missing a site object.');
  }

  return {
    name: readString(site, 'name'),
    header_title: readString(site, 'header_title'),
    intro_title: readString(site, 'intro_title'),
    header_logo: readString(site, 'header_logo'),
    header_logo_alt: readString(site, 'header_logo_alt'),
    favicon: readString(site, 'favicon'),
    tagline: readString(site, 'tagline'),
    tagline_display: parseTaglineDisplay(isRecord(site.tagline_display) ? site.tagline_display : null),
    hero_intro: readString(site, 'hero_intro'),
    hero_signature: readString(site, 'hero_signature'),
    language: readString(site, 'language', 'en'),
    footer_note: readString(site, 'footer_note')
  };
}

export function loadSocialForm() {
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

function emptyFooterForm(columnCount = MAX_FOOTER_COLUMNS) {
  return {
    copyright: '',
    legal_line: '',
    show_social: false,
    columns: Array.from({ length: columnCount }, () => ({
      title: '',
      links: Array.from({ length: MAX_FOOTER_LINKS }, () => ({ label: '', href: '' }))
    }))
  };
}

export function loadLayoutForm() {
  const form = {
    preset: DEFAULT_LAYOUT_PRESET,
    blocks: normalizeLayoutBlocks()
  };

  try {
    const data = readProjectYaml('config/layout.yaml');
    const layout = data.layout;

    if (!isRecord(layout)) {
      return form;
    }

    const preset = readString(layout, 'preset', DEFAULT_LAYOUT_PRESET);

    if (isLayoutPreset(preset)) {
      form.preset = preset;
    }

    form.blocks = isRecord(layout.blocks)
      ? normalizeLayoutBlocks(layout.blocks)
      : migrateLegacyLayoutBlocks(layout);
  } catch {
    return form;
  }

  form.preset = resolveLayoutPreset(form.preset, form.blocks);
  return form;
}

export function loadFooterForm() {
  try {
    const data = readProjectYaml('config/footer.yaml');
    const footer = data.footer;

    if (!isRecord(footer)) {
      return emptyFooterForm();
    }

    const columnCount = Math.max(
      MAX_FOOTER_COLUMNS,
      Array.isArray(footer.columns) ? footer.columns.length : 0
    );
    const form = emptyFooterForm(columnCount);

    form.copyright = readString(footer, 'copyright');
    form.legal_line = readString(footer, 'legal_line');
    form.show_social = footer.show_social === true;

    if (Array.isArray(footer.columns)) {
      footer.columns.slice(0, columnCount).forEach((column, columnIndex) => {
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

    return form;
  } catch {
    return emptyFooterForm();
  }
}

export function loadContactForm() {
  try {
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
  } catch {
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
}

/** @param {{ ok: boolean, output: string }} validation @param {string} locale */
function saveMessage(validation, locale) {
  return validationMessage(validation, locale);
}

export function loadSiteStudioData() {
  guardStudio();
  const locale = getOperatorLocale();

  return {
    siteForm: loadSiteForm(),
    contactForm: loadContactForm(),
    socialForm: loadSocialForm(),
    footerForm: loadFooterForm(),
    layoutForm: loadLayoutForm(),
    layoutPresets: LAYOUT_PRESETS,
    footerColumnCount: MAX_FOOTER_COLUMNS,
    footerLinkCount: MAX_FOOTER_LINKS,
    appearanceForm: loadAppearanceForm(),
    appearancePresets: localizedAppearancePresets(locale),
    fontPresets: localizedFontPresets(locale),
    heroBannerForm: loadHeroBannerForm()
  };
}

export async function saveSiteAction({ request }) {
  guardStudio();

  const locale = getOperatorLocale();
  const t = getOperatorTranslator();
  const formData = await request.formData();

  try {
    const data = readProjectYaml('config/site.yaml');

    if (!isRecord(data.site)) {
      throw new Error(t('errors.missingSite'));
    }

    const site = { ...data.site };
    const headerTitle = optionalField(formData.get('header_title'));
    const introTitle = optionalField(formData.get('intro_title'));
    const tagline = optionalField(formData.get('tagline'));
    const heroIntro = optionalField(formData.get('hero_intro'));

    const editorialErrors = validateEditorialFields({
      tagline,
      intro_title: introTitle,
      hero_intro: heroIntro
    });

    if (editorialErrors.length > 0) {
      throw new Error(editorialErrors[0]);
    }

    site.header_title = headerTitle;
    site.intro_title = introTitle;

    const syncedName = introTitle || headerTitle;

    if (syncedName) {
      site.name = syncedName;
    } else {
      delete site.name;
    }

    site.tagline = tagline;
    site.hero_intro = heroIntro;
    site.hero_signature = optionalField(formData.get('hero_signature'));
    site.footer_note = optionalField(formData.get('footer_note'));

    const taglineWrap = String(formData.get('tagline_display_wrap') ?? 'none');

    if (taglineWrap === 'epigraph') {
      site.tagline_display = {
        wrap: 'epigraph',
        quote_color: resolveTaglineQuoteColor(formData.get('tagline_display_quote_color'))
      };
    } else {
      delete site.tagline_display;
    }

    let headerLogo = String(formData.get('header_logo') ?? readString(site, 'header_logo')).trim();

    if (checkboxEnabled(formData.get('remove_header_logo'))) {
      headerLogo = '';
    } else {
      const logoUpload = formData.get('header_logo_upload');

      if (logoUpload instanceof File && logoUpload.size > 0) {
        headerLogo = await saveHeaderLogoUpload(logoUpload, locale);
      }
    }

    if (headerLogo) {
      site.header_logo = headerLogo;
      site.header_logo_alt = optionalField(formData.get('header_logo_alt'));
    } else {
      delete site.header_logo;
      delete site.header_logo_alt;
    }

    let favicon = String(formData.get('favicon') ?? readString(site, 'favicon')).trim();

    if (checkboxEnabled(formData.get('remove_favicon'))) {
      favicon = '';
    } else {
      const faviconUpload = formData.get('favicon_upload');

      if (faviconUpload instanceof File && faviconUpload.size > 0) {
        favicon = await saveSiteFaviconUpload(faviconUpload, locale);
      }
    }

    if (favicon) {
      site.favicon = favicon;
    } else {
      delete site.favicon;
    }

    writeProjectYaml('config/site.yaml', { site });
    const validation = runStructuralValidation();

    return {
      siteStatus: validation.ok ? 'success' : 'warning',
      siteMessage: saveMessage(validation, locale),
      siteForm: loadSiteForm()
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : t('server.saveSiteError');
    return fail(400, {
      siteStatus: 'error',
      siteMessage: message,
      siteForm: loadSiteForm()
    });
  }
}

export async function saveContactAction({ request }) {
  guardStudio();

  const locale = getOperatorLocale();
  const t = getOperatorTranslator();
  const formData = await request.formData();

  try {
    const data = readProjectYaml('config/contact.yaml');
    const existingContact = isRecord(data.contact) ? data.contact : {};
    const existingEmail = isRecord(existingContact.email) ? existingContact.email : {};
    const existingWhatsapp = isRecord(existingContact.whatsapp) ? existingContact.whatsapp : {};

    const emailEnabled = checkboxEnabled(formData.get('email_enabled'));
    const whatsappEnabled = checkboxEnabled(formData.get('whatsapp_enabled'));
    const emailAddress = emailEnabled
      ? optionalField(formData.get('email_address'))
      : optionalField(existingEmail.address);
    const whatsappPhone = whatsappEnabled
      ? optionalField(formData.get('whatsapp_phone'))
      : optionalField(existingWhatsapp.phone);

    if (emailEnabled && emailAddress === '') {
      throw new Error(t('errors.contactEmailRequired'));
    }

    if (whatsappEnabled && whatsappPhone === '') {
      throw new Error(t('errors.contactWhatsappRequired'));
    }

    const contact = {
      email: {
        enabled: emailEnabled,
        label: emailEnabled
          ? optionalField(formData.get('email_label'), 'Email this brief')
          : optionalField(existingEmail.label, 'Email this brief'),
        address: emailAddress,
        subject_prefix: emailEnabled
          ? optionalField(formData.get('email_subject_prefix'), 'Interest in')
          : optionalField(existingEmail.subject_prefix, 'Interest in')
      },
      whatsapp: {
        enabled: whatsappEnabled,
        label: whatsappEnabled
          ? optionalField(formData.get('whatsapp_label'), 'WhatsApp this brief')
          : optionalField(existingWhatsapp.label, 'WhatsApp this brief'),
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
}

export async function saveSocialAction({ request }) {
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
}

export async function saveFooterAction({ request }) {
  guardStudio();

  const locale = getOperatorLocale();
  const t = getOperatorTranslator();
  const formData = await request.formData();

  try {
    let existingFooter = {};

    try {
      const existingData = readProjectYaml('config/footer.yaml');
      existingFooter = isRecord(existingData.footer) ? existingData.footer : {};
    } catch {
      existingFooter = {};
    }

    /** @type {{ title: string, links: { label: string, href: string }[] }[]} */
    const columns = [];

    const columnCapacity = Math.max(
      MAX_FOOTER_COLUMNS,
      Array.isArray(existingFooter.columns) ? existingFooter.columns.length : 0
    );

    for (let columnIndex = 0; columnIndex < columnCapacity; columnIndex += 1) {
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

    /** @type {Record<string, unknown>} */
    const footer = {
      columns,
      copyright: optionalField(formData.get('copyright')),
      legal_line: optionalField(formData.get('legal_line')),
      show_social: checkboxEnabled(formData.get('show_social'))
    };

    writeProjectYaml('config/footer.yaml', { footer });
    const validation = runStructuralValidation();
    const socialUrls = loadSocialForm();
    const hasSocialLinks = Object.values(socialUrls).some((url) => url !== '');

    if (validation.ok && footer.show_social && !hasSocialLinks) {
      return {
        footerStatus: 'warning',
        footerMessage: t('studio.site.footer.showSocialNoLinks'),
        footerForm: loadFooterForm()
      };
    }

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
}

export async function saveLayoutAction({ request }) {
  guardStudio();

  const locale = getOperatorLocale();
  const t = getOperatorTranslator();
  const formData = await request.formData();

  try {
    /** @type {Record<import('$lib/layout-blocks.js').LayoutBlockId, import('$lib/layout-blocks.js').LayoutBlockConfig>} */
    const blocks = normalizeLayoutBlocks();

    for (const blockId of LAYOUT_BLOCK_IDS) {
      const placementValue = optionalField(formData.get(`block_${blockId}_placement`), 'main');
      blocks[blockId].enabled = checkboxEnabled(formData.get(`block_${blockId}_enabled`));
      blocks[blockId].placement = isLayoutPlacement(placementValue) ? placementValue : 'main';

      const label = optionalField(formData.get(`block_${blockId}_label`));

      if (label !== '') {
        blocks[blockId].label = label;
      } else {
        delete blocks[blockId].label;
      }
    }

    const newsCountRaw = optionalField(
      formData.get('block_news_count'),
      String(blocks.news.count ?? DEFAULT_LATEST_NEWS_COUNT)
    );
    const newsCount = Number.parseInt(newsCountRaw, 10);

    if (
      !Number.isInteger(newsCount) ||
      newsCount < 1 ||
      newsCount > MAX_LATEST_NEWS_COUNT
    ) {
      throw new Error(t('errors.layoutLatestNewsCountInvalid', { max: MAX_LATEST_NEWS_COUNT }));
    }

    blocks.news.count = newsCount;

    const layout = {
      preset: resolveLayoutPreset(DEFAULT_LAYOUT_PRESET, blocks),
      blocks
    };

    writeProjectYaml('config/layout.yaml', { layout });
    const validation = runStructuralValidation();

    return {
      layoutStatus: validation.ok ? 'success' : 'warning',
      layoutMessage: saveMessage(validation, locale),
      layoutForm: loadLayoutForm()
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : t('server.saveLayoutError');
    return fail(400, {
      layoutStatus: 'error',
      layoutMessage: message,
      layoutForm: loadLayoutForm()
    });
  }
}

export async function saveAppearanceAction({ request }) {
  guardStudio();

  const locale = getOperatorLocale();
  const t = getOperatorTranslator();
  const formData = await request.formData();

  try {
    const appearance = appearanceFromForm(
      formData.get('preset'),
      formData.get('base_color'),
      formData.get('accent_color'),
      formData.get('text_color'),
      formData.get('heading_color'),
      formData.get('card_color'),
      formData.get('header_title_color'),
      formData.get('intro_title_color'),
      formData.get('font_preset'),
      formData.get('background_fit')
    );
    const data = readProjectYaml('config/site.yaml');

    if (!isRecord(data.site)) {
      throw new Error(t('errors.missingSite'));
    }

    const site = { ...data.site };
    const existingAppearance = isRecord(site.appearance) ? site.appearance : {};
    let backgroundImage =
      typeof existingAppearance.background_image === 'string' ? existingAppearance.background_image : '';

    if (checkboxEnabled(formData.get('remove_background'))) {
      backgroundImage = '';
    } else {
      const backgroundUpload = formData.get('background_upload');

      if (backgroundUpload instanceof File && backgroundUpload.size > 0) {
        backgroundImage = await saveSiteBackgroundUpload(backgroundUpload, locale);
      }
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

export async function saveHeroBannerAction({ request }) {
  guardStudio();

  const locale = getOperatorLocale();
  const t = getOperatorTranslator();
  const formData = await request.formData();

  try {
    const data = readProjectYaml('config/site.yaml');

    if (!isRecord(data.site)) {
      throw new Error(t('errors.missingSite'));
    }

    const site = { ...data.site };
    const existingBanner = isRecord(site.hero_banner) ? site.hero_banner : {};
    const upload = formData.get('banner_upload');
    let imageFile = String(formData.get('banner_image_file') ?? '').trim();

    if (checkboxEnabled(formData.get('remove_hero_image'))) {
      imageFile = '';
    } else if (upload instanceof File && upload.size > 0) {
      imageFile = await saveHeroBannerUpload(upload, locale);
    }

    const show = checkboxEnabled(formData.get('show_banner'));
    const caption = show
      ? optionalField(formData.get('banner_caption'))
      : optionalField(existingBanner.caption);
    const description = show
      ? optionalField(formData.get('banner_description'))
      : optionalField(existingBanner.description);
    const href = show ? optionalField(formData.get('banner_href')) : optionalField(existingBanner.href);

    if (show && imageFile === '') {
      throw new Error(t('errors.heroBannerImageRequired'));
    }

    if (show) {
      site.hero_banner = {
        show: true,
        image_file: imageFile,
        ...(description !== '' ? { description } : {}),
        ...(caption !== '' ? { caption } : {}),
        ...(href !== '' ? { href } : {})
      };
    } else if (imageFile !== '') {
      site.hero_banner = {
        show: false,
        image_file: imageFile,
        ...(description !== '' ? { description } : {}),
        ...(caption !== '' ? { caption } : {}),
        ...(href !== '' ? { href } : {})
      };
    } else if (site.hero_banner) {
      delete site.hero_banner;
    }

    writeProjectYaml('config/site.yaml', { site });
    const validation = runStructuralValidation();

    return {
      heroBannerStatus: validation.ok ? 'success' : 'warning',
      heroBannerMessage: saveMessage(validation, locale),
      heroBannerForm: loadHeroBannerForm()
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : t('server.saveHeroBannerError');
    return fail(400, {
      heroBannerStatus: 'error',
      heroBannerMessage: message,
      heroBannerForm: loadHeroBannerForm()
    });
  }
}

export const actions = {
  saveSite: saveSiteAction,
  saveContact: saveContactAction,
  saveSocial: saveSocialAction,
  saveFooter: saveFooterAction,
  saveLayout: saveLayoutAction,
  saveAppearance: saveAppearanceAction,
  saveHeroBanner: saveHeroBannerAction
};

export { LAYOUT_PRESETS, MAX_FOOTER_COLUMNS, MAX_FOOTER_LINKS, localizedAppearancePresets, localizedFontPresets };
