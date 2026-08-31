import assert from 'node:assert/strict';
import test from 'node:test';

import sharp from 'sharp';
import { parse } from 'yaml';

import {
  AuthoringRevisionConflictError
} from './authoring-repository-boundary.js';
import {
  parseHostedAuthorizationConfig
} from './hosted-authorization.js';
import {
  HostedRouteGate
} from './hosted-route-gate.js';
import {
  HostedHeroAuthoringReadError,
  HostedHeroAuthoringValidationError,
  HostedHeroAuthoringWriteError,
  HOSTED_HERO_AUTHORING_PATH,
  loadHostedHeroAuthoringData,
  saveHostedHeroAuthoringData
} from './hosted-hero-authoring.js';

/**
 * @typedef {{
 *   reads: string[],
 *   writes: Array<{
 *     changes: unknown,
 *     options: unknown
 *   }>,
 *   repository: {
 *     readText(
 *       path: string
 *     ): Promise<{
 *       content: string,
 *       revision: string
 *     }>,
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
 * @typedef {{
 *   repository: unknown,
 *   slot: unknown,
 *   operation:
 *     'create' | 'replace' | 'remove',
 *   upload?: File | null,
 *   currentPublicPath?: unknown,
 *   expectedRevision: unknown,
 *   buildRelatedTextContent(
 *     nextPublicPath: string
 *   ): string | Promise<string>
 * }} ImageMutationInput
 */

const EXPECTED_REVISION =
  `github:${'1'.repeat(40)}`;

const RESULT_REVISION =
  `github:${'2'.repeat(40)}`;

async function createGenuineContext() {
  const csrfToken =
    Buffer.alloc(32, 7).toString('base64url');

  const currentSession = {
    sessionId: 'A'.repeat(43),
    identity: {
      provider: 'github',
      subject: '123'
    },
    authorization: 'authorized',
    csrfToken,
    createdAt: 100,
    rotatedAt: 100,
    lastSeenAt: 100,
    expiresAt: 1000
  };

  const lifecycle = {
    resolve() {
      return {
        session: currentSession,
        rotationDue: false
      };
    },
    touch() {
      return {
        session: {
          ...currentSession,
          lastSeenAt: 150
        },
        rotationDue: false
      };
    },
    rotate() {
      throw new Error(
        'rotation not expected'
      );
    }
  };

  const gate =
    new HostedRouteGate({
      sessionLifecycle:
        lifecycle,
      authorizationConfig:
        parseHostedAuthorizationConfig({
          ATELIER_STUDIO_AUTHORIZED_GITHUB_IDS:
            '123'
        })
    });

  const result =
    await gate.evaluate(
      'hosted',
      currentSession.sessionId
    );

  if (
    result.outcome !== 'allowed' ||
    !result.context
  ) {
    throw new Error(
      'Unable to create genuine Hosted context'
    );
  }

  return result.context;
}

const HOSTED_CONTEXT =
  await createGenuineContext();

const SITE_YAML = [
  'site:',
  '  name: Example',
  '  language: en',
  '  unrelated:',
  '    preserve: yes',
  '  appearance:',
  '    preset: custom',
  '    background_image: /images/site/background.webp',
  '  hero_banner:',
  '    show: true',
  '    image_file: /images/site/hero-banner.jpg',
  '    description: Existing description',
  '    caption: Existing caption',
  '    href: https://example.test/',
  ''
].join('\n');

const QUOTED_SITE_YAML = [
  'site:',
  '  name: "Ombre Quotidiane"',
  '  tagline: "Il portale editoriale ufficiale."',
  '  language: it',
  '  hero_signature: "Notizie, personaggi, curiosità e materiali dal mondo delle Cronache."',
  '  unrelated:',
  '    preserve: yes',
  '  hero_banner:',
  '    show: true',
  '    image_file: /images/site/hero-banner.jpg',
  ''
].join('\n');

/**
 * @param {{
 *   content?: string,
 *   revision?: string,
 *   resultRevision?: string,
 *   applyError?: Error | null
 * }} [options]
 * @returns {RepositoryHarness}
 */
