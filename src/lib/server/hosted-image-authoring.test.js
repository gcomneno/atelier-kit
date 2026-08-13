import assert from 'node:assert/strict';
import test from 'node:test';

import sharp from 'sharp';

import {
  AuthoringRevisionConflictError
} from './authoring-repository-boundary.js';
import {
  HOSTED_IMAGE_SLOTS,
  HostedImageAuthoringValidationError,
  applyHostedImageAuthoringMutation,
  isHostedImageSlot,
  resolveHostedImageCurrentPath,
  resolveHostedImageDestination
} from './hosted-image-authoring.js';

const EXPECTED_REVISION =
  `github:${'1'.repeat(40)}`;

const RESULT_REVISION =
  `github:${'2'.repeat(40)}`;

/**
 * @typedef {{
 *   calls: Array<{
 *     changes: unknown,
 *     options: unknown
 *   }>,
 *   repository: {
 *     applyChanges(
 *       changes: unknown,
 *       options: unknown
 *     ): Promise<{
 *       revision: string
 *     }>
 *   }
 * }} RepositoryHarness
 */

/**
 * @param {'jpeg' | 'png' | 'webp'} format
 * @returns {Promise<Buffer>}
 */
async function encodedImage(
  format
) {
  let pipeline =
    sharp({
      create: {
        width: 32,
        height: 24,
        channels: 3,
        background: {
          r: 20,
          g: 40,
          b: 60
        }
      }
    });

  if (format === 'jpeg') {
    pipeline = pipeline.jpeg();
  } else if (format === 'png') {
    pipeline = pipeline.png();
  } else {
    pipeline = pipeline.webp();
  }

  return pipeline.toBuffer();
}

/**
 * @param {Buffer} bytes
 * @param {string} [name]
 * @param {string} [type]
 * @returns {File}
 */
function upload(
  bytes,
  name = 'browser-controlled.bin',
  type = 'application/octet-stream'
) {
  const part =
    new Uint8Array(bytes.length);

  part.set(bytes);

  return new File(
    [part],
    name,
    { type }
  );
}

/**
 * @param {{
 *   resultRevision?: string,
 *   error?: Error | null
 * }} [options]
 */
function repositoryHarness({
  resultRevision =
    RESULT_REVISION,
  error = null
} = {}) {
  /** @type {Array<{
   *   changes: unknown,
   *   options: unknown
   * }>} */
  const calls = [];

  return {
    calls,
    repository: {
      /**
       * @param {unknown} changes
       * @param {unknown} options
       */
      async applyChanges(
        changes,
        options
      ) {
        calls.push({
          changes,
          options
        });

        if (error) {
          throw error;
        }

        return {
          revision:
            resultRevision
        };
      }
    }
  };
}

test(
  'only branded finite server slots carry image destination authority',
  () => {
    assert.equal(
      isHostedImageSlot(
        HOSTED_IMAGE_SLOTS.siteHeroBanner
      ),
      true
    );

    assert.equal(
      isHostedImageSlot({
        ...HOSTED_IMAGE_SLOTS.siteHeroBanner
      }),
      false
    );

    assert.deepEqual(
      resolveHostedImageDestination(
        HOSTED_IMAGE_SLOTS.siteHeroBanner,
        'webp'
      ),
      {
        repositoryPath:
          'static/images/site/hero-banner.webp',
        publicPath:
          '/images/site/hero-banner.webp'
      }
    );

    assert.throws(
      () =>
        resolveHostedImageDestination(
          HOSTED_IMAGE_SLOTS.siteHeroBanner,
          '../../secret'
        )
    );

    for (const candidate of [
      '',
      null,
      undefined
    ]) {
      assert.throws(
        () =>
          resolveHostedImageCurrentPath(
            HOSTED_IMAGE_SLOTS.siteHeaderLogo,
            candidate
          ),
        HostedImageAuthoringValidationError
      );
    }
  }
);

