import assert from 'node:assert/strict';
import test from 'node:test';
import { getStudioItemCoverFields, syncItemGalleryCover } from './studio-item-gallery.js';

test('getStudioItemCoverFields returns the effective gallery cover', () => {
  assert.deepEqual(
    getStudioItemCoverFields({
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
    }),
    {
      image_file: '/images/items/cover.jpg',
      image_alt: 'Cover view'
    }
  );
});

test('getStudioItemCoverFields keeps legacy cover compatibility', () => {
  assert.deepEqual(
    getStudioItemCoverFields({
      image_file: '/images/items/legacy.jpg',
      image_alt: 'Legacy cover'
    }),
    {
      image_file: '/images/items/legacy.jpg',
      image_alt: 'Legacy cover'
    }
  );
});

test('syncItemGalleryCover leaves items without images untouched', () => {
  assert.deepEqual(
    syncItemGalleryCover(
      {
        image_file: '/images/items/legacy.jpg',
        image_alt: 'Legacy cover'
      },
      '/images/items/new-cover.jpg',
      'New cover'
    ),
    {}
  );
});

test('syncItemGalleryCover updates the gallery image marked as cover', () => {
  assert.deepEqual(
    syncItemGalleryCover(
      {
        images: [
          {
            file: '/images/items/detail.jpg',
            alt: 'Detail view',
            role: 'detail'
          },
          {
            file: '/images/items/old-cover.jpg',
            alt: 'Old cover',
            role: 'cover'
          }
        ]
      },
      '/images/items/new-cover.jpg',
      'New cover'
    ),
    {
      images: [
        {
          file: '/images/items/detail.jpg',
          alt: 'Detail view',
          role: 'detail'
        },
        {
          file: '/images/items/new-cover.jpg',
          alt: 'New cover',
          role: 'cover'
        }
      ]
    }
  );
});

test('syncItemGalleryCover updates the first valid gallery image when no cover role exists', () => {
  assert.deepEqual(
    syncItemGalleryCover(
      {
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
      },
      '/images/items/new-first.jpg',
      ''
    ),
    {
      images: [
        {
          file: '/images/items/new-first.jpg',
          alt: ''
        },
        {
          file: '/images/items/second.jpg',
          alt: 'Second view'
        }
      ]
    }
  );
});
