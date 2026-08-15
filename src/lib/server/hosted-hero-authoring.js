import { parse, stringify } from 'yaml';

import {
  AuthoringRevisionConflictError
} from './authoring-repository-boundary.js';
import {
  commitShaFromGitHubRevision,
  createGitHubAuthoringRepositoryFromEnvironment
} from './github-authoring-repository.js';
import {
  HOSTED_IMAGE_SLOTS,
  HostedImageAuthoringValidationError,
  HostedImageAuthoringWriteError,
  applyHostedImageAuthoringMutation
} from './hosted-image-authoring.js';
import {
  isTrustedHostedRequestContext
} from './hosted-request-context.js';
import {
  readImageMutation
} from './studio-image-mutation.js';
import {
  checkboxEnabled
} from './studio-form-values.js';
import {
  assertValidMarkedText
} from '../marked-text.js';
import {
  STUDIO_RUNTIME_MODES
} from '../studio-runtime.js';

export const HOSTED_HERO_AUTHORING_PATH =
  'config/site.yaml';

const HERO_COMMIT_MESSAGE =
  'studio: update hero banner';

export class HostedHeroAuthoringReadError
  extends Error {
  constructor() {
    super(
      'Hosted Hero authoring is unavailable.'
    );
    this.name =
      'HostedHeroAuthoringReadError';
    this.code =
      'HOSTED_HERO_AUTHORING_READ_FAILED';
  }
}

export class HostedHeroAuthoringValidationError
  extends Error {
  constructor() {
    super(
      'Hosted Hero authoring input is invalid.'
    );
    this.name =
      'HostedHeroAuthoringValidationError';
    this.code =
      'HOSTED_HERO_AUTHORING_VALIDATION_FAILED';
  }
}

export class HostedHeroAuthoringRevisionError
  extends Error {
  constructor() {
    super(
      'Hosted Hero authoring revision is invalid.'
    );
    this.name =
      'HostedHeroAuthoringRevisionError';
    this.code =
      'HOSTED_HERO_AUTHORING_REVISION_INVALID';
  }
}

export class HostedHeroAuthoringWriteError
  extends Error {
  constructor() {
    super(
      'Hosted Hero authoring write failed.'
    );
    this.name =
      'HostedHeroAuthoringWriteError';
    this.code =
      'HOSTED_HERO_AUTHORING_WRITE_FAILED';
  }
}

/**
 * @param {unknown} value
 * @returns {value is Record<string, unknown>}
 */
function isRecord(value) {
  return (
    value !== null &&
    typeof value === 'object' &&
    !Array.isArray(value)
  );
}

/**
 * @param {Record<string, unknown>} record
 * @param {string} key
 * @param {string} [fallback]
 */
function readString(
  record,
  key,
  fallback = ''
) {
  return typeof record[key] === 'string'
    ? record[key]
    : fallback;
}

/**
 * @param {unknown} value
 */
function optionalField(value) {
  return typeof value === 'string'
    ? value.trim()
    : '';
}

/**
 * @param {unknown} content
 */
function parseSiteDocument(content) {
  if (typeof content !== 'string') {
    throw new HostedHeroAuthoringValidationError();
  }

  let document;

  try {
    document = parse(content);
  } catch {
    throw new HostedHeroAuthoringValidationError();
  }

  if (
    !isRecord(document) ||
    !isRecord(document.site)
  ) {
    throw new HostedHeroAuthoringValidationError();
  }

  return document;
}

/**
 * @param {Record<string, unknown>} document
 */
function serializeSiteDocument(document) {
  try {
    return `${stringify(document).trim()}\n`;
  } catch {
    throw new HostedHeroAuthoringValidationError();
  }
}

/**
 * @param {Record<string, unknown>} site
 */
function heroFormFromSite(site) {
  const banner =
    isRecord(site.hero_banner)
      ? site.hero_banner
      : {};

  return Object.freeze({
    show:
      banner.show === true,
    image_file:
      readString(
        banner,
        'image_file'
      ),
    description:
      readString(
        banner,
        'description'
      ),
    caption:
      readString(
        banner,
        'caption'
      ),
    href:
      readString(
        banner,
        'href'
      )
  });
}