test(
  'existing asset must belong exactly to the same server-owned slot',
  () => {
    assert.deepEqual(
      resolveHostedImageCurrentPath(
        HOSTED_IMAGE_SLOTS.siteHeaderLogo,
        '/images/site/header-logo.jpg'
      ),
      {
        repositoryPath:
          'static/images/site/header-logo.jpg',
        publicPath:
          '/images/site/header-logo.jpg'
      }
    );

    for (const candidate of [
      '/images/site/favicon.jpg',
      '../../secret',
      '/images/site/header-logo.svg',
      'static/images/site/header-logo.jpg'
    ]) {
      assert.throws(
        () =>
          resolveHostedImageCurrentPath(
            HOSTED_IMAGE_SLOTS.siteHeaderLogo,
            candidate
          ),
        HostedImageAuthoringValidationError
      );
    }
  }
);

test(
  'create with validated upload and server-built YAML uses one expected revision and one change set',
  async () => {
    const harness =
      repositoryHarness();

    /** @type {string[]} */
    const observedPaths = [];

    const result =
      await applyHostedImageAuthoringMutation({
        repository:
          harness.repository,
        slot:
          HOSTED_IMAGE_SLOTS.siteHeroBanner,
        operation:
          'create',
        upload:
          upload(
            await encodedImage('png'),
            '../../browser-name.jpg',
            'image/jpeg'
          ),
        expectedRevision:
          EXPECTED_REVISION,
        /** @param {string} publicPath */
        buildRelatedTextContent(
          publicPath
        ) {
          observedPaths.push(
            publicPath
          );

          return [
            'site:',
            '  hero_banner:',
            `    image_file: ${publicPath}`,
            ''
          ].join('\n');
        }
      });

    assert.deepEqual(
      observedPaths,
      [
        '/images/site/hero-banner.png'
      ]
    );

    assert.equal(
      harness.calls.length,
      1
    );

    const call =
      harness.calls[0];

    assert.deepEqual(
      call.options,
      {
        expectedRevision:
          EXPECTED_REVISION,
        message:
          'studio: update hero banner'
      }
    );

    const changes =
      /** @type {Array<any>} */ (
        call.changes
      );

    assert.equal(
      changes.length,
      2
    );

    assert.deepEqual(
      changes[0],
      {
        type: 'text',
        path:
          'config/site.yaml',
        content:
          [
            'site:',
            '  hero_banner:',
            '    image_file: /images/site/hero-banner.png',
            ''
          ].join('\n')
      }
    );

    assert.equal(
      changes[1].type,
      'binary'
    );
    assert.equal(
      changes[1].path,
      'static/images/site/hero-banner.png'
    );
    assert.equal(
      Buffer.isBuffer(
        changes[1].content
      ),
      true
    );

    assert.deepEqual(
      result,
      {
        publicPath:
          '/images/site/hero-banner.png',
        authoringRevision:
          RESULT_REVISION
      }
    );
  }
);

test(
  'cross-format replacement writes new image deletes only prior slot asset and updates YAML atomically',
  async () => {
    const harness =
      repositoryHarness();

    await applyHostedImageAuthoringMutation({
      repository:
        harness.repository,
      slot:
        HOSTED_IMAGE_SLOTS.siteHeaderLogo,
      operation:
        'replace',
      upload:
        upload(
          await encodedImage('webp')
        ),
      currentPublicPath:
        '/images/site/header-logo.jpg',
      expectedRevision:
        EXPECTED_REVISION,
      /** @param {string} publicPath */
      buildRelatedTextContent(
        publicPath
      ) {
        return [
          'site:',
          `  header_logo: ${publicPath}`,
          ''
        ].join('\n');
      }
    });

    const changes =
      /** @type {Array<any>} */ (
        harness.calls[0].changes
      );

    assert.deepEqual(
      changes.map(
        ({ type, path }) => ({
          type,
          path
        })
      ),
      [
        {
          type: 'text',
          path:
            'config/site.yaml'
        },
        {
          type: 'binary',
          path:
            'static/images/site/header-logo.webp'
        },
        {
          type: 'delete',
          path:
            'static/images/site/header-logo.jpg'
        }
      ]
    );
  }
);

