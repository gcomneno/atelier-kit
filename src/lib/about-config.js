// @ts-nocheck

import { validateEditorialField, validatePlainTextField } from './editorial-markup.js';

function isRecord(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function optionalText(value) {
  return typeof value === 'string' ? value.trim() : '';
}

export function loadAboutFormData(data) {
  const about = isRecord(data?.about) ? data.about : {};
  const sections = Array.isArray(about.sections) ? about.sections : [];
  const firstSection = isRecord(sections[0]) ? sections[0] : {};
  const portrait = isRecord(about.portrait) ? about.portrait : {};

  return {
    title: typeof about.title === 'string' ? about.title : '',
    intro: typeof about.intro === 'string' ? about.intro : '',
    section_heading: typeof firstSection.heading === 'string' ? firstSection.heading : '',
    section_body: typeof firstSection.body === 'string' ? firstSection.body : '',
    show_portrait: portrait.show === true,
    portrait_image_file: typeof portrait.image_file === 'string' ? portrait.image_file : '',
    portrait_image_alt: typeof portrait.image_alt === 'string' ? portrait.image_alt : '',
    portrait_caption: typeof portrait.caption === 'string' ? portrait.caption : ''
  };
}

export function buildAboutData(existing, aboutForm) {
  const existingAbout = isRecord(existing?.about) ? existing.about : {};
  const title = optionalText(aboutForm.title);
  const intro = optionalText(aboutForm.intro);
  const sectionHeading = optionalText(aboutForm.section_heading);
  const sectionBody = optionalText(aboutForm.section_body);
  const imageFile = optionalText(aboutForm.portrait_image_file);
  const imageAlt = optionalText(aboutForm.portrait_image_alt);
  const caption = optionalText(aboutForm.portrait_caption);
  const captionErrors = validateEditorialField(caption, 'portrait.caption');
  const imageAltErrors = validatePlainTextField(imageAlt, 'portrait.image_alt');

  if (!title) throw new Error('About title is required.');
  if (imageAltErrors.length > 0) throw new Error(imageAltErrors.join(' '));
  if (captionErrors.length > 0) throw new Error(captionErrors.join(' '));

  const about = { title, intro };
  const existingSections = Array.isArray(existingAbout.sections) ? existingAbout.sections : [];

  if (sectionHeading || sectionBody) {
    about.sections = [
      { heading: sectionHeading || 'Process', body: sectionBody },
      ...existingSections.slice(1)
    ];
  } else if (existingSections.length > 0) {
    about.sections = existingSections;
  }

  if (imageFile) {
    about.portrait = {
      show: aboutForm.show_portrait === true,
      image_file: imageFile,
      ...(imageAlt ? { image_alt: imageAlt } : {}),
      ...(caption ? { caption } : {})
    };
  }

  return { about };
}

export function parseAboutPortrait(about) {
  const portrait = isRecord(about?.portrait) ? about.portrait : null;
  if (!portrait || portrait.show !== true) return null;

  const imageFile = optionalText(portrait.image_file);
  if (!imageFile) return null;

  const caption = optionalText(portrait.caption);
  return {
    image_file: imageFile,
    image_alt: optionalText(portrait.image_alt) || optionalText(about.title) || 'Portrait',
    ...(caption ? { caption } : {})
  };
}

export function validateAboutPortraitContent(about) {
  const portrait = isRecord(about?.portrait) ? about.portrait : null;
  return [
    ...validatePlainTextField(
      typeof portrait?.image_alt === 'string' ? portrait.image_alt : '',
      'portrait.image_alt'
    ),
    ...validateEditorialField(
      typeof portrait?.caption === 'string' ? portrait.caption : '',
      'portrait.caption'
    )
  ];
}
