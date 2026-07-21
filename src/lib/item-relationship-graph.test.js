import assert from 'node:assert/strict';
import test from 'node:test';
import { projectItemRelationshipGraph } from './item-relationship-graph.js';

const items = [
  {
    id: 'work-b',
    title: 'Work B',
    images: [{ file: '/images/items/detail.jpg', alt: 'Detail' }, { file: '/images/items/cover.jpg', alt: 'Cover', role: 'cover' }],
    relations: [{ type: 'echoes', target: 'work-a' }]
  },
  {
    id: 'work-a',
    title: 'Work A',
    image_file: '/images/items/legacy.jpg',
    relations: [
      { type: 'inspired-by', target: 'work-b', label: 'Companion work' },
      { type: 'displayed-with', target: 'work-b' }
    ]
  },
  { id: 'study', title: 'Disconnected Study' },
  { id: 'outside', title: 'Outside', relations: [{ type: 'points-to', target: 'work-a' }] }
];

test('projects normalized nodes, canonical links, resolved images and typed edges', () => {
  assert.deepEqual(projectItemRelationshipGraph(items), {
    nodes: [
      { id: 'outside', label: 'Outside', href: '/items/outside' },
      { id: 'study', label: 'Disconnected Study', href: '/items/study' },
      { id: 'work-a', label: 'Work A', image: '/images/items/legacy.jpg', href: '/items/work-a' },
      { id: 'work-b', label: 'Work B', image: '/images/items/cover.jpg', href: '/items/work-b' }
    ],
    edges: [
      { source: 'outside', target: 'work-a', type: 'points-to' },
      { source: 'work-a', target: 'work-b', type: 'displayed-with' },
      { source: 'work-a', target: 'work-b', type: 'inspired-by', label: 'Companion work' },
      { source: 'work-b', target: 'work-a', type: 'echoes' }
    ]
  });
});

test('projects an induced subset, retains disconnected nodes and does not infer inverses', () => {
  assert.deepEqual(projectItemRelationshipGraph(items, { itemIds: ['study', 'work-a', 'work-b'] }), {
    nodes: [
      { id: 'study', label: 'Disconnected Study', href: '/items/study' },
      { id: 'work-a', label: 'Work A', image: '/images/items/legacy.jpg', href: '/items/work-a' },
      { id: 'work-b', label: 'Work B', image: '/images/items/cover.jpg', href: '/items/work-b' }
    ],
    edges: [
      { source: 'work-a', target: 'work-b', type: 'displayed-with' },
      { source: 'work-a', target: 'work-b', type: 'inspired-by', label: 'Companion work' },
      { source: 'work-b', target: 'work-a', type: 'echoes' }
    ]
  });
});

test('is deterministic across equivalent item and relationship input order', () => {
  const reversed = [...items].reverse().map((item) => ({
    ...item,
    ...(item.relations ? { relations: [...item.relations].reverse() } : {})
  }));
  assert.deepEqual(projectItemRelationshipGraph(reversed), projectItemRelationshipGraph(items));
});

test('rejects unknown subset ids without inventing placeholder nodes', () => {
  assert.throws(
    () => projectItemRelationshipGraph(items, { itemIds: ['missing-z', 'work-a', 'missing-a'] }),
    /unknown ids: missing-a, missing-z/
  );
});

test('uses canonical item and relation validation', () => {
  assert.throws(() => projectItemRelationshipGraph([{ id: '', title: 'Bad' }]), /invalid "id"/);
  assert.throws(() => projectItemRelationshipGraph([{ id: 'bad', title: '', relations: [] }]), /invalid "title"/);
  assert.throws(
    () => projectItemRelationshipGraph([{ id: 'bad', title: 'Bad', relations: [{ type: '', target: 'x' }] }]),
    /type must be a non-empty string/
  );
  assert.throws(
    () => projectItemRelationshipGraph([{ id: 'bad', title: 'Bad', relations: [{ type: 'points-to', target: 'missing' }] }]),
    /targets missing item "missing"/
  );
});

test('does not mutate caller-owned items or subset ids', () => {
  const input = structuredClone(items);
  const itemIds = ['work-b', 'work-a'];
  const itemsSnapshot = structuredClone(input);
  const idsSnapshot = [...itemIds];
  projectItemRelationshipGraph(input, { itemIds });
  assert.deepEqual(input, itemsSnapshot);
  assert.deepEqual(itemIds, idsSnapshot);
});