test(
  'same-format replacement never emits a conflicting delete for the destination',
  async () => {
    const harness =
      repositoryHarness();

    await applyHostedImageAuthoringMutation({
      repository:
        harness.repository,
      slot:
        HOSTED_IMAGE_SLOTS.siteFavicon,
      operation:
        'replace',
      upload:
        upload(
          await encodedImage('png')
        ),
      currentPublicPath:
        '/images/site/favicon.png',
      expectedRevision:
        EXPECTED_REVISION,
      /** @param {string} publicPath */
      buildRelatedTextContent(
        publicPath
      ) {
        return `site:\n  favicon: ${publicPath}\n`;
      }
    });

    assert.deepEqual(
      /** @type {Array<any>} */ (
        harness.calls[0].changes
      ).map(
        ({ type, path }) => ({
          type,
          path
        })
      ),
      [
        {
          type: 'text',
          path:
            'config/site.yaml'
        },
        {
          type: 'binary',
          path:
            'static/images/site/favicon.png'
        }
      ]
    );
  }
);

test(
  'removal clears authoritative YAML path and deletes current asset in one mutation',
  async () => {
    const harness =
      repositoryHarness();

    const result =
      await applyHostedImageAuthoringMutation({
        repository:
          harness.repository,
        slot:
          HOSTED_IMAGE_SLOTS.siteBackground,
        operation:
          'remove',
        currentPublicPath:
          '/images/site/background.webp',
        expectedRevision:
          EXPECTED_REVISION,
        /** @param {string} publicPath */
        buildRelatedTextContent(
          publicPath
        ) {
          assert.equal(
            publicPath,
            ''
          );

          return 'site:\n  appearance: {}\n';
        }
      });

    assert.deepEqual(
      /** @type {Array<any>} */ (
        harness.calls[0].changes
      ).map(
        ({ type, path }) => ({
          type,
          path
        })
      ),
      [
        {
          type: 'text',
          path:
            'config/site.yaml'
        },
        {
          type: 'delete',
          path:
            'static/images/site/background.webp'
        }
      ]
    );

    assert.equal(
      result.publicPath,
      ''
    );
  }
);

test(
  'malicious browser filename MIME and traversal data cannot select repository paths',
  async () => {
    const harness =
      repositoryHarness();

    await applyHostedImageAuthoringMutation({
      repository:
        harness.repository,
      slot:
        HOSTED_IMAGE_SLOTS.siteHeroBanner,
      operation:
        'create',
      upload:
        upload(
          await encodedImage('jpeg'),
          '../../../../content/owned.yaml',
          'text/yaml'
        ),
      expectedRevision:
        EXPECTED_REVISION,
      /** @param {string} publicPath */
      buildRelatedTextContent(
        publicPath
      ) {
        return `site:\n  image: ${publicPath}\n`;
      }
    });

    assert.deepEqual(
      /** @type {Array<any>} */ (
        harness.calls[0].changes
      ).map(
        ({ type, path }) => ({
          type,
          path
        })
      ),
      [
        {
          type: 'text',
          path:
            'config/site.yaml'
        },
        {
          type: 'binary',
          path:
            'static/images/site/hero-banner.jpg'
        }
      ]
    );
  }
);

