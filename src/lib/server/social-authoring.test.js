import assert from 'node:assert/strict';
import test from 'node:test';
/** @type {typeof import('./social-authoring.js').SOCIAL_AUTHORING_PATH} */
let SOCIAL_AUTHORING_PATH;
/** @type {typeof import('./social-authoring.js').SocialAuthoringDocumentError} */
let SocialAuthoringDocumentError;
/** @type {typeof import('./social-authoring.js').buildSocialAuthoringDocumentFromFormData} */
let buildSocialAuthoringDocumentFromFormData;
/** @type {typeof import('./social-authoring.js').normalizeSocialAuthoringDocument} */
let normalizeSocialAuthoringDocument;
/** @type {typeof import('./social-authoring.js').parseSocialAuthoringDocument} */
let parseSocialAuthoringDocument;
/** @type {typeof import('./social-authoring.js').serializeSocialAuthoringDocument} */
let serializeSocialAuthoringDocument;
/** @type {typeof import('./social-authoring.js').socialFormValuesFromFormData} */
let socialFormValuesFromFormData;

let missingPortableYaml = false;

try {
  ({
    SOCIAL_AUTHORING_PATH,
    SocialAuthoringDocumentError,
    buildSocialAuthoringDocumentFromFormData,
    normalizeSocialAuthoringDocument,
    parseSocialAuthoringDocument,
    serializeSocialAuthoringDocument,
    socialFormValuesFromFormData
  } = await import('./social-authoring.js'));
} catch (error) {
  const moduleError =
    /** @type {{ code?: string, message?: string }} */ (
      error
    );

  const missingYaml =
    moduleError.code === 'ERR_MODULE_NOT_FOUND' &&
    String(moduleError.message ?? '').includes(
      "package 'yaml'"
    );

  if (!missingYaml) throw error;

  missingPortableYaml = true;
}

const portableTest =
  missingPortableYaml
    ? test.skip
    : test;

/** @param {Record<string, unknown>} [values] */
function formData(values = {}) {
  return {
    /** @param {string} name */
    get(name) {
      return Object.prototype.hasOwnProperty.call(
        values,
        name
      )
        ? values[name]
        : null;
    }
  };
}

portableTest('Social authoring path is fixed server-side', () => {
  assert.equal(
    SOCIAL_AUTHORING_PATH,
    'config/social.yaml'
  );
});

portableTest('finite Social fields are trimmed and unsupported values become empty', () => {
  const values =
    socialFormValuesFromFormData(
      formData({
        url_instagram:
          ' https://instagram.com/example ',
        url_facebook: 123,
        url_x: '',
        url_github:
          'https://github.com/example',
        arbitrary_path: '../../outside'
      })
    );

  assert.deepEqual(values, {
    instagram:
      'https://instagram.com/example',
    facebook: '',
    x: '',
    github: 'https://github.com/example'
  });
  assert.equal(
    Object.hasOwn(values, 'arbitrary_path'),
    false
  );
});

portableTest('valid form input builds the canonical Social document', () => {
  const result =
    buildSocialAuthoringDocumentFromFormData(
      formData({
        url_instagram:
          'https://instagram.com/example',
        url_github:
          'https://github.com/example'
      })
    );

  assert.equal(result.invalidId, '');
  assert.deepEqual(result.document, {
    social: {
      links: [
        {
          id: 'instagram',
          url:
            'https://instagram.com/example'
        },
        {
          id: 'github',
          url:
            'https://github.com/example'
        }
      ]
    }
  });
});

portableTest('invalid network URL is rejected before a document exists', () => {
  const result =
    buildSocialAuthoringDocumentFromFormData(
      formData({
        url_github:
          'https://example.com/not-github'
      })
    );

  assert.equal(result.invalidId, 'github');
  assert.equal(result.document, null);
});

portableTest('repository Social YAML parses to canonical form data', () => {
  const result =
    parseSocialAuthoringDocument(`
social:
  links:
    - id: instagram
      url: https://instagram.com/example
    - id: twitter
      url: https://x.com/example
`);

  assert.deepEqual(result.document, {
    social: {
      links: [
        {
          id: 'instagram',
          url:
            'https://instagram.com/example'
        },
        {
          id: 'x',
          url: 'https://x.com/example'
        }
      ]
    }
  });

  assert.equal(
    result.form.instagram,
    'https://instagram.com/example'
  );
  assert.equal(
    result.form.x,
    'https://x.com/example'
  );
  assert.equal(result.form.facebook, '');
  assert.equal(result.form.github, '');
});

portableTest('malformed ambiguous or invalid Social documents fail closed', () => {
  for (const candidate of [
    {},
    { social: {} },
    {
      social: {
        links: ['bad']
      }
    },
    {
      social: {
        links: [
          {
            id: 'github',
            url:
              'https://example.com/not-github'
          }
        ]
      }
    },
    {
      social: {
        links: [
          {
            id: 'x',
            url: 'https://x.com/one'
          },
          {
            id: 'twitter',
            url: 'https://x.com/two'
          }
        ]
      }
    }
  ]) {
    assert.throws(
      () =>
        normalizeSocialAuthoringDocument(
          candidate
        ),
      SocialAuthoringDocumentError
    );
  }

  assert.throws(
    () =>
      parseSocialAuthoringDocument(
        'social: [broken'
      ),
    SocialAuthoringDocumentError
  );
});

portableTest('serialization is canonical and round-trips through the same validator', () => {
  const serialized =
    serializeSocialAuthoringDocument({
      social: {
        links: [
          {
            id: 'github',
            url:
              'https://github.com/example'
          }
        ]
      }
    });

  assert.equal(
    serialized,
    [
      'social:',
      '  links:',
      '    - id: github',
      '      url: https://github.com/example',
      ''
    ].join('\n')
  );

  assert.deepEqual(
    parseSocialAuthoringDocument(
      serialized
    ).document,
    {
      social: {
        links: [
          {
            id: 'github',
            url:
              'https://github.com/example'
          }
        ]
      }
    }
  );
});
