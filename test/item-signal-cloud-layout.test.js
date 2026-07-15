import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const itemPage = fs.readFileSync(path.join(root, 'src/routes/items/[id]/+page.svelte'), 'utf8');

test('Item Signal Clouds precede the full-width VisitorBrief in DOM order', () => {
  const cloudEach = itemPage.indexOf('{#each signalClouds as cloud}');
  const signalCloud = itemPage.indexOf('<SignalCloud itemId={item.id} {cloud} />', cloudEach);
  const eachEnd = itemPage.indexOf('{/each}', signalCloud);
  const visitorBrief = itemPage.indexOf('<VisitorBrief {item} {signalClouds}', eachEnd);

  assert.ok(cloudEach >= 0, 'renders Signal Clouds from the global list');
  assert.ok(signalCloud > cloudEach, 'renders each SignalCloud inside the list');
  assert.ok(eachEnd > signalCloud, 'closes the complete cloud list before the contact panel');
  assert.ok(visitorBrief > eachEnd, 'renders VisitorBrief after every Signal Cloud');
});

test('Item Signal Clouds use two balanced desktop columns and one narrow-screen column', () => {
  assert.match(
    itemPage,
    /\.visitor-grid\s*{[^}]*grid-template-columns:\s*repeat\(2,\s*minmax\(0,\s*1fr\)\)/s
  );
  assert.match(itemPage, /\.visitor-brief-row\s*{[^}]*grid-column:\s*1\s*\/\s*-1/s);
  assert.match(
    itemPage,
    /@media\s*\(max-width:\s*900px\)\s*{[\s\S]*?\.visitor-grid\s*{[^}]*grid-template-columns:\s*1fr/s
  );
  assert.match(
    itemPage,
    /\.signal-item,\s*\.visitor-brief-row\s*{[^}]*min-width:\s*0/s,
    'grid children can shrink instead of overflowing on long content'
  );
});