function repositoryHarness({
  content = SITE_YAML,
  revision =
    EXPECTED_REVISION,
  resultRevision =
    RESULT_REVISION,
  applyError = null
} = {}) {
  /** @type {string[]} */
  const reads = [];

  /** @type {Array<{
   *   changes: unknown,
   *   options: unknown
   * }>} */
  const writes = [];

  return {
    reads,
    writes,
    repository: {
      /** @param {string} path */
      async readText(path) {
        reads.push(path);

        return {
          content,
          revision
        };
      },

      /**
       * @param {unknown} changes
       * @param {unknown} options
       */
      async applyChanges(
        changes,
        options
      ) {
        writes.push({
          changes,
          options
        });

        if (applyError) {
          throw applyError;
        }

        return {
          revision:
            resultRevision
        };
      }
    }
  };
}

/** @param {RepositoryHarness} harness */
function repositoryFactory(
  harness
) {
  return () =>
    harness.repository;
}

async function pngUpload() {
  const bytes =
    await sharp({
      create: {
        width: 32,
        height: 24,
        channels: 3,
        background: {
          r: 10,
          g: 20,
          b: 30
        }
      }
    })
      .png()
      .toBuffer();

  return new File(
    [new Uint8Array(bytes)],
    '../../../../owned.yaml',
    {
      type:
        'text/yaml'
    }
  );
}

function baseForm() {
  const form =
    new FormData();

  form.set(
    'show_banner',
    'on'
  );
  form.set(
    'banner_description',
    'New description'
  );
  form.set(
    'banner_caption',
    'New caption'
  );
  form.set(
    'banner_href',
    'https://new.example/'
  );

  return form;
}

test(
  'Hosted Hero read exposes only projected form state plus canonical revision',
  async () => {
    const harness =
      repositoryHarness();

    const result =
      await loadHostedHeroAuthoringData({
        runtimeMode:
          'hosted',
        hostedContext:
          HOSTED_CONTEXT,
        environment: {},
        repositoryFactory:
          repositoryFactory(
            harness
          )
      });

    assert.deepEqual(
      harness.reads,
      [
        HOSTED_HERO_AUTHORING_PATH
      ]
    );

    assert.deepEqual(
      result,
      {
        siteForm: {
          name: 'Example'
        },
        appearanceForm: {
          background_image:
            '/images/site/background.webp'
        },
        heroBannerForm: {
          show: true,
          image_file:
            '/images/site/hero-banner.jpg',
          description:
            'Existing description',
          caption:
            'Existing caption',
          href:
            'https://example.test/'
        },
        authoringRevision:
          EXPECTED_REVISION
      }
    );

    assert.equal(
      Object.isFrozen(result),
      true
    );
  }
);

test(
  'Hosted Hero read fails closed outside genuine Hosted authority',
  async () => {
    for (const [
      runtimeMode,
      hostedContext
    ] of [
      ['local', HOSTED_CONTEXT],
      ['demo', HOSTED_CONTEXT],
      ['hosted', null],
      ['hosted', {}]
    ]) {
      await assert.rejects(
        loadHostedHeroAuthoringData({
          runtimeMode,
          hostedContext,
          environment: {},
          repositoryFactory() {
            throw new Error(
              'must not reach repository'
            );
          }
        }),
        HostedHeroAuthoringReadError
      );
    }
  }
);

test(
  'Hosted Hero read rejects malformed repository YAML and revision',
  async () => {
    for (const options of [
      {
        content:
          'not: [valid'
      },
      {
        content:
          'other: {}\n'
      },
      {
        revision:
          'browser-controlled'
      }
    ]) {
      const harness =
        repositoryHarness(
          options
        );

      await assert.rejects(
        loadHostedHeroAuthoringData({
          runtimeMode:
            'hosted',
          hostedContext:
            HOSTED_CONTEXT,
          environment: {},
          repositoryFactory:
            repositoryFactory(
              harness
            )
        }),
        HostedHeroAuthoringReadError
      );
    }
  }
);

