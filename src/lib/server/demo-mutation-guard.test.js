import assert from 'node:assert/strict';
import test from 'node:test';
import {
  DEFAULT_DEMO_MUTATION_LIMIT,
  DEMO_MUTATION_GUARD_OUTCOMES,
  DemoMutationGuard
} from './demo-mutation-guard.js';
import {
  DemoRouteGate
} from './demo-route-gate.js';
import {
  DemoSessionLifecycle
} from './demo-session.js';
import {
  InMemoryDemoSessionStore
} from './demo-session-store.js';
import {
  InMemoryDemoMutationBudgetStore
} from './demo-mutation-budget-store.js';

/**
 * @param {number} byte
 */
function fixed(byte) {
  return Buffer.alloc(32, byte).toString('base64url');
}

/**
 * @param {{
 *   mutationLimit?: number,
 *   budgetStore?: {
 *     consume(request: {
 *       key: string,
 *       limit: number,
 *       expiresAt: number
 *     }): Promise<{
 *       allowed: boolean,
 *       remaining: number
 *     }>
 *   }
 * }} [options]
 */
async function fixture({
  mutationLimit = DEFAULT_DEMO_MUTATION_LIMIT,
  budgetStore = new InMemoryDemoMutationBudgetStore()
} = {}) {
  let now = 1000;
  let id = 1;

  const lifecycle = new DemoSessionLifecycle({
    store: new InMemoryDemoSessionStore(),
    clock: () => now,
    sessionIdGenerator: () => fixed(id++),
    csrfTokenGenerator: () => fixed(101)
  });

  const created = await lifecycle.create();

  const gate = new DemoRouteGate({
    sessionLifecycle: lifecycle
  });

  const admitted = await gate.evaluate(
    'demo',
    created.sessionId
  );

  assert.ok(admitted.context);

  return {
    created,
    context: admitted.context,
    lifecycle,
    /** @param {number} value */
    setNow(value) {
      now = value;
    },
    guard: new DemoMutationGuard({
      environment: {
        ATELIER_DEMO_CANONICAL_ORIGIN:
          'https://demo.example.com'
      },
      budgetStore,
      mutationLimit
    })
  };
}

/**
 * @param {object} context
 * @param {string} csrfToken
 */
function validRequest(context, csrfToken) {
  return {
    runtimeMode: 'demo',
    trustedContext: context,
    host: 'demo.example.com',
    origin: 'https://demo.example.com',
    method: 'POST',
    csrfToken
  };
}

test('non-Demo runtimes are inert before budget access', async () => {
  let consumed = false;

  const guard = new DemoMutationGuard({
    environment: {
      ATELIER_DEMO_CANONICAL_ORIGIN:
        'https://demo.example.com'
    },
    budgetStore: {
      async consume() {
        consumed = true;
        throw new Error('must not consume');
      }
    }
  });

  const result = await guard.evaluate({
    runtimeMode: 'hosted'
  });

  assert.equal(
    result.outcome,
    DEMO_MUTATION_GUARD_OUTCOMES.NOT_FOUND
  );
  assert.equal(consumed, false);
});

test('Demo mutation requires trusted context exact Host Origin method and CSRF', async () => {
  const {
    created,
    context,
    guard
  } = await fixture();

  const variants = [
    {
      ...validRequest(context, created.csrfToken),
      trustedContext: {}
    },
    {
      ...validRequest(context, created.csrfToken),
      host: 'attacker.example.com'
    },
    {
      ...validRequest(context, created.csrfToken),
      origin: 'https://attacker.example.com'
    },
    {
      ...validRequest(context, created.csrfToken),
      method: 'GET'
    },
    {
      ...validRequest(context, created.csrfToken),
      csrfToken: fixed(102)
    }
  ];

  const expected = [
    DEMO_MUTATION_GUARD_OUTCOMES.FORBIDDEN,
    DEMO_MUTATION_GUARD_OUTCOMES.FORBIDDEN,
    DEMO_MUTATION_GUARD_OUTCOMES.FORBIDDEN,
    DEMO_MUTATION_GUARD_OUTCOMES.METHOD_NOT_ALLOWED,
    DEMO_MUTATION_GUARD_OUTCOMES.FORBIDDEN
  ];

  for (let index = 0; index < variants.length; index += 1) {
    const result = await guard.evaluate(variants[index]);
    assert.equal(result.outcome, expected[index]);
  }
});

test('integrity failures never consume mutation budget', async () => {
  let consumeCalls = 0;

  const budgetStore = {
    async consume() {
      consumeCalls += 1;
      return {
        allowed: true,
        remaining: 4
      };
    }
  };

  const {
    created,
    context,
    guard
  } = await fixture({ budgetStore });

  await guard.evaluate({
    ...validRequest(context, created.csrfToken),
    origin: 'https://attacker.example.com'
  });

  await guard.evaluate({
    ...validRequest(context, created.csrfToken),
    csrfToken: fixed(102)
  });

  assert.equal(consumeCalls, 0);

  const allowed = await guard.evaluate(
    validRequest(context, created.csrfToken)
  );

  assert.equal(
    allowed.outcome,
    DEMO_MUTATION_GUARD_OUTCOMES.ALLOWED
  );
  assert.equal(consumeCalls, 1);
});

