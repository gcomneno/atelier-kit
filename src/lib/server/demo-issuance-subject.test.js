import assert from 'node:assert/strict';
import test from 'node:test';
import {
  DemoIssuanceSubjectError,
  resolveDemoIssuanceSubject
} from './demo-issuance-subject.js';

function headers(
  values = {}
) {
  const normalized =
    new Map(
      Object.entries(values)
        .map(([key, value]) => [
          key.toLowerCase(),
          value
        ])
    );

  return {
    /** @param {string} name */
    get(name) {
      return normalized.get(
        name.toLowerCase()
      ) ?? null;
    }
  };
}

test('Vercel-owned forwarded IP becomes the only issuance subject source', () => {
  assert.equal(
    resolveDemoIssuanceSubject({
      environment: {
        VERCEL: '1'
      },
      headers: headers({
        'x-vercel-forwarded-for':
          '203.0.113.7'
      })
    }),
    'vercel-ip:203.0.113.7'
  );

  assert.equal(
    resolveDemoIssuanceSubject({
      environment: {
        VERCEL: '1'
      },
      headers: headers({
        'x-vercel-forwarded-for':
          '2001:db8::7'
      })
    }),
    'vercel-ip:2001:db8::7'
  );
});

test('ordinary forwarding and real-IP headers are never fallback authority', () => {
  for (const values of [
    {
      'x-forwarded-for':
        '203.0.113.8'
    },
    {
      'x-real-ip':
        '203.0.113.8'
    },
    {
      'cf-connecting-ip':
        '203.0.113.8'
    }
  ]) {
    assert.throws(
      () =>
        resolveDemoIssuanceSubject({
          environment: {
            VERCEL: '1'
          },
          headers:
            headers(values)
        }),
      DemoIssuanceSubjectError
    );
  }
});

test('issuance subject is unavailable outside Vercel', () => {
  assert.throws(
    () =>
      resolveDemoIssuanceSubject({
        environment: {},
        headers:
          headers({
            'x-vercel-forwarded-for':
              '203.0.113.9'
          })
      }),
    DemoIssuanceSubjectError
  );
});

test('forwarding chains malformed values and whitespace fail closed', () => {
  for (const value of [
    '',
    ' 203.0.113.10',
    '203.0.113.10 ',
    '203.0.113.10, 198.51.100.1',
    'not-an-ip',
    '999.1.1.1'
  ]) {
    assert.throws(
      () =>
        resolveDemoIssuanceSubject({
          environment: {
            VERCEL: '1'
          },
          headers:
            headers({
              'x-vercel-forwarded-for':
                value
            })
        }),
      DemoIssuanceSubjectError
    );
  }
});
