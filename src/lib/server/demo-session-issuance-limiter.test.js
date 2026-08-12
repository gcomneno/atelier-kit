import assert from 'node:assert/strict';
import test from 'node:test';
import {
  DemoSessionIssuanceLimiter,
  DEMO_SESSION_ISSUANCE_OUTCOMES
} from './demo-session-issuance-limiter.js';
import {
  InMemoryDemoMutationBudgetStore
} from './demo-mutation-budget-store.js';

const SECRET =
  Buffer.alloc(32, 92)
    .toString('base64url');

/**
 * @param {{
 *   consume(request: {
 *     key: string,
 *     limit: number,
 *     expiresAt: number
 *   }): Promise<{
 *     allowed: boolean,
 *     used?: number,
 *     remaining?: number
 *   }>
 * }} [store]
 */
function limiter(
  store =
    new InMemoryDemoMutationBudgetStore()
) {
  return new DemoSessionIssuanceLimiter({
    store,
    clock: () => 10_000,
    secret: SECRET,
    windowMs: 60_000,
    subjectLimit: 2,
    globalLimit: 3
  });
}

test('issuance limiter admits only bounded per-subject requests', async () => {
  const gate =
    limiter();

  assert.equal(
    (
      await gate.evaluate(
        'subject-a'
      )
    ).outcome,
    DEMO_SESSION_ISSUANCE_OUTCOMES
      .ALLOWED
  );

  assert.equal(
    (
      await gate.evaluate(
        'subject-a'
      )
    ).outcome,
    DEMO_SESSION_ISSUANCE_OUTCOMES
      .ALLOWED
  );

  assert.equal(
    (
      await gate.evaluate(
        'subject-a'
      )
    ).outcome,
    DEMO_SESSION_ISSUANCE_OUTCOMES
      .SUBJECT_EXHAUSTED
  );
});

test('deployment-wide issuance budget is independent from subject budget', async () => {
  const gate =
    limiter();

  assert.equal(
    (
      await gate.evaluate('a')
    ).outcome,
    'allowed'
  );

  assert.equal(
    (
      await gate.evaluate('b')
    ).outcome,
    'allowed'
  );

  assert.equal(
    (
      await gate.evaluate('c')
    ).outcome,
    'allowed'
  );

  assert.equal(
    (
      await gate.evaluate('d')
    ).outcome,
    DEMO_SESSION_ISSUANCE_OUTCOMES
      .GLOBAL_EXHAUSTED
  );
});

test('raw issuance subjects are never passed to the counter store', async () => {
  /** @type {string[]} */
  const keys = [];

  const gate =
    limiter({
      /**
       * @param {{
       *   key: string,
       *   limit: number,
       *   expiresAt: number
       * }} request
       */
      async consume(request) {
        keys.push(
          request.key
        );

        return {
          allowed: true,
          used: 1,
          remaining: 1
        };
      }
    });

  await gate.evaluate(
    '203.0.113.77'
  );

  assert.equal(
    keys.length,
    2
  );

  for (const key of keys) {
    assert.match(
      key,
      /^[A-Za-z0-9_-]{43}$/
    );

    assert.equal(
      key.includes(
        '203.0.113.77'
      ),
      false
    );
  }

  assert.notEqual(
    keys[0],
    keys[1]
  );
});

test('issuance state failure is distinct from legitimate exhaustion', async () => {
  const gate =
    limiter({
      async consume() {
        throw new Error(
          'state unavailable'
        );
      }
    });

  assert.equal(
    (
      await gate.evaluate(
        'subject-a'
      )
    ).outcome,
    DEMO_SESSION_ISSUANCE_OUTCOMES
      .UNAVAILABLE
  );
});