test('Demo mutation budget is bounded per guest authority', async () => {
  const {
    created,
    context,
    guard
  } = await fixture({
    mutationLimit: 2
  });

  assert.deepEqual(
    await guard.evaluate(
      validRequest(context, created.csrfToken)
    ),
    {
      outcome: DEMO_MUTATION_GUARD_OUTCOMES.ALLOWED,
      remaining: 1
    }
  );

  assert.deepEqual(
    await guard.evaluate(
      validRequest(context, created.csrfToken)
    ),
    {
      outcome: DEMO_MUTATION_GUARD_OUTCOMES.ALLOWED,
      remaining: 0
    }
  );

  assert.deepEqual(
    await guard.evaluate(
      validRequest(context, created.csrfToken)
    ),
    {
      outcome:
        DEMO_MUTATION_GUARD_OUTCOMES.BUDGET_EXHAUSTED,
      remaining: 0
    }
  );
});

test('session-ID rotation cannot reset Demo mutation budget', async () => {
  const {
    created,
    context,
    lifecycle,
    setNow,
    guard
  } = await fixture({
    mutationLimit: 2
  });

  const first = await guard.evaluate(
    validRequest(context, created.csrfToken)
  );

  assert.equal(first.remaining, 1);

  setNow(created.createdAt + 5 * 60 * 1000);

  const rotated =
    await lifecycle.rotate(created.sessionId);

  assert.ok(rotated);

  const gate = new DemoRouteGate({
    sessionLifecycle: lifecycle
  });

  const admitted = await gate.evaluate(
    'demo',
    rotated.sessionId
  );

  assert.ok(admitted.context);

  const second = await guard.evaluate(
    validRequest(
      admitted.context,
      created.csrfToken
    )
  );

  assert.deepEqual(second, {
    outcome: DEMO_MUTATION_GUARD_OUTCOMES.ALLOWED,
    remaining: 0
  });

  const exhausted = await guard.evaluate(
    validRequest(
      admitted.context,
      created.csrfToken
    )
  );

  assert.equal(
    exhausted.outcome,
    DEMO_MUTATION_GUARD_OUTCOMES.BUDGET_EXHAUSTED
  );
});

test('budget-store failure fails closed without pretending exhaustion', async () => {
  const budgetStore = {
    async consume() {
      throw new Error('persistent store unavailable');
    }
  };

  const {
    created,
    context,
    guard
  } = await fixture({ budgetStore });

  const result = await guard.evaluate(
    validRequest(context, created.csrfToken)
  );

  assert.equal(
    result.outcome,
    DEMO_MUTATION_GUARD_OUTCOMES.BUDGET_UNAVAILABLE
  );
});


test('distinct Demo guest authorities have independent mutation budgets', async () => {
  const budgetStore =
    new InMemoryDemoMutationBudgetStore();

  const first = await fixture({
    mutationLimit: 1,
    budgetStore
  });

  const secondLifecycle =
    new DemoSessionLifecycle({
      store: new InMemoryDemoSessionStore(),
      clock: () => 1000,
      sessionIdGenerator: () => fixed(41),
      csrfTokenGenerator: () => fixed(141)
    });

  const secondCreated =
    await secondLifecycle.create();

  const secondGate = new DemoRouteGate({
    sessionLifecycle: secondLifecycle
  });

  const secondAdmitted =
    await secondGate.evaluate(
      'demo',
      secondCreated.sessionId
    );

  assert.ok(secondAdmitted.context);

  const secondGuard = new DemoMutationGuard({
    environment: {
      ATELIER_DEMO_CANONICAL_ORIGIN:
        'https://demo.example.com'
    },
    budgetStore,
    mutationLimit: 1
  });

  assert.deepEqual(
    await first.guard.evaluate(
      validRequest(
        first.context,
        first.created.csrfToken
      )
    ),
    {
      outcome:
        DEMO_MUTATION_GUARD_OUTCOMES.ALLOWED,
      remaining: 0
    }
  );

  assert.equal(
    (
      await first.guard.evaluate(
        validRequest(
          first.context,
          first.created.csrfToken
        )
      )
    ).outcome,
    DEMO_MUTATION_GUARD_OUTCOMES.BUDGET_EXHAUSTED
  );

  assert.deepEqual(
    await secondGuard.evaluate(
      validRequest(
        secondAdmitted.context,
        secondCreated.csrfToken
      )
    ),
    {
      outcome:
        DEMO_MUTATION_GUARD_OUTCOMES.ALLOWED,
      remaining: 0
    }
  );
});
