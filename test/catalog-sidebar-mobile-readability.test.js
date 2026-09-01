import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';

const source = readFileSync(
  new URL('../src/lib/components/CatalogSidebar.svelte', import.meta.url),
  'utf8'
);

const mediaMarker = '@media (max-width: 959px)';
const mediaStart = source.indexOf(mediaMarker);

assert.notEqual(
  mediaStart,
  -1,
  'CatalogSidebar must define the mobile readability contract at max-width 959px'
);

const desktop = source.slice(0, mediaStart);
const mobile = source.slice(mediaStart);

/** @param {string} block @param {string} name */
function customProperty(block, name) {
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = block.match(new RegExp(`${escaped}\\s*:\\s*([0-9.]+)rem`));

  assert.ok(match, `${name} must be defined`);
  return Number(match[1]);
}

/** @param {string} block @param {string} selector */
function lineHeight(block, selector) {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = block.match(
    new RegExp(`${escaped}\\s*\\{[\\s\\S]*?line-height\\s*:\\s*([0-9.]+)`)
  );

  assert.ok(match, `${selector} must define line-height`);
  return Number(match[1]);
}

test('desktop sidebar compact defaults remain unchanged', () => {
  assert.match(desktop, /--sidebar-link-size:\s*0\.8125rem;/);
  assert.match(desktop, /--sidebar-body-size:\s*0\.8125rem;/);
  assert.match(desktop, /--sidebar-meta-size:\s*0\.6875rem;/);
  assert.match(desktop, /--sidebar-footer-size:\s*0\.8125rem;/);
  assert.match(desktop, /--sidebar-widget-height:\s*13\.75rem;/);
});

test('mobile sidebar increases readable typography and widget height', () => {
  assert.ok(customProperty(mobile, '--sidebar-link-size') >= 1.125);
  assert.ok(customProperty(mobile, '--sidebar-body-size') >= 1.0625);
  assert.ok(customProperty(mobile, '--sidebar-meta-size') >= 0.8125);
  assert.ok(customProperty(mobile, '--sidebar-footer-size') >= 0.875);
  assert.ok(customProperty(mobile, '--sidebar-widget-height') >= 20);
});

test('mobile news and body copy use more generous line heights', () => {
  assert.ok(lineHeight(mobile, '.widget-body') >= 1.6);
  assert.ok(lineHeight(mobile, ':global(.news-title)') >= 1.45);
  assert.ok(lineHeight(mobile, '.about-snippet') >= 1.65);
});

test('mobile About teaser remains bounded but exposes an extra line', () => {
  assert.match(
    desktop,
    /\.about-snippet\s*\{[\s\S]*?-webkit-line-clamp:\s*3;[\s\S]*?line-clamp:\s*3;/
  );

  assert.match(
    mobile,
    /\.about-snippet\s*\{[\s\S]*?-webkit-line-clamp:\s*4;[\s\S]*?line-clamp:\s*4;/
  );
});
