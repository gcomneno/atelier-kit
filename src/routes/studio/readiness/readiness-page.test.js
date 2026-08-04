// @ts-nocheck

import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

let compiler;
try {
  compiler = await import('svelte/compiler');
} catch (error) {
  if (error?.code !== 'ERR_MODULE_NOT_FOUND') throw error;
}

const filename = fileURLToPath(new URL('./+page.svelte', import.meta.url));
const source = fs.readFileSync(filename, 'utf8');

function descendants(node, predicate, matches = []) {
  if (!node || typeof node !== 'object') return matches;
  if (predicate(node)) matches.push(node);
  for (const [key, value] of Object.entries(node)) {
    if (key === 'parent') continue;
    if (Array.isArray(value)) value.forEach((entry) => descendants(entry, predicate, matches));
    else if (value && typeof value === 'object') descendants(value, predicate, matches);
  }
  return matches;
}

function formAction(section) {
  const form = descendants(section, (node) => node.type === 'Element' && node.name === 'form')[0];
  const attribute = form.attributes.find((entry) => entry.type === 'Attribute' && entry.name === 'action');
  return attribute.value[0].data;
}

function identifiers(section) {
  return new Set(descendants(section, (node) => node.type === 'Identifier').map((node) => node.name));
}

test('build test and its result precede real publishing in DOM and tab order', { skip: !compiler }, () => {
  const prepSnippet = source.indexOf('{#snippet prepAction()}');
  const prepAction = source.indexOf('action="?/runPublishPrep"');
  const prepPanel = source.indexOf('{...prepPanelModel}');

  const liveSnippet = source.indexOf('{#snippet liveAction()}');
  const liveAction = source.indexOf('action="?/publishLive"');
  const livePanel = source.indexOf('{...livePanelModel}');

  for (const position of [
    prepSnippet,
    prepAction,
    prepPanel,
    liveSnippet,
    liveAction,
    livePanel
  ]) {
    assert.notEqual(position, -1);
  }

  assert.equal(prepSnippet < prepAction, true);
  assert.equal(prepAction < prepPanel, true);
  assert.equal(prepPanel < liveSnippet, true);
  assert.equal(liveSnippet < liveAction, true);
  assert.equal(liveAction < livePanel, true);

  assert.equal(source.slice(prepSnippet, prepPanel).includes('prepResult'), false);
  assert.equal(source.slice(prepSnippet, prepPanel).includes('liveResult'), false);
  assert.equal(source.slice(liveSnippet, livePanel).includes('prepResult'), false);
  assert.equal(source.slice(liveSnippet, livePanel).includes('liveResult'), false);
});

test('each action block has its own heading, submit button, status, and technical output', { skip: !compiler }, () => {
  const ast = compiler.parse(source);
  const actionSections = ast.html.children
    .filter((node) => node.type === 'Element' && node.name === 'section')
    .filter((section) => descendants(section, (node) => node.type === 'Element' && node.name === 'form').length);

  for (const section of actionSections) {
    assert.equal(descendants(section, (node) => node.type === 'Element' && node.name === 'h2').length, 1);
    assert.equal(
      descendants(
        section,
        (node) =>
          (node.type === 'InlineComponent' || node.type === 'Component') &&
          node.name === 'Button'
      ).length,
      1
    );
    assert.equal(descendants(section, (node) => node.type === 'Attribute' && node.name === 'role' && node.value?.[0]?.data === 'status').length, 1);
    assert.equal(descendants(section, (node) => node.type === 'Element' && node.name === 'details').length >= 1, true);
  }
});

test('publishing page still compiles for server rendering after the responsive reorder', { skip: !compiler }, () => {
  const result = compiler.compile(source, { filename, generate: 'server' });
  assert.equal(result.warnings.length, 0);
  assert.match(result.js.code, /runPublishPrep/);
  assert.match(result.js.code, /publishLive/);
});