test(
  'metadata-only Hosted Hero save preserves unrelated site state in one text change set',
  async () => {
    const harness =
      repositoryHarness();

    const form =
      baseForm();

    const result =
      await saveHostedHeroAuthoringData({
        runtimeMode:
          'hosted',
        hostedContext:
          HOSTED_CONTEXT,
        formData:
          form,
        expectedRevision:
          EXPECTED_REVISION,
        environment: {},
        repositoryFactory:
          repositoryFactory(
            harness
          )
      });

    assert.equal(
      harness.writes.length,
      1
    );

    const call =
      harness.writes[0];

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
      /** @type {Array<{
       *   type: string,
       *   path: string,
       *   content: string
       * }>} */ (
        call.changes
      );

    assert.equal(
      changes.length,
      1
    );
    assert.equal(
      changes[0].type,
      'text'
    );
    assert.equal(
      changes[0].path,
      HOSTED_HERO_AUTHORING_PATH
    );

    const written =
      parse(
        changes[0].content
      );

    assert.equal(
      written.site.name,
      'Example'
    );
    assert.equal(
      written.site.language,
      'en'
    );
    assert.deepEqual(
      written.site.unrelated,
      {
        preserve: 'yes'
      }
    );
    assert.deepEqual(
      written.site.appearance,
      {
        preset: 'custom',
        background_image:
          '/images/site/background.webp'
      }
    );
    assert.deepEqual(
      written.site.hero_banner,
      {
        show: true,
        image_file:
          '/images/site/hero-banner.jpg',
        description:
          'New description',
        caption:
          'New caption',
        href:
          'https://new.example/'
      }
    );

    assert.equal(
      result.authoringRevision,
      RESULT_REVISION
    );
  }
);

test(
  'metadata-only Hosted Hero save preserves untouched YAML scalar representation',
  async () => {
    const harness =
      repositoryHarness({
        content:
          QUOTED_SITE_YAML
      });

    await saveHostedHeroAuthoringData({
      runtimeMode:
        'hosted',
      hostedContext:
        HOSTED_CONTEXT,
      formData:
        baseForm(),
      expectedRevision:
        EXPECTED_REVISION,
      environment: {},
      repositoryFactory:
        repositoryFactory(
          harness
        )
    });

    assert.equal(
      harness.writes.length,
      1
    );

    const changes =
      /** @type {Array<{
       *   type: string,
       *   path: string,
       *   content: string
       * }>} */ (
        harness.writes[0].changes
      );

    const content =
      changes[0].content;

    assert.ok(
      content.includes(
        '  name: "Ombre Quotidiane"'
      )
    );
    assert.ok(
      content.includes(
        '  tagline: "Il portale editoriale ufficiale."'
      )
    );
    assert.ok(
      content.includes(
        '  hero_signature: "Notizie, personaggi, curiosità e materiali dal mondo delle Cronache."'
      )
    );

    const written =
      parse(content);

    assert.deepEqual(
      written.site.hero_banner,
      {
        show: true,
        image_file:
          '/images/site/hero-banner.jpg',
        description:
          'New description',
        caption:
          'New caption',
        href:
          'https://new.example/'
      }
    );
  }
);

test(
  'image-bearing Hosted Hero save preserves untouched YAML scalar representation',
  async () => {
    const harness =
      repositoryHarness({
        content:
          QUOTED_SITE_YAML
      });

    const form =
      baseForm();

    form.set(
      'banner_upload',
      await pngUpload()
    );

    let relatedContent = '';

    await saveHostedHeroAuthoringData({
      runtimeMode:
        'hosted',
      hostedContext:
        HOSTED_CONTEXT,
      formData:
        form,
      expectedRevision:
        EXPECTED_REVISION,
      environment: {},
      repositoryFactory:
        repositoryFactory(
          harness
        ),
      /** @param {ImageMutationInput} input */
      async imageMutationApplier(
        input
      ) {
        relatedContent =
          await input.buildRelatedTextContent(
            '/images/site/hero-banner.png'
          );

        return {
          publicPath:
            '/images/site/hero-banner.png',
          authoringRevision:
            RESULT_REVISION
        };
      }
    });

    assert.ok(
      relatedContent.includes(
        '  name: "Ombre Quotidiane"'
      )
    );
    assert.ok(
      relatedContent.includes(
        '  tagline: "Il portale editoriale ufficiale."'
      )
    );
    assert.ok(
      relatedContent.includes(
        '  hero_signature: "Notizie, personaggi, curiosità e materiali dal mondo delle Cronache."'
      )
    );

    const written =
      parse(relatedContent);

    assert.equal(
      written.site.hero_banner.image_file,
      '/images/site/hero-banner.png'
    );
  }
);

