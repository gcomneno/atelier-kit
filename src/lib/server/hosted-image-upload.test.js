import assert from 'node:assert/strict';
import test from 'node:test';
import sharp from 'sharp';

import {
  HOSTED_IMAGE_UPLOAD_POLICY,
  HostedImageUploadError,
  validateHostedImageUpload
} from './hosted-image-upload.js';

/**
 * @param {'jpeg' | 'png' | 'webp'} format
 * @param {number} [width]
 * @param {number} [height]
 */
async function encodedImage(
  format,
  width = 16,
  height = 12
) {
  const image = sharp({
    create: {
      width,
      height,
      channels: 3,
      background: {
        r: 40,
        g: 80,
        b: 120
      }
    }
  });

  if (format === 'jpeg') {
    return image.jpeg().toBuffer();
  }

  if (format === 'png') {
    return image.png().toBuffer();
  }

  if (format === 'webp') {
    return image.webp().toBuffer();
  }

  throw new Error(
    `Unsupported test format: ${format}`
  );
}

/**
 * @param {Buffer} bytes
 * @param {string} name
 * @param {string} type
 */
function upload(bytes, name, type) {
  const part = new Uint8Array(bytes.length);
  part.set(bytes);

  return new File(
    [part],
    name,
    { type }
  );
}

/**
 * @param {Promise<unknown>} promise
 * @param {string} code
 */
async function expectCode(promise, code) {
  await assert.rejects(
    promise,
    (error) => {
      assert.ok(
        error instanceof
          HostedImageUploadError
      );

      assert.equal(
        error.code,
        code
      );

      assert.equal(
        error.message,
        'Hosted image upload is invalid.'
      );

      return true;
    }
  );
}

test(
  'Hosted image policy is explicit finite and immutable',
  () => {
    assert.deepEqual(
      HOSTED_IMAGE_UPLOAD_POLICY.formats,
      ['jpeg', 'png', 'webp']
    );

    assert.equal(
      HOSTED_IMAGE_UPLOAD_POLICY.maxBytes,
      5 * 1024 * 1024
    );

    assert.equal(
      HOSTED_IMAGE_UPLOAD_POLICY.maxWidth,
      8192
    );

    assert.equal(
      HOSTED_IMAGE_UPLOAD_POLICY.maxHeight,
      8192
    );

    assert.equal(
      HOSTED_IMAGE_UPLOAD_POLICY.maxPixels,
      40_000_000
    );

    assert.equal(
      Object.isFrozen(
        HOSTED_IMAGE_UPLOAD_POLICY
      ),
      true
    );

    assert.equal(
      Object.isFrozen(
        HOSTED_IMAGE_UPLOAD_POLICY.formats
      ),
      true
    );
  }
);

test(
  'valid PNG is identified from bytes and ignores misleading browser metadata',
  async () => {
    const bytes =
      await encodedImage(
        'png',
        640,
        480
      );

    const result =
      await validateHostedImageUpload(
        upload(
          bytes,
          '../../pretend.jpg',
          'text/plain'
        )
      );

    assert.deepEqual(
      {
        format: result.format,
        extension: result.extension,
        mimeType: result.mimeType,
        width: result.width,
        height: result.height
      },
      {
        format: 'png',
        extension: 'png',
        mimeType: 'image/png',
        width: 640,
        height: 480
      }
    );

    assert.equal(
      Object.isFrozen(result),
      true
    );

    assert.equal(
      'name' in result,
      false
    );
  }
);

test(
  'valid JPEG is admitted from decoded bytes',
  async () => {
    const bytes =
      await encodedImage(
        'jpeg',
        1920,
        1080
      );

    const result =
      await validateHostedImageUpload(
        upload(
          bytes,
          'anything.bin',
          'application/octet-stream'
        )
      );

    assert.deepEqual(
      {
        format: result.format,
        extension: result.extension,
        mimeType: result.mimeType,
        width: result.width,
        height: result.height
      },
      {
        format: 'jpeg',
        extension: 'jpg',
        mimeType: 'image/jpeg',
        width: 1920,
        height: 1080
      }
    );
  }
);

