import assert from 'node:assert/strict';
import test from 'node:test';
import { copyBriefAndOpenSocial } from './visitor-brief.js';

function popup() {
  const profileWindow = {
    opener: {},
    closed: false,
    navigatedTo: '',
    close() { this.closed = true; },
    document: {
      createElement() { return {}; },
      head: { append() {} }
    },
    location: {
      /** @param {string} url */
      replace(url) { profileWindow.navigatedTo = url; }
    }
  };

  return profileWindow;
}

test('copies the exact brief before opening the configured profile', async () => {
  const profileWindow = popup();
  /** @type {string[]} */
  const events = [];
  /** @param {string} url */
  profileWindow.location.replace = (url) => {
    events.push(`open:${url}`);
    profileWindow.navigatedTo = url;
  };

  const result = await copyBriefAndOpenSocial({
    text: 'same\nvisitor brief',
    url: 'https://instagram.com/example',
    writeText: async (text) => { events.push(`copy:${text}`); },
    openWindow: () => profileWindow
  });

  assert.equal(result, 'opened');
  assert.deepEqual(events, [
    'copy:same\nvisitor brief',
    'open:https://instagram.com/example'
  ]);
  assert.equal(profileWindow.opener, null);
  assert.equal(profileWindow.closed, false);
});

test('closes the placeholder and does not open the profile when copying fails', async () => {
  const profileWindow = popup();
  const result = await copyBriefAndOpenSocial({
    text: 'visible brief',
    url: 'https://facebook.com/example',
    writeText: async () => { throw new Error('denied'); },
    openWindow: () => profileWindow
  });

  assert.equal(result, 'copy-failed');
  assert.equal(profileWindow.closed, true);
  assert.equal(profileWindow.navigatedTo, '');
});

test('still copies when the placeholder is blocked and reports the opening failure', async () => {
  let copied = false;
  const result = await copyBriefAndOpenSocial({
    text: 'brief',
    url: 'https://facebook.com/example',
    writeText: async () => { copied = true; },
    openWindow: () => null
  });

  assert.equal(result, 'popup-blocked');
  assert.equal(copied, true);
});

test('reports clipboard failure when both the placeholder and copying fail', async () => {
  const result = await copyBriefAndOpenSocial({
    text: 'visible brief',
    url: 'https://facebook.com/example',
    writeText: async () => { throw new Error('denied'); },
    openWindow: () => null
  });

  assert.equal(result, 'copy-failed');
});

test('closes an invalid placeholder but still copies before reporting it blocked', async () => {
  const profileWindow = popup();
  let copied = false;
  Object.defineProperty(profileWindow, 'opener', {
    set() { throw new Error('cannot detach opener'); }
  });

  const result = await copyBriefAndOpenSocial({
    text: 'visible brief',
    url: 'https://facebook.com/example',
    writeText: async () => { copied = true; },
    openWindow: () => profileWindow
  });

  assert.equal(result, 'popup-blocked');
  assert.equal(profileWindow.closed, true);
  assert.equal(copied, true);
});

test('does not report a copy when placeholder preparation and copying both fail', async () => {
  const profileWindow = popup();
  let copyAttempts = 0;
  Object.defineProperty(profileWindow, 'document', {
    get() { throw new Error('document unavailable'); }
  });

  const result = await copyBriefAndOpenSocial({
    text: 'visible brief',
    url: 'https://facebook.com/example',
    writeText: async () => {
      copyAttempts += 1;
      throw new Error('denied');
    },
    openWindow: () => profileWindow
  });

  assert.equal(result, 'copy-failed');
  assert.equal(profileWindow.closed, true);
  assert.equal(copyAttempts, 1);
});