/**
 * The Hero page needs only this narrow subset of site state outside
 * hero_banner. It must come from the same trusted repository document.
 *
 * @param {Record<string, unknown>} site
 */
function supportingFormsFromSite(site) {
  const appearance =
    isRecord(site.appearance)
      ? site.appearance
      : {};

  return Object.freeze({
    siteForm:
      Object.freeze({
        name:
          readString(
            site,
            'name'
          )
      }),
    appearanceForm:
      Object.freeze({
        background_image:
          readString(
            appearance,
            'background_image'
          )
      })
  });
}

/**
 * @param {unknown} revision
 */
function validateRevision(revision) {
  if (typeof revision !== 'string') {
    throw new HostedHeroAuthoringRevisionError();
  }

  try {
    commitShaFromGitHubRevision(
      revision
    );
  } catch {
    throw new HostedHeroAuthoringRevisionError();
  }

  return revision;
}

/**
 * @param {{
 *   runtimeMode: unknown,
 *   hostedContext: unknown,
 *   environment?: Record<string, string | undefined>,
 *   repositoryFactory?: Function
 * }} input
 */
export async function loadHostedHeroAuthoringData({
  runtimeMode,
  hostedContext,
  environment = process.env,
  repositoryFactory =
    createGitHubAuthoringRepositoryFromEnvironment
}) {
  if (
    runtimeMode !==
      STUDIO_RUNTIME_MODES.HOSTED ||
    !isTrustedHostedRequestContext(
      hostedContext
    ) ||
    environment === null ||
    typeof environment !== 'object' ||
    Array.isArray(environment) ||
    typeof repositoryFactory !== 'function'
  ) {
    throw new HostedHeroAuthoringReadError();
  }

  try {
    const repository =
      repositoryFactory(environment);

    if (
      !isRecord(repository) ||
      typeof repository.readText !==
        'function'
    ) {
      throw new Error();
    }

    const result =
      await repository.readText(
        HOSTED_HERO_AUTHORING_PATH
      );

    if (
      !isRecord(result) ||
      typeof result.content !== 'string' ||
      typeof result.revision !== 'string'
    ) {
      throw new Error();
    }

    validateRevision(
      result.revision
    );

    const document =
      parseSiteDocument(
        result.content
      );

    const site =
      /** @type {Record<string, unknown>} */ (
        document.site
      );

    const supporting =
      supportingFormsFromSite(site);

    return Object.freeze({
      siteForm:
        supporting.siteForm,
      appearanceForm:
        supporting.appearanceForm,
      heroBannerForm:
        heroFormFromSite(site),
      authoringRevision:
        result.revision
    });
  } catch {
    throw new HostedHeroAuthoringReadError();
  }
}

/**
 * Build the next complete trusted config/site.yaml document.
 *
 * Browser state is allowed to influence only the existing Hero form
 * fields. Everything else remains copied from repository state.
 *
 * @param {Record<string, unknown>} document
 * @param {FormData} formData
 * @param {string} nextImagePath
 * @param {boolean} removingImage
 */
function buildNextHeroDocument(
  document,
  formData,
  nextImagePath,
  removingImage
) {
  const existingSite =
    /** @type {Record<string, unknown>} */ (
      document.site
    );

  const site = {
    ...existingSite
  };

  const existingBanner =
    isRecord(site.hero_banner)
      ? site.hero_banner
      : {};

  const show =
    !removingImage &&
    checkboxEnabled(
      formData.get('show_banner')
    );

  const description =
    show
      ? optionalField(
          formData.get(
            'banner_description'
          )
        )
      : optionalField(
          existingBanner.description
        );

  const caption =
    show
      ? optionalField(
          formData.get(
            'banner_caption'
          )
        )
      : optionalField(
          existingBanner.caption
        );

  const href =
    show
      ? optionalField(
          formData.get(
            'banner_href'
          )
        )
      : optionalField(
          existingBanner.href
        );

  try {
    assertValidMarkedText([
      {
        path:
          'site.hero_banner.description',
        value:
          description,
        mode:
          'multiline'
      },
      {
        path:
          'site.hero_banner.caption',
        value:
          caption
      }
    ]);
  } catch {
    throw new HostedHeroAuthoringValidationError();
  }

  if (
    show &&
    nextImagePath === ''
  ) {
    throw new HostedHeroAuthoringValidationError();
  }

  if (show) {
    site.hero_banner = {
      show: true,
      image_file:
        nextImagePath,
      ...(description !== ''
        ? { description }
        : {}),
      ...(caption !== ''
        ? { caption }
        : {}),
      ...(href !== ''
        ? { href }
        : {})
    };
  } else if (
    nextImagePath !== ''
  ) {
    site.hero_banner = {
      show: false,
      image_file:
        nextImagePath,
      ...(description !== ''
        ? { description }
        : {}),
      ...(caption !== ''
        ? { caption }
        : {}),
      ...(href !== ''
        ? { href }
        : {})
    };
  } else {
    delete site.hero_banner;
  }

  return {
    ...document,
    site
  };
}