test(
  'malformed image and explicit operation-shape conflicts fail before repository authority',
  async () => {
    const malformedHarness =
      repositoryHarness();

    await assert.rejects(
      applyHostedImageAuthoringMutation({
        repository:
          malformedHarness.repository,
        slot:
          HOSTED_IMAGE_SLOTS.siteHeroBanner,
        operation:
          'create',
        upload:
          upload(
            Buffer.from(
              'not an image'
            ),
            'hero.png',
            'image/png'
          ),
        expectedRevision:
          EXPECTED_REVISION,
        buildRelatedTextContent() {
          return 'site: {}\n';
        }
      })
    );

    assert.equal(
      malformedHarness.calls.length,
      0
    );

    const createWithCurrentHarness =
      repositoryHarness();

    await assert.rejects(
      applyHostedImageAuthoringMutation({
        repository:
          createWithCurrentHarness.repository,
        slot:
          HOSTED_IMAGE_SLOTS.siteHeroBanner,
        operation:
          'create',
        upload:
          upload(
            await encodedImage('webp')
          ),
        currentPublicPath:
          '/images/site/favicon.png',
        expectedRevision:
          EXPECTED_REVISION,
        buildRelatedTextContent() {
          return 'site: {}\n';
        }
      }),
      HostedImageAuthoringValidationError
    );

    assert.equal(
      createWithCurrentHarness.calls.length,
      0
    );

    for (const currentPublicPath of [
      '',
      null,
      undefined
    ]) {
      const createWithBlankCurrentHarness =
        repositoryHarness();

      await assert.rejects(
        applyHostedImageAuthoringMutation({
          repository:
            createWithBlankCurrentHarness.repository,
          slot:
            HOSTED_IMAGE_SLOTS.siteHeroBanner,
          operation:
            'create',
          upload:
            upload(
              await encodedImage('webp')
            ),
          currentPublicPath,
          expectedRevision:
            EXPECTED_REVISION,
          buildRelatedTextContent() {
            return 'site: {}\n';
          }
        }),
        HostedImageAuthoringValidationError
      );

      assert.equal(
        createWithBlankCurrentHarness.calls.length,
        0
      );
    }

    const missingReplaceCurrentHarness =
      repositoryHarness();

    await assert.rejects(
      applyHostedImageAuthoringMutation({
        repository:
          missingReplaceCurrentHarness.repository,
        slot:
          HOSTED_IMAGE_SLOTS.siteHeroBanner,
        operation:
          'replace',
        upload:
          upload(
            await encodedImage('webp')
          ),
        expectedRevision:
          EXPECTED_REVISION,
        buildRelatedTextContent() {
          return 'site: {}\n';
        }
      }),
      HostedImageAuthoringValidationError
    );

    assert.equal(
      missingReplaceCurrentHarness.calls.length,
      0
    );

    for (const currentPublicPath of [
      '',
      null,
      undefined
    ]) {
      const replaceWithBlankCurrentHarness =
        repositoryHarness();

      await assert.rejects(
        applyHostedImageAuthoringMutation({
          repository:
            replaceWithBlankCurrentHarness.repository,
          slot:
            HOSTED_IMAGE_SLOTS.siteHeroBanner,
          operation:
            'replace',
          upload:
            upload(
              await encodedImage('webp')
            ),
          currentPublicPath,
          expectedRevision:
            EXPECTED_REVISION,
          buildRelatedTextContent() {
            return 'site: {}\n';
          }
        }),
        HostedImageAuthoringValidationError
      );

      assert.equal(
        replaceWithBlankCurrentHarness.calls.length,
        0
      );
    }

    const missingRemoveCurrentHarness =
      repositoryHarness();

    await assert.rejects(
      applyHostedImageAuthoringMutation({
        repository:
          missingRemoveCurrentHarness.repository,
        slot:
          HOSTED_IMAGE_SLOTS.siteHeroBanner,
        operation:
          'remove',
        expectedRevision:
          EXPECTED_REVISION,
        buildRelatedTextContent() {
          return 'site: {}\n';
        }
      }),
      HostedImageAuthoringValidationError
    );

    assert.equal(
      missingRemoveCurrentHarness.calls.length,
      0
    );

    for (const currentPublicPath of [
      '',
      null,
      undefined
    ]) {
      const blankRemoveCurrentHarness =
        repositoryHarness();

      await assert.rejects(
        applyHostedImageAuthoringMutation({
          repository:
            blankRemoveCurrentHarness.repository,
          slot:
            HOSTED_IMAGE_SLOTS.siteHeroBanner,
          operation:
            'remove',
          currentPublicPath,
          expectedRevision:
            EXPECTED_REVISION,
          buildRelatedTextContent() {
            return 'site: {}\n';
          }
        }),
        HostedImageAuthoringValidationError
      );

      assert.equal(
        blankRemoveCurrentHarness.calls.length,
        0
      );
    }

    const removePropertyHarness =
      repositoryHarness();

    await assert.rejects(
      applyHostedImageAuthoringMutation(
        /** @type {any} */ ({
          repository:
            removePropertyHarness.repository,
          slot:
            HOSTED_IMAGE_SLOTS.siteHeroBanner,
          operation:
            'create',
          upload:
            upload(
              await encodedImage('png')
            ),
          remove: true,
          expectedRevision:
            EXPECTED_REVISION,
          buildRelatedTextContent() {
            return 'site: {}\n';
          }
        })
      ),
      HostedImageAuthoringValidationError
    );

    assert.equal(
      removePropertyHarness.calls.length,
      0
    );

    const invalidOperationHarness =
      repositoryHarness();

    await assert.rejects(
      applyHostedImageAuthoringMutation({
        repository:
          invalidOperationHarness.repository,
        slot:
          HOSTED_IMAGE_SLOTS.siteHeroBanner,
        operation:
          JSON.parse(
            '"archive"'
          ),
        upload:
          upload(
            await encodedImage('webp')
          ),
        expectedRevision:
          EXPECTED_REVISION,
        buildRelatedTextContent() {
          return 'site: {}\n';
        }
      }),
      HostedImageAuthoringValidationError
    );

    assert.equal(
      invalidOperationHarness.calls.length,
      0
    );
  }
);

