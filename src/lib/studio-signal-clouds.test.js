import assert from 'node:assert/strict';
import test from 'node:test';
import {
  applySignalCloudsFromForm,
  getStudioSignalCloudRows
} from './studio-signal-clouds.js';
import { getSignalCloudFaqIssues } from './signal-cloud-faq-validation.js';

test('applySignalCloudsFromForm updates FAQ fields and preserves existing record properties', () => {
  const original = [
    {
      id: 'shipping',
      enabled: true,
      question: 'Old question',
      hint: 'Old hint',
      custom_cloud_field: 'keep cloud',
      faq: {
        visible: false,
        answer: 'Old answer',
        group: 'Old group',
        order: 99,
        custom_faq_field: 'keep faq'
      },
      options: [
        {
          id: 'italy',
          label: 'Old label',
          custom_option_field: 'keep option'
        }
      ]
    }
  ];

  const formData = new FormData();
  formData.set('cloud_0_enabled', 'on');
  formData.set('cloud_0_question', 'Do you ship throughout Italy?');
  formData.set('cloud_0_hint', 'Choose the option that best matches your need.');
  formData.set('cloud_0_option_0_label', 'Delivery within Italy');
  formData.set('cloud_0_faq_visible', 'on');
  formData.set('cloud_0_faq_answer', 'Yes, we ship throughout Italy.');
  formData.set('cloud_0_faq_group', 'Shipping');
  formData.set('cloud_0_faq_order', '10');

  assert.deepEqual(applySignalCloudsFromForm(original, formData), [
    {
      id: 'shipping',
      enabled: true,
      question: 'Do you ship throughout Italy?',
      hint: 'Choose the option that best matches your need.',
      custom_cloud_field: 'keep cloud',
      faq: {
        visible: true,
        answer: 'Yes, we ship throughout Italy.',
        group: 'Shipping',
        order: 10,
        custom_faq_field: 'keep faq'
      },
      options: [
        {
          id: 'italy',
          label: 'Delivery within Italy',
          custom_option_field: 'keep option'
        }
      ]
    }
  ]);
});

test('applySignalCloudsFromForm keeps legacy clouds without FAQ fields unchanged', () => {
  const original = [
    {
      id: 'feeling',
      enabled: true,
      question: 'This creation feels...',
      hint: 'Choose the word that fits best.',
      options: [
        {
          id: 'quiet',
          label: 'quiet'
        }
      ]
    }
  ];

  const formData = new FormData();
  formData.set('cloud_0_enabled', 'on');
  formData.set('cloud_0_question', 'This creation feels...');
  formData.set('cloud_0_hint', 'Choose the word that fits best.');
  formData.set('cloud_0_option_0_label', 'quiet');

  assert.deepEqual(applySignalCloudsFromForm(original, formData), original);
});


test('getStudioSignalCloudRows exposes FAQ fields and safe legacy defaults', () => {
  assert.deepEqual(
    getStudioSignalCloudRows([
      {
        id: 'shipping',
        enabled: true,
        question: 'Do you ship throughout Italy?',
        hint: 'Choose an option.',
        faq: {
          visible: true,
          answer: 'Yes, we do.',
          group: 'Shipping',
          order: 10
        },
        options: [{ id: 'italy', label: 'Italy' }]
      },
      {
        id: 'feeling',
        enabled: false,
        question: 'This creation feels...',
        options: [{ id: 'quiet', label: 'quiet' }]
      }
    ]),
    [
      {
        id: 'shipping',
        enabled: true,
        question: 'Do you ship throughout Italy?',
        hint: 'Choose an option.',
        faq: {
          visible: true,
          answer: 'Yes, we do.',
          group: 'Shipping',
          order: '10'
        },
        options: [{ id: 'italy', label: 'Italy' }]
      },
      {
        id: 'feeling',
        enabled: false,
        question: 'This creation feels...',
        hint: '',
        faq: {
          visible: false,
          answer: '',
          group: '',
          order: ''
        },
        options: [{ id: 'quiet', label: 'quiet' }]
      }
    ]
  );
});


test('FAQ validation requires an answer when the entry is visible', () => {
  assert.deepEqual(
    getSignalCloudFaqIssues([
      {
        id: 'shipping',
        faq: {
          visible: true
        }
      }
    ]),
    [
      {
        key: 'cloudFaqAnswerRequired',
        cloudId: 'shipping'
      }
    ]
  );
});

test('FAQ validation rejects negative order values', () => {
  assert.deepEqual(
    getSignalCloudFaqIssues([
      {
        id: 'shipping',
        faq: {
          visible: false,
          order: -1
        }
      }
    ]),
    [
      {
        key: 'cloudFaqOrderMustBeInteger',
        cloudId: 'shipping'
      }
    ]
  );
});

test('applySignalCloudsFromForm keeps a negative FAQ order invalid', () => {
  const original = [
    {
      id: 'shipping',
      enabled: true,
      question: 'Do you ship?',
      options: [{ id: 'yes', label: 'Yes' }]
    }
  ];

  const formData = new FormData();
  formData.set('cloud_0_enabled', 'on');
  formData.set('cloud_0_question', 'Do you ship?');
  formData.set('cloud_0_option_0_label', 'Yes');
  formData.set('cloud_0_faq_order', '-1');

  const clouds = applySignalCloudsFromForm(original, formData);

  assert.deepEqual(clouds[0], {
    id: 'shipping',
    enabled: true,
    question: 'Do you ship?',
    hint: '',
    options: [{ id: 'yes', label: 'Yes' }],
    faq: {
      visible: false,
      order: '-1'
    }
  });
  assert.deepEqual(getSignalCloudFaqIssues(clouds), [
    {
      key: 'cloudFaqOrderMustBeInteger',
      cloudId: 'shipping'
    }
  ]);
});

test('FAQ validation accepts zero as the first valid order', () => {
  assert.deepEqual(
    getSignalCloudFaqIssues([
      {
        id: 'shipping',
        faq: {
          visible: true,
          answer: 'Yes.',
          order: 0
        }
      }
    ]),
    []
  );
});
