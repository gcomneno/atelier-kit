import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildFaqPageSchema,
  projectFaqEntries
} from './signal-cloud-faq.js';

test('projectFaqEntries returns only eligible FAQ entries ordered by order then source position', () => {
  const clouds = [
    {
      id: 'feeling',
      enabled: true,
      question: '  How does this creation feel?  ',
      faq: {
        visible: true,
        answer: '  It depends on the selected materials.  ',
        group: '  Creation  ',
        order: 20
      }
    },
    {
      id: 'shipping',
      enabled: true,
      question: 'Do you ship throughout Italy?',
      faq: {
        visible: true,
        answer: 'Yes, we ship throughout Italy.',
        group: 'Shipping',
        order: 10
      }
    },
    {
      id: 'disabled-cloud',
      enabled: false,
      question: 'Should not appear?',
      faq: {
        visible: true,
        answer: 'No.'
      }
    },
    {
      id: 'hidden-faq',
      enabled: true,
      question: 'Also hidden?',
      faq: {
        visible: false,
        answer: 'Yes.'
      }
    },
    {
      id: 'missing-answer',
      enabled: true,
      question: 'Missing answer?',
      faq: {
        visible: true,
        answer: '   '
      }
    },
    {
      id: 'unordered',
      enabled: true,
      question: 'What about collection pieces?',
      faq: {
        visible: true,
        answer: 'Contact the atelier for details.'
      }
    }
  ];

  assert.deepEqual(projectFaqEntries(clouds), [
    {
      id: 'shipping',
      question: 'Do you ship throughout Italy?',
      answer: 'Yes, we ship throughout Italy.',
      group: 'Shipping',
      order: 10
    },
    {
      id: 'feeling',
      question: 'How does this creation feel?',
      answer: 'It depends on the selected materials.',
      group: 'Creation',
      order: 20
    },
    {
      id: 'unordered',
      question: 'What about collection pieces?',
      answer: 'Contact the atelier for details.'
    }
  ]);
});


test('buildFaqPageSchema maps FAQ entries to schema.org Question and Answer entities', () => {
  const entries = [
    {
      id: 'shipping',
      question: 'Do you ship throughout Italy?',
      answer: 'Yes, we ship throughout Italy.',
      group: 'Shipping',
      order: 10
    },
    {
      id: 'timing',
      question: 'How long does preparation take?',
      answer: 'Preparation times depend on the selected creation.'
    }
  ];

  assert.deepEqual(buildFaqPageSchema(entries, 'https://example.test/faq'), {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    url: 'https://example.test/faq',
    mainEntity: [
      {
        '@type': 'Question',
        name: 'Do you ship throughout Italy?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Yes, we ship throughout Italy.'
        }
      },
      {
        '@type': 'Question',
        name: 'How long does preparation take?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Preparation times depend on the selected creation.'
        }
      }
    ]
  });
});
