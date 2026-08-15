import sharp from 'sharp';

const MEBIBYTE = 1024 * 1024;

export const HOSTED_IMAGE_UPLOAD_POLICY = Object.freeze({
  maxBytes: 5 * MEBIBYTE,
  maxWidth: 8192,
  maxHeight: 8192,
  maxPixels: 40_000_000,
  formats: Object.freeze(['jpeg', 'png', 'webp'])
});

const FORMAT_CONTRACT = Object.freeze({
  jpeg: Object.freeze({
    extension: 'jpg',
    mimeType: 'image/jpeg'
  }),
  png: Object.freeze({
    extension: 'png',
    mimeType: 'image/png'
  }),
  webp: Object.freeze({
    extension: 'webp',
    mimeType: 'image/webp'
  })
});

export class HostedImageUploadError extends Error {
  /**
   * @param {string} code
   */
  constructor(code) {
    super('Hosted image upload is invalid.');
    this.name = 'HostedImageUploadError';
    this.code = code;
  }
}

/**
 * @param {string} code
 * @returns {never}
 */
function fail(code) {
  throw new HostedImageUploadError(code);
}

/**
 * @param {number | undefined} width
 * @param {number | undefined} height
 */
function assertDimensions(width, height) {
  if (
    typeof width !== 'number' ||
    typeof height !== 'number' ||
    !Number.isInteger(width) ||
    !Number.isInteger(height) ||
    width <= 0 ||
    height <= 0
  ) {
    fail('INVALID_DIMENSIONS');
  }

  if (
    width > HOSTED_IMAGE_UPLOAD_POLICY.maxWidth ||
    height > HOSTED_IMAGE_UPLOAD_POLICY.maxHeight
  ) {
    fail('DIMENSIONS_EXCEEDED');
  }

  if (
    width * height >
    HOSTED_IMAGE_UPLOAD_POLICY.maxPixels
  ) {
    fail('PIXEL_BUDGET_EXCEEDED');
  }
}

/**
 * Validate one untrusted Hosted image upload before repository authority.
 *
 * Browser-provided filename, extension and MIME type are deliberately
 * non-authoritative. libvips/sharp determines the actual input format from
 * the bytes.
 *
 * Metadata inspection identifies the format and dimensions; stats() then
 * forces pixel decoding so a truncated or otherwise undecodable payload
 * cannot pass admission based only on a plausible header.
 *
 * @param {File} file
 * @returns {Promise<Readonly<{
 *   copyBytes: () => Buffer,
 *   byteLength: number,
 *   format: 'jpeg' | 'png' | 'webp',
 *   extension: 'jpg' | 'png' | 'webp',
 *   mimeType: 'image/jpeg' | 'image/png' | 'image/webp',
 *   width: number,
 *   height: number
 * }>>}
 */
export async function validateHostedImageUpload(file) {
  if (!(file instanceof File) || file.size <= 0) {
    fail('FILE_REQUIRED');
  }

  if (
    file.size >
    HOSTED_IMAGE_UPLOAD_POLICY.maxBytes
  ) {
    fail('BYTE_LIMIT_EXCEEDED');
  }

  let bytes;

  try {
    bytes = Buffer.from(
      await file.arrayBuffer()
    );
  } catch {
    fail('READ_FAILED');
  }

  if (
    bytes.length <= 0 ||
    bytes.length !== file.size
  ) {
    fail('READ_FAILED');
  }

  if (
    bytes.length >
    HOSTED_IMAGE_UPLOAD_POLICY.maxBytes
  ) {
    fail('BYTE_LIMIT_EXCEEDED');
  }

  let image;
  let metadata;

  try {
    image = sharp(bytes, {
      limitInputPixels:
        HOSTED_IMAGE_UPLOAD_POLICY.maxPixels,
      unlimited: false,
      pages: 1
    });

    metadata = await image.metadata();
  } catch {
    fail('MALFORMED_IMAGE');
  }

  const format =
    typeof metadata.format === 'string'
      ? metadata.format
      : '';

  if (
    !Object.prototype.hasOwnProperty.call(
      FORMAT_CONTRACT,
      format
    )
  ) {
    fail('UNSUPPORTED_FORMAT');
  }

  assertDimensions(
    metadata.width,
    metadata.height
  );

  try {
    await image.stats();
  } catch {
    fail('MALFORMED_IMAGE');
  }

  const contract =
    FORMAT_CONTRACT[
      /** @type {'jpeg' | 'png' | 'webp'} */ (
        format
      )
    ];

  const canonicalBytes =
    Buffer.from(bytes);

  return Object.freeze({
    copyBytes() {
      return Buffer.from(
        canonicalBytes
      );
    },
    byteLength: canonicalBytes.length,
    format:
      /** @type {'jpeg' | 'png' | 'webp'} */ (
        format
      ),
    extension: contract.extension,
    mimeType: contract.mimeType,
    width:
      /** @type {number} */ (
        metadata.width
      ),
    height:
      /** @type {number} */ (
        metadata.height
      )
  });
}
