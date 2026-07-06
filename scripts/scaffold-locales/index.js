import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { parse, stringify } from 'yaml';
import en from './en.js';
import it from './it.js';

const PACKS = { en, it };

/**
 * @param {string} language
 */
export function getScaffoldLocalePack(language) {
  const code = language === 'it' ? 'it' : 'en';
  return PACKS[code];
}

/**
 * @param {string} targetRoot
 * @param {string} language
 */
export function applyScaffoldLocalePack(targetRoot, language) {
  const pack = getScaffoldLocalePack(language);
  const sitePath = path.join(targetRoot, 'config/site.yaml');

  if (existsSync(sitePath)) {
    const siteData = parse(readFileSync(sitePath, 'utf8'));

    if (siteData?.site && typeof siteData.site === 'object') {
      siteData.site.language = language === 'it' ? 'it' : 'en';
      writeFileSync(sitePath, `${stringify(siteData).trim()}\n`);
    }
  }

  const contactPath = path.join(targetRoot, 'config/contact.yaml');

  if (existsSync(contactPath)) {
    const contactData = parse(readFileSync(contactPath, 'utf8'));

    if (contactData?.contact && typeof contactData.contact === 'object') {
      if (contactData.contact.email && typeof contactData.contact.email === 'object') {
        contactData.contact.email.label = pack.contact.emailLabel;
        contactData.contact.email.subject_prefix = pack.contact.subjectPrefix;
      }

      if (contactData.contact.whatsapp && typeof contactData.contact.whatsapp === 'object') {
        contactData.contact.whatsapp.label = pack.contact.whatsappLabel;
      }

      writeFileSync(contactPath, `${stringify(contactData).trim()}\n`);
    }
  }
}