/**
 * @param {{
 *   runtimeMode: unknown,
 *   hostedContext: unknown,
 *   formData: unknown,
 *   expectedRevision: unknown,
 *   environment?: Record<string, string | undefined>,
 *   repositoryFactory?: Function,
 *   imageMutationApplier?: Function
 * }} input
 */
export async function saveHostedHeroAuthoringData({
  runtimeMode,
  hostedContext,
  formData,
  expectedRevision,
  environment = process.env,
  repositoryFactory =
    createGitHubAuthoringRepositoryFromEnvironment,
  imageMutationApplier =
    applyHostedImageAuthoringMutation
}) {
  if (
    runtimeMode !==
      STUDIO_RUNTIME_MODES.HOSTED ||
    !isTrustedHostedRequestContext(
      hostedContext
    ) ||
    !(formData instanceof FormData) ||
    environment === null ||
    typeof environment !== 'object' ||
    Array.isArray(environment) ||
    typeof repositoryFactory !== 'function' ||
    typeof imageMutationApplier !==
      'function'
  ) {
    throw new HostedHeroAuthoringWriteError();
  }

  validateRevision(
    expectedRevision
  );

  let mutation;

  try {
    mutation =
      readImageMutation(
        formData,
        'banner_upload',
        'remove_hero_image'
      );
  } catch {
    throw new HostedHeroAuthoringValidationError();
  }

  let repository;
  let currentDocument;
  let currentRevision;

  try {
    repository =
      repositoryFactory(environment);

    if (
      !isRecord(repository) ||
      typeof repository.readText !==
        'function' ||
      typeof repository.applyChanges !==
        'function'
    ) {
      throw new Error();
    }

    const current =
      await repository.readText(
        HOSTED_HERO_AUTHORING_PATH
      );

    if (
      !isRecord(current) ||
      typeof current.content !== 'string' ||
      typeof current.revision !== 'string'
    ) {
      throw new Error();
    }

    validateRevision(
      current.revision
    );

    currentRevision =
      current.revision;

    currentDocument =
      parseSiteDocument(
        current.content
      );
  } catch (error) {
    if (
      error instanceof
        HostedHeroAuthoringRevisionError
    ) {
      throw error;
    }

    throw new HostedHeroAuthoringWriteError();
  }

  const currentSite =
    /** @type {Record<string, unknown>} */ (
      currentDocument.site
    );

  const currentBanner =
    isRecord(
      currentSite.hero_banner
    )
      ? currentSite.hero_banner
      : {};

  const currentImagePath =
    readString(
      currentBanner,
      'image_file'
    );

  /*
   * A stale browser revision never becomes authority for repository
   * content. We still use the submitted expected revision as the
   * atomic mutation precondition; applyChanges will reject it.
   *
   * Current image/delete authority always comes from this trusted read.
   */
  void currentRevision;

  if (
    mutation.upload !== null ||
    mutation.remove
  ) {
    /** @type {'create' | 'replace' | 'remove'} */
    let operation;

    if (mutation.remove) {
      operation = 'remove';
    } else if (
      currentImagePath !== ''
    ) {
      operation = 'replace';
    } else {
      operation = 'create';
    }

    /** @type {{
     *   repository: unknown,
     *   slot: unknown,
     *   operation: 'create' | 'replace' | 'remove',
     *   upload?: File | null,
     *   currentPublicPath?: unknown,
     *   expectedRevision: unknown,
     *   buildRelatedTextContent:
     *     (nextPublicPath: string) => string
     * }} */
    const input = {
      repository,
      slot:
        HOSTED_IMAGE_SLOTS.siteHeroBanner,
      operation,
      expectedRevision,
      /** @param {string} nextPublicPath */
      buildRelatedTextContent(
        nextPublicPath
      ) {
        const nextDocument =
          buildNextHeroDocument(
            currentDocument,
            formData,
            nextPublicPath,
            mutation.remove
          );

        return serializeSiteDocument(
          nextDocument
        );
      }
    };

    if (mutation.upload !== null) {
      input.upload =
        mutation.upload;
    }

    if (
      operation === 'replace' ||
      operation === 'remove'
    ) {
      input.currentPublicPath =
        currentImagePath;
    }

    try {
      const result =
        await imageMutationApplier(
          input
        );

      if (
        !isRecord(result) ||
        typeof result.publicPath !==
          'string' ||
        typeof result.authoringRevision !==
          'string'
      ) {
        throw new HostedHeroAuthoringWriteError();
      }

      validateRevision(
        result.authoringRevision
      );

      const nextDocument =
        buildNextHeroDocument(
          currentDocument,
          formData,
          result.publicPath,
          mutation.remove
        );

      const nextSite =
        /** @type {Record<string, unknown>} */ (
          nextDocument.site
        );

      const supporting =
        supportingFormsFromSite(
          nextSite
        );

      return Object.freeze({
        siteForm:
          supporting.siteForm,
        appearanceForm:
          supporting.appearanceForm,
        heroBannerForm:
          heroFormFromSite(
            nextSite
          ),
        authoringRevision:
          result.authoringRevision
      });
    } catch (error) {
      if (
        error instanceof
          HostedHeroAuthoringValidationError ||
        error instanceof
          HostedHeroAuthoringRevisionError
      ) {
        throw error;
      }

      if (
        error instanceof
          HostedImageAuthoringValidationError
      ) {
        throw new HostedHeroAuthoringValidationError();
      }

      if (
        error instanceof
          HostedImageAuthoringWriteError
      ) {
        throw new HostedHeroAuthoringWriteError();
      }

      /*
       * Optimistic-concurrency conflict deliberately crosses this
       * boundary unchanged. Every other unexpected image-boundary
       * failure is redacted behind the Hosted Hero write error.
       */
      if (
        error instanceof
          AuthoringRevisionConflictError
      ) {
        throw error;
      }

      throw new HostedHeroAuthoringWriteError();
    }
  }

  /*
   * Existing Hero metadata may be edited without changing the image.
   * This remains one text-only atomic repository mutation.
   */
  let nextDocument;

  try {
    nextDocument =
      buildNextHeroDocument(
        currentDocument,
        formData,
        currentImagePath,
        false
      );
  } catch (error) {
    if (
      error instanceof
        HostedHeroAuthoringValidationError
    ) {
      throw error;
    }

    throw new HostedHeroAuthoringValidationError();
  }

  const content =
    serializeSiteDocument(
      nextDocument
    );

  try {
    const result =
      await repository.applyChanges(
        [
          {
            type: 'text',
            path:
              HOSTED_HERO_AUTHORING_PATH,
            content
          }
        ],
        {
          expectedRevision,
          message:
            HERO_COMMIT_MESSAGE
        }
      );

    if (
      !isRecord(result) ||
      typeof result.revision !== 'string'
    ) {
      throw new HostedHeroAuthoringWriteError();
    }

    validateRevision(
      result.revision
    );

    const nextSite =
      /** @type {Record<string, unknown>} */ (
        nextDocument.site
      );

    const supporting =
      supportingFormsFromSite(
        nextSite
      );

    return Object.freeze({
      siteForm:
        supporting.siteForm,
      appearanceForm:
        supporting.appearanceForm,
      heroBannerForm:
        heroFormFromSite(
          nextSite
        ),
      authoringRevision:
        result.revision
    });
  } catch (error) {
    if (
      error instanceof
        HostedHeroAuthoringRevisionError ||
      error instanceof
        HostedHeroAuthoringWriteError
    ) {
      throw error;
    }

    /*
     * Preserve optimistic-concurrency conflicts unchanged.
     */
    if (
      error instanceof
        AuthoringRevisionConflictError
    ) {
      throw error;
    }

    throw new HostedHeroAuthoringWriteError();
  }
}
