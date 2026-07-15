import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import en from '../src/lib/i18n/messages/en.js';
import it from '../src/lib/i18n/messages/it.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const component = fs.readFileSync(path.join(root, 'src/lib/components/VisitorBrief.svelte'), 'utf8');
const itemServer = fs.readFileSync(path.join(root, 'src/routes/items/[id]/+page.server.js'), 'utf8');
const itemPage = fs.readFileSync(path.join(root, 'src/routes/items/[id]/+page.svelte'), 'utf8');

test('Item data flows from normalized social.yaml config into VisitorBrief', () => {
  assert.match(itemServer, /getVisitorBriefSocialProfiles\(getSocialConfig\(\)\.links\)/);
  assert.match(itemPage, /socialProfiles=\{data\.socialProfiles\}/);
  assert.match(component, /{#each socialProfiles as profile/);
});

test('existing standalone copy, email and WhatsApp actions remain before social actions', () => {
  const copy = component.indexOf('on:click={copyBrief}');
  const email = component.indexOf('{#if emailHref}', copy);
  const whatsapp = component.indexOf('{#if whatsappHref}', email);
  const socials = component.indexOf('{#each socialProfiles as profile', whatsapp);

  assert.ok(copy >= 0);
  assert.ok(email > copy);
  assert.ok(whatsapp > email);
  assert.ok(socials > whatsapp);
});

test('both locales describe copy-and-paste without claiming automatic delivery', () => {
  for (const messages of [en.visitor.visitorBrief, it.visitor.visitorBrief]) {
    assert.ok(messages.copyAndOpenInstagram);
    assert.ok(messages.copyAndOpenFacebook);
    assert.match(messages.copyAndOpenSuccess, /copi|copy/i);
    assert.match(messages.copyAndOpenSuccess, /incoll|paste/i);
    assert.doesNotMatch(messages.copyAndOpenSuccess, /sent|send|inviat|sped/i);
    assert.doesNotMatch(messages.popupError, /sent|send|inviat|sped/i);
  }
  assert.match(component, /role="status" aria-live="polite"/);
});
