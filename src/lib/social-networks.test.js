import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import {
  isValidSocialUrl,
  isValidSocialUrlForNetwork,
  normalizeSocialId,
  socialFormToLinks,
  socialLinksToForm,
  SOCIAL_NETWORK_IDS
} from './social-networks.js';

test('normalizes every supported social id and preserves the twitter alias', () => {
  assert.deepEqual(SOCIAL_NETWORK_IDS, ['instagram', 'facebook', 'x', 'github']);
  for (const id of SOCIAL_NETWORK_IDS) assert.equal(normalizeSocialId(` ${id.toUpperCase()} `), id);
  assert.equal(normalizeSocialId('twitter'), 'x');
  assert.equal(normalizeSocialId('mastodon'), '');
});

test('validates GitHub URLs against the canonical GitHub host', () => {
  assert.equal(isValidSocialUrlForNetwork('github', 'https://github.com/sponsors/example'), true);
  assert.equal(isValidSocialUrlForNetwork('github', 'https://github.com/example/project'), true);
  assert.equal(isValidSocialUrlForNetwork('github', 'http://www.github.com/example'), true);

  assert.equal(isValidSocialUrlForNetwork('github', 'https://github.com.example.org/example'), false);
  assert.equal(isValidSocialUrlForNetwork('github', 'https://example-github.com/example'), false);
  assert.equal(isValidSocialUrlForNetwork('github', 'https://instagram.com/example'), false);
  assert.equal(isValidSocialUrlForNetwork('github', 'github.com/example'), false);
  assert.equal(isValidSocialUrlForNetwork('github', 'mailto:example@example.com'), false);

  assert.equal(isValidSocialUrlForNetwork('instagram', 'https://example.com/profile'), true);
  assert.equal(isValidSocialUrl('https://example.com/profile'), true);
});

test('loads, serializes, updates and deletes GitHub values without changing legacy networks', () => {
  const loaded = socialLinksToForm([
    { id: 'instagram', url: 'https://instagram.com/example' },
    { id: 'facebook', url: 'https://facebook.com/example' },
    { id: 'twitter', url: 'https://x.com/example' },
    { id: 'github', url: 'https://github.com/example' }
  ]);
  assert.equal(loaded.github, 'https://github.com/example');
  assert.equal(loaded.x, 'https://x.com/example');

  loaded.github = ' https://github.com/sponsors/example ';
  let serialized = socialFormToLinks(loaded);
  assert.equal(serialized.invalidId, '');
  assert.deepEqual(serialized.links.at(-1), {
    id: 'github',
    url: 'https://github.com/sponsors/example'
  });

  loaded.github = '';
  serialized = socialFormToLinks(loaded);
  assert.equal(serialized.links.some(({ id }) => id === 'github'), false);

  loaded.github = 'not a URL';
  assert.deepEqual(socialFormToLinks(loaded), { links: [], invalidId: 'github' });
});

test('Studio and public renderers include GitHub load/save, visibility, icon and localized labels', () => {
  const studioServer = readFileSync('src/lib/server/studio-site-server.js', 'utf8');
  const studioPage = readFileSync('src/routes/studio/site/social/+page.svelte', 'utf8');
  const header = readFileSync('src/lib/components/SiteHeader.svelte', 'utf8');
  const footer = readFileSync('src/lib/components/SiteFooter.svelte', 'utf8');
  const icon = readFileSync('src/lib/components/SocialIcon.svelte', 'utf8');
  const showcase = readFileSync('src/lib/server/showcase.js', 'utf8');
  const en = readFileSync('src/lib/i18n/messages/en.js', 'utf8');
  const it = readFileSync('src/lib/i18n/messages/it.js', 'utf8');

  assert.match(studioServer, /socialLinksToForm\(social\.links\)/);
  assert.match(studioServer, /url_\$\{id\}/);
  assert.match(studioServer, /writeProjectYaml\('config\/social\.yaml'/);
  assert.match(studioPage, /SOCIAL_NETWORK_IDS/);
  for (const component of [header, footer]) {
    assert.match(component, /<SocialIcon id=\{link\.id\}/);
    assert.match(component, /github: t\('social\.github'\)/);
  }
  assert.match(showcase, /isValidSocialUrlForNetwork\(id, url\)/);
  assert.match(icon, /id === 'github'/);
  assert.match(icon, /M12 21\.35/);
  assert.doesNotMatch(icon, /octocat/i);
  assert.match(en, /Support on GitHub Sponsors/);
  assert.match(it, /Sostieni su GitHub Sponsors/);
});

test('scaffold documents the complete supported social id set', () => {
  const scaffold = readFileSync('scripts/scaffold-client.js', 'utf8');
  assert.match(scaffold, /instagram, facebook, x, github/);
  assert.match(scaffold, /id: github/);
});