test(
  'Hosted Hero upload delegates replace authority to the branded Hero slot and trusted current path',
  async () => {
    const harness =
      repositoryHarness();

    const form =
      baseForm();

    form.set(
      'banner_upload',
      await pngUpload()
    );

    /** @type {ImageMutationInput[]} */
    const calls = [];

    const result =
      await saveHostedHeroAuthoringData({
        runtimeMode:
          'hosted',
        hostedContext:
          HOSTED_CONTEXT,
        formData:
          form,
        expectedRevision:
          EXPECTED_REVISION,
        environment: {},
        repositoryFactory:
          repositoryFactory(
            harness
          ),
        /** @param {ImageMutationInput} input */
        async imageMutationApplier(
          input
        ) {
          calls.push(input);

          const related =
            await input.buildRelatedTextContent(
              '/images/site/hero-banner.png'
            );

          const written =
            parse(related);

          assert.equal(
            written.site.unrelated.preserve,
            'yes'
          );
          assert.equal(
            written.site.hero_banner.image_file,
            '/images/site/hero-banner.png'
          );

          return {
            publicPath:
              '/images/site/hero-banner.png',
            authoringRevision:
              RESULT_REVISION
          };
        }
      });

    assert.equal(
      calls.length,
      1
    );

    assert.equal(
      calls[0].operation,
      'replace'
    );
    assert.equal(
      calls[0].currentPublicPath,
      '/images/site/hero-banner.jpg'
    );
    assert.equal(
      calls[0].expectedRevision,
      EXPECTED_REVISION
    );
    assert.equal(
      calls[0].repository,
      harness.repository
    );
    assert.ok(
      calls[0].upload instanceof File
    );
    assert.equal(
      calls[0].upload.name,
      '../../../../owned.yaml'
    );

    assert.equal(
      result.heroBannerForm.image_file,
      '/images/site/hero-banner.png'
    );
  }
);

test(
  'Hosted Hero remove uses only trusted repository image path and clears the banner atomically',
  async () => {
    const harness =
      repositoryHarness();

    const form =
      new FormData();

    form.set(
      'remove_hero_image',
      'on'
    );
    form.set(
      'banner_image_file',
      '/images/site/attacker-controlled.png'
    );

    /** @type {ImageMutationInput[]} */
    const calls = [];

    const result =
      await saveHostedHeroAuthoringData({
        runtimeMode:
          'hosted',
        hostedContext:
          HOSTED_CONTEXT,
        formData:
          form,
        expectedRevision:
          EXPECTED_REVISION,
        environment: {},
        repositoryFactory:
          repositoryFactory(
            harness
          ),
        /** @param {ImageMutationInput} input */
        async imageMutationApplier(
          input
        ) {
          calls.push(input);

          const related =
            await input.buildRelatedTextContent(
              ''
            );

          const written =
            parse(related);

          assert.equal(
            written.site.hero_banner,
            undefined
          );
          assert.equal(
            written.site.unrelated.preserve,
            'yes'
          );

          return {
            publicPath: '',
            authoringRevision:
              RESULT_REVISION
          };
        }
      });

    assert.equal(
      calls[0].operation,
      'remove'
    );
    assert.equal(
      calls[0].currentPublicPath,
      '/images/site/hero-banner.jpg'
    );
    assert.equal(
      'upload' in calls[0],
      false
    );

    assert.equal(
      result.heroBannerForm.image_file,
      ''
    );
    assert.equal(
      result.heroBannerForm.show,
      false
    );
  }
);

test(
  'show without trusted existing or newly uploaded image rejects before mutation',
  async () => {
    const harness =
      repositoryHarness({
        content: [
          'site:',
          '  name: Example',
          ''
        ].join('\n')
      });

    const form =
      baseForm();

    await assert.rejects(
      saveHostedHeroAuthoringData({
        runtimeMode:
          'hosted',
        hostedContext:
          HOSTED_CONTEXT,
        formData:
          form,
        expectedRevision:
          EXPECTED_REVISION,
        environment: {},
        repositoryFactory:
          repositoryFactory(
            harness
          )
      }),
      HostedHeroAuthoringValidationError
    );

    assert.equal(
      harness.writes.length,
      0
    );
  }
);

