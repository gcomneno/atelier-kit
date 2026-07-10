import assert from 'node:assert/strict';
import test from 'node:test';
import {
  getStudioItemCoverFields,
  getStudioItemGalleryRows,
  parseStudioItemGalleryFromForm,
  syncItemGalleryCover
} from './studio-item-gallery.js';

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

test('getStudioItemGalleryRows returns editable images entries in order', () => {
  assert.deepEqual(
    getStudioItemGalleryRows({
      images: [
        {
          file: ' /images/items/detail.jpg ',
          alt: ' Detail view ',
          role: ' detail '
        },
        {
          file: '/images/items/cover.jpg',
          alt: 'Cover view',
          role: 'cover'
        }
      ]
    }),
    [
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
  );
});

test('getStudioItemGalleryRows creates a legacy cover row when images are absent', () => {
  assert.deepEqual(
    getStudioItemGalleryRows({
      image_file: '/images/items/legacy.jpg',
      image_alt: 'Legacy cover'
    }),
    [
      {
        file: '/images/items/legacy.jpg',
        alt: 'Legacy cover',
        role: 'cover'
      }
    ]
  );
});

test('parseStudioItemGalleryFromForm preserves submitted gallery order', () => {
  const formData = new FormData();
  formData.append('gallery_files', ' /images/items/detail.jpg ');
  formData.append('gallery_alts', ' Detail view ');
  formData.append('gallery_roles', ' detail ');
  formData.append('gallery_files', '/images/items/cover.jpg');
  formData.append('gallery_alts', 'Cover view');
  formData.append('gallery_roles', 'cover');

  assert.deepEqual(parseStudioItemGalleryFromForm(formData), [
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
  ]);
});

test('parseStudioItemGalleryFromForm skips fully empty rows and omits empty roles', () => {
  const formData = new FormData();
  formData.append('gallery_files', '');
  formData.append('gallery_alts', '');
  formData.append('gallery_roles', '');
  formData.append('gallery_files', '/images/items/cover.jpg');
  formData.append('gallery_alts', 'Cover view');
  formData.append('gallery_roles', '');

  assert.deepEqual(parseStudioItemGalleryFromForm(formData), [
    {
      file: '/images/items/cover.jpg',
      alt: 'Cover view'
    }
  ]);
});

test('parseStudioItemGalleryFromForm requires a file when row metadata is filled', () => {
  const formData = new FormData();
  formData.append('gallery_files', '');
  formData.append('gallery_alts', 'Cover view');
  formData.append('gallery_roles', 'cover');

  assert.throws(
    () => parseStudioItemGalleryFromForm(formData),
    /Each gallery image row needs an image path/
  );
});

test('parseStudioItemGalleryFromForm requires at least one image', () => {
  assert.throws(
    () => parseStudioItemGalleryFromForm(new FormData()),
    /Add at least one gallery image/
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
