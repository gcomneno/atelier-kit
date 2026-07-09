import assert from 'node:assert/strict';
import test from 'node:test';
import {
  getItemCoverImage,
  ITEM_IMAGE_PLACEHOLDER,
  normalizeItemImages
} from './item-images.js';

test('normalizeItemImages keeps legacy image_file compatibility', () => {
  const images = normalizeItemImages({
    image_file: '/images/items/legacy.jpg',
    image_alt: 'Legacy cover'
  });

  assert.deepEqual(images, [
    {
      file: '/images/items/legacy.jpg',
      alt: 'Legacy cover',
      role: 'cover'
    }
  ]);
});

test('normalizeItemImages falls back to placeholder for empty item images', () => {
  const images = normalizeItemImages({});

  assert.deepEqual(images, [
    {
      file: ITEM_IMAGE_PLACEHOLDER,
      alt: '',
      role: 'cover'
    }
  ]);
});

test('normalizeItemImages prefers gallery entries when provided', () => {
  const images = normalizeItemImages({
    image_file: '/images/items/legacy.jpg',
    image_alt: 'Legacy cover',
    images: [
      {
        file: '/images/items/detail.jpg',
        alt: 'Detail view',
        role: 'detail'
      }
    ]
  });

  assert.deepEqual(images, [
    {
      file: '/images/items/detail.jpg',
      alt: 'Detail view',
      role: 'detail'
    }
  ]);
});

test('getItemCoverImage returns the gallery image marked as cover', () => {
  const cover = getItemCoverImage({
    images: [
      {
        file: '/images/items/detail.jpg',
        alt: 'Detail view',
        role: 'detail'
      },
      {
        file: '/images/items/cover.jpg',
        alt: 'Cover view',
        role: 'cover'
      }
    ]
  });

  assert.deepEqual(cover, {
    file: '/images/items/cover.jpg',
    alt: 'Cover view',
    role: 'cover'
  });
});

test('getItemCoverImage falls back to first gallery image when no cover role exists', () => {
  const cover = getItemCoverImage({
    images: [
      {
        file: '/images/items/first.jpg',
        alt: 'First view'
      },
      {
        file: '/images/items/second.jpg',
        alt: 'Second view'
      }
    ]
  });

  assert.deepEqual(cover, {
    file: '/images/items/first.jpg',
    alt: 'First view'
  });
});