test(
  'valid WebP is admitted from decoded bytes',
  async () => {
    const bytes =
      await encodedImage(
        'webp',
        1600,
        900
      );

    const result =
      await validateHostedImageUpload(
        upload(
          bytes,
          'photo.jpeg',
          'image/jpeg'
        )
      );

    assert.deepEqual(
      {
        format: result.format,
        extension: result.extension,
        mimeType: result.mimeType,
        width: result.width,
        height: result.height
      },
      {
        format: 'webp',
        extension: 'webp',
        mimeType: 'image/webp',
        width: 1600,
        height: 900
      }
    );
  }
);

test(
  'missing and empty uploads fail closed',
  async () => {
    await expectCode(
      validateHostedImageUpload(
        /** @type {any} */ (null)
      ),
      'FILE_REQUIRED'
    );

    await expectCode(
      validateHostedImageUpload(
        new File(
          [],
          'empty.png',
          { type: 'image/png' }
        )
      ),
      'FILE_REQUIRED'
    );
  }
);

test(
  'byte limit is enforced before image decoding',
  async () => {
    const bytes =
      Buffer.alloc(
        HOSTED_IMAGE_UPLOAD_POLICY.maxBytes + 1
      );

    await expectCode(
      validateHostedImageUpload(
        upload(
          bytes,
          'large.png',
          'image/png'
        )
      ),
      'BYTE_LIMIT_EXCEEDED'
    );
  }
);

test(
  'browser metadata cannot make arbitrary bytes an admitted image',
  async () => {
    await expectCode(
      validateHostedImageUpload(
        upload(
          Buffer.from('not an image'),
          '../../photo.png',
          'image/png'
        )
      ),
      'MALFORMED_IMAGE'
    );
  }
);

test(
  'unsupported but valid image format is rejected',
  async () => {
    const gif =
      await sharp({
        create: {
          width: 10,
          height: 10,
          channels: 3,
          background: {
            r: 1,
            g: 2,
            b: 3
          }
        }
      })
        .gif()
        .toBuffer();

    await expectCode(
      validateHostedImageUpload(
        upload(
          gif,
          'pretend.webp',
          'image/webp'
        )
      ),
      'UNSUPPORTED_FORMAT'
    );
  }
);

test(
  'truncated admitted image payloads fail closed',
  async () => {
    for (
      const format of
      /** @type {const} */ (
        ['jpeg', 'png', 'webp']
      )
    ) {
      const complete =
        await encodedImage(
          format,
          64,
          48
        );

      const truncated =
        complete.subarray(
          0,
          Math.max(
            1,
            Math.floor(
              complete.length / 2
            )
          )
        );

      await expectCode(
        validateHostedImageUpload(
          upload(
            truncated,
            `truncated.${format}`,
            `image/${format}`
          )
        ),
        'MALFORMED_IMAGE'
      );
    }
  }
);

test(
  'explicit dimension limit is enforced independently',
  async () => {
    const tooWide =
      await encodedImage(
        'png',
        8193,
        1
      );

    await expectCode(
      validateHostedImageUpload(
        upload(
          tooWide,
          'wide.png',
          'image/png'
        )
      ),
      'DIMENSIONS_EXCEEDED'
    );
  }
);

test(
  'pixel budget rejects oversized decoded input',
  async () => {
    const tooManyPixels =
      await encodedImage(
        'png',
        7000,
        6000
      );

    await expectCode(
      validateHostedImageUpload(
        upload(
          tooManyPixels,
          'pixels.png',
          'image/png'
        )
      ),
      'MALFORMED_IMAGE'
    );
  }
);

test(
  'returned bytes remain independent of caller source Buffer',
  async () => {
    const source =
      await encodedImage(
        'png',
        320,
        240
      );

    const firstByte =
      source[0];

    const result =
      await validateHostedImageUpload(
        upload(
          source,
          'source.png',
          'image/png'
        )
      );

    source.fill(0);

    assert.equal(
      result.bytes[0],
      firstByte
    );

    assert.notEqual(
      result.bytes[0],
      0
    );
  }
);