test(
  'only own request properties carry mutation authority',
  async () => {
    /** @type {(input: unknown, harness: RepositoryHarness) => Promise<void>} */
    const expectRejectedBeforeMutation =
      async (
        input,
        harness
      ) => {
        await assert.rejects(
          applyHostedImageAuthoringMutation(
            /** @type {any} */ (
              input
            )
          ),
          HostedImageAuthoringValidationError
        );

        assert.equal(
          harness.calls.length,
          0
        );
      };

    /** @type {(publicPath: string) => string} */
    const buildImageText =
      (publicPath) =>
        [
          'site:',
          `  image: ${publicPath}`,
          ''
        ].join('\n');

    /** @type {(publicPath: string) => string} */
    const buildHeaderText =
      (publicPath) =>
        `site:\n  header_logo: ${publicPath}\n`;

    /** @type {(publicPath: string) => string} */
    const buildBackgroundText =
      (publicPath) =>
        [
          'site:',
          `  background: ${publicPath}`,
          ''
        ].join('\n');

    const inheritedCreateHarness =
      repositoryHarness();
    const inheritedCreateInput =
      Object.create({
        operation: 'create'
      });

    Object.assign(
      inheritedCreateInput,
      {
        repository:
          inheritedCreateHarness.repository,
        slot:
          HOSTED_IMAGE_SLOTS.siteHeroBanner,
        upload:
          upload(
            await encodedImage('png')
          ),
        expectedRevision:
          EXPECTED_REVISION,
        buildRelatedTextContent:
          buildImageText
      }
    );

    await expectRejectedBeforeMutation(
      inheritedCreateInput,
      inheritedCreateHarness
    );

    const inheritedReplaceHarness =
      repositoryHarness();
    const inheritedReplaceInput =
      Object.create({
        operation: 'replace'
      });

    Object.assign(
      inheritedReplaceInput,
      {
        repository:
          inheritedReplaceHarness.repository,
        slot:
          HOSTED_IMAGE_SLOTS.siteHeaderLogo,
        upload:
          upload(
            await encodedImage('webp')
          ),
        currentPublicPath:
          '/images/site/header-logo.jpg',
        expectedRevision:
          EXPECTED_REVISION,
        buildRelatedTextContent:
          buildHeaderText
      }
    );

    await expectRejectedBeforeMutation(
      inheritedReplaceInput,
      inheritedReplaceHarness
    );

    const inheritedRemoveHarness =
      repositoryHarness();
    const inheritedRemoveInput =
      Object.create({
        remove: true
      });

    Object.assign(
      inheritedRemoveInput,
      {
        repository:
          inheritedRemoveHarness.repository,
        slot:
          HOSTED_IMAGE_SLOTS.siteBackground,
        operation:
          'create',
        upload:
          upload(
            await encodedImage('png')
          ),
        expectedRevision:
          EXPECTED_REVISION,
        buildRelatedTextContent:
          buildBackgroundText
      }
    );

    const inheritedRemoveResult =
      await applyHostedImageAuthoringMutation(
        inheritedRemoveInput
      );

    assert.equal(
      inheritedRemoveHarness.calls.length,
      1
    );

    const inheritedRemoveChanges =
      /** @type {Array<{ type: string, path: string }>} */ (
        inheritedRemoveHarness.calls[0].changes
      );

    assert.deepEqual(
      inheritedRemoveChanges.map(
        ({ type, path }) => ({
          type,
          path
        })
      ),
      [
        {
          type: 'text',
          path:
            'config/site.yaml'
        },
        {
          type: 'binary',
          path:
            'static/images/site/background.png'
        }
      ]
    );

    assert.deepEqual(
      inheritedRemoveResult,
      {
        publicPath:
          '/images/site/background.png',
        authoringRevision:
          RESULT_REVISION
      }
    );

    const ownRemoveHarness =
      repositoryHarness();

    await assert.rejects(
      applyHostedImageAuthoringMutation(
        /** @type {any} */ ({
          repository:
            ownRemoveHarness.repository,
          slot:
            HOSTED_IMAGE_SLOTS.siteHeroBanner,
          operation:
            'create',
          upload:
            upload(
              await encodedImage('png')
            ),
          remove: true,
          expectedRevision:
            EXPECTED_REVISION,
          buildRelatedTextContent:
            buildImageText
        })
      ),
      HostedImageAuthoringValidationError
    );

    assert.equal(
      ownRemoveHarness.calls.length,
      0
    );

    for (const prototype of [
      {
        slot:
          HOSTED_IMAGE_SLOTS.siteHeroBanner
      },
      {
        expectedRevision:
          EXPECTED_REVISION
      }
    ]) {
      const inheritedAuthorityHarness =
        repositoryHarness();
      const inheritedAuthorityInput =
        Object.create(prototype);

      Object.assign(
        inheritedAuthorityInput,
        {
          repository:
            inheritedAuthorityHarness.repository,
          operation:
            'create',
          upload:
            upload(
              await encodedImage('webp')
            ),
          buildRelatedTextContent:
            buildImageText
        },
        Object.prototype.hasOwnProperty.call(
          prototype,
          'slot'
        )
          ? {
              expectedRevision:
                EXPECTED_REVISION
            }
          : {
              slot:
                HOSTED_IMAGE_SLOTS.siteHeroBanner
            }
      );

      await expectRejectedBeforeMutation(
        inheritedAuthorityInput,
        inheritedAuthorityHarness
      );
    }
  }
);