test(
  'invalid marked Hero fields fail before repository mutation',
  async () => {
    const harness =
      repositoryHarness();

    const form =
      baseForm();

    form.set(
      'banner_caption',
      '{font:arbitrary}unsafe{/font}'
    );

    await assert.rejects(
      saveHostedHeroAuthoringData({
        runtimeMode:
          'hosted',
        hostedContext:
          HOSTED_CONTEXT,
        formData:
          form,
        expectedRevision:
          EXPECTED_REVISION,
        environment: {},
        repositoryFactory:
          repositoryFactory(
            harness
          )
      }),
      HostedHeroAuthoringValidationError
    );

    assert.equal(
      harness.writes.length,
      0
    );
  }
);

test(
  'metadata-only optimistic-concurrency conflict crosses Hosted Hero boundary unchanged',
  async () => {
    const conflict =
      new AuthoringRevisionConflictError(
        'main',
        EXPECTED_REVISION,
        `github:${'3'.repeat(40)}`
      );

    const harness =
      repositoryHarness({
        applyError:
          conflict
      });

    await assert.rejects(
      saveHostedHeroAuthoringData({
        runtimeMode:
          'hosted',
        hostedContext:
          HOSTED_CONTEXT,
        formData:
          baseForm(),
        expectedRevision:
          EXPECTED_REVISION,
        environment: {},
        repositoryFactory:
          repositoryFactory(
            harness
          )
      }),
      (error) =>
        error === conflict
    );

    assert.equal(
      harness.writes.length,
      1
    );
  }
);

test(
  'upload and remove conflict fails before image or repository mutation',
  async () => {
    const harness =
      repositoryHarness();

    const form =
      baseForm();

    form.set(
      'banner_upload',
      await pngUpload()
    );
    form.set(
      'remove_hero_image',
      'on'
    );

    let imageCalls = 0;

    await assert.rejects(
      saveHostedHeroAuthoringData({
        runtimeMode:
          'hosted',
        hostedContext:
          HOSTED_CONTEXT,
        formData:
          form,
        expectedRevision:
          EXPECTED_REVISION,
        environment: {},
        repositoryFactory:
          repositoryFactory(
            harness
          ),
        async imageMutationApplier() {
          imageCalls += 1;

          throw new Error(
            'must not run'
          );
        }
      }),
      HostedHeroAuthoringValidationError
    );

    assert.equal(
      harness.reads.length,
      0
    );
    assert.equal(
      harness.writes.length,
      0
    );
    assert.equal(
      imageCalls,
      0
    );
  }
);

test(
  'unexpected image-boundary failures are redacted while optimistic conflict remains explicit',
  async () => {
    const harness =
      repositoryHarness();

    const form =
      baseForm();

    form.set(
      'banner_upload',
      await pngUpload()
    );

    await assert.rejects(
      saveHostedHeroAuthoringData({
        runtimeMode:
          'hosted',
        hostedContext:
          HOSTED_CONTEXT,
        formData:
          form,
        expectedRevision:
          EXPECTED_REVISION,
        environment: {},
        repositoryFactory:
          repositoryFactory(
            harness
          ),
        async imageMutationApplier() {
          throw new Error(
            'repository secret detail'
          );
        }
      }),
      (error) => {
        assert.ok(
          error instanceof
            HostedHeroAuthoringWriteError
        );
        assert.equal(
          error.message.includes(
            'repository secret detail'
          ),
          false
        );
        return true;
      }
    );

    const conflict =
      new AuthoringRevisionConflictError(
        'main',
        EXPECTED_REVISION,
        `github:${'4'.repeat(40)}`
      );

    await assert.rejects(
      saveHostedHeroAuthoringData({
        runtimeMode:
          'hosted',
        hostedContext:
          HOSTED_CONTEXT,
        formData:
          form,
        expectedRevision:
          EXPECTED_REVISION,
        environment: {},
        repositoryFactory:
          repositoryFactory(
            harness
          ),
        async imageMutationApplier() {
          throw conflict;
        }
      }),
      (error) =>
        error === conflict
    );
  }
);
