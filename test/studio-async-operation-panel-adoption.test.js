import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const pagePath = 'src/routes/studio/readiness/+page.svelte';
const adapterPath = 'src/lib/studio-readiness-operation-panel.js';
const page = fs.readFileSync(pagePath, 'utf8');

test('Readiness imports the installed AsyncOperationPanel and explicit adapter', () => {
  assert.match(
    page,
    /import\s*\{[^}]*AsyncOperationPanel[^}]*Button[^}]*\}\s*from\s*['"]giadaware-ui-components\/studio['"]/
  );
  assert.match(
    page,
    /createPrepOperationPanelModel/
  );
  assert.match(
    page,
    /createLiveOperationPanelModel/
  );
  assert.equal(fs.existsSync(adapterPath), true);
});

test('Readiness renders one AsyncOperationPanel for each independent operation', () => {
  const components = page.match(/<AsyncOperationPanel(?:\s|>)/g) ?? [];
  assert.equal(components.length, 2);
  assert.match(page, /title=\{t\('studio\.readiness\.publishTitle'\)\}/);
  assert.match(page, /title=\{t\('studio\.readiness\.liveTitle'\)\}/);
  assert.match(page, /headingLevel=\{2\}/);
});

test('actions remain consumer-owned snippets using Giada UI Button', () => {
  assert.match(page, /\{#snippet\s+prepAction\(\)\}/);
  assert.match(page, /\{#snippet\s+liveAction\(\)\}/);
  assert.match(page, /action=\{prepAction\}/);
  assert.match(page, /action=\{liveAction\}/);
  assert.match(page, /action="\?\/runPublishPrep"/);
  assert.match(page, /action="\?\/publishLive"/);
  assert.match(page, /<Button[^>]*type="submit"/);
});

test('local duplicate async presentation is removed', () => {
  assert.doesNotMatch(page, /aria-busy=\{prepRunning\}/);
  assert.doesNotMatch(page, /aria-busy=\{liveRunning\}/);
  assert.doesNotMatch(page, /role="status"/);
  assert.doesNotMatch(page, /class="output-details"/);
  assert.doesNotMatch(page, /class=\{prepResult\.prep\.ok\s*\?/);
  assert.doesNotMatch(page, /class=\{liveResult\.live\.ok\s*\?/);
});

test('preview, confirmation, deployed URL and orchestration remain consumer-owned', () => {
  assert.match(page, /livePreview/);
  assert.match(page, /pendingCount/);
  assert.match(page, /confirmLive/);
  assert.match(page, /enhanceAction\('prep'\)/);
  assert.match(page, /enhanceAction\('live'\)/);
  assert.match(page, /liveResult\.live\.deployedUrl/);
  assert.match(page, /data\.siteUrl/);
});