test(
  'upload, revision, and callback failure all precede repository mutation',
  async () => {
    const bytes =
      await encodedImage('png');

    for (const run of [
      /** @param {RepositoryHarness} harness */
      async (harness) =>
        applyHostedImageAuthoringMutation({
          repository:
            harness.repository,
          slot:
            HOSTED_IMAGE_SLOTS.siteHeroBanner,
          operation:
            'remove',
          upload:
            upload(bytes),
          expectedRevision:
            EXPECTED_REVISION,
          buildRelatedTextContent() {
            return 'site: {}\n';
          }
        }),

      /** @param {RepositoryHarness} harness */
      async (harness) =>
        applyHostedImageAuthoringMutation({
          repository:
            harness.repository,
          slot:
            HOSTED_IMAGE_SLOTS.siteHeroBanner,
          operation:
            'remove',
          expectedRevision:
            'browser-controlled',
          buildRelatedTextContent() {
            return 'site: {}\n';
          }
        }),

      /** @param {RepositoryHarness} harness */
      async (harness) =>
        applyHostedImageAuthoringMutation({
          repository:
            harness.repository,
          slot:
            HOSTED_IMAGE_SLOTS.siteHeroBanner,
          operation:
            'remove',
          expectedRevision:
            EXPECTED_REVISION,
          buildRelatedTextContent() {
            throw new Error(
              'private parser detail'
            );
          }
        })
    ]) {
      const harness =
        repositoryHarness();

      await assert.rejects(
        run(harness)
      );

      assert.equal(
        harness.calls.length,
        0
      );
    }
  }
);

test(
  'optimistic-concurrency conflict crosses boundary with no retry',
  async () => {
    const conflict =
      new AuthoringRevisionConflictError(
        'main',
        EXPECTED_REVISION,
        `github:${'3'.repeat(40)}`
      );

    const harness =
      repositoryHarness({
        error:
          conflict
      });

    await assert.rejects(
      applyHostedImageAuthoringMutation({
        repository:
          harness.repository,
        slot:
          HOSTED_IMAGE_SLOTS.siteFavicon,
        operation:
          'remove',
        currentPublicPath:
          '/images/site/favicon.jpg',
        expectedRevision:
          EXPECTED_REVISION,
        buildRelatedTextContent() {
          return 'site: {}\n';
        }
      }),
      (error) =>
        error === conflict
    );

    assert.equal(
      harness.calls.length,
      1
    );
  }
);
