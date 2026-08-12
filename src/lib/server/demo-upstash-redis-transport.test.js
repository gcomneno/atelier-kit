import assert from 'node:assert/strict';
import test from 'node:test';
import {
  DemoUpstashRedisTransport,
  DemoUpstashRedisTransportError
} from './demo-upstash-redis-transport.js';

const URL =
  'https://demo-redis.example.test';

const TOKEN =
  'DEMO_REDIS_TOKEN_SENTINEL_DO_NOT_LOG';

class FakeClient {
  /** @type {any[]} */
  calls = [];

  /** @type {unknown} */
  setResult = 'OK';

  /** @type {unknown} */
  getResult = null;

  /** @type {unknown} */
  delResult = 0;

  /** @type {unknown} */
  evalResult = 0;

  /** @type {unknown} */
  error = null;

  /**
   * @param {string} name
   * @param {unknown[]} args
   * @param {unknown} result
   */
  #call(name, args, result) {
    this.calls.push([
      name,
      ...args
    ]);

    if (this.error) {
      throw this.error;
    }

    return result;
  }

  /** @param {...unknown} args */
  async set(...args) {
    return this.#call(
      'set',
      args,
      this.setResult
    );
  }

  /** @param {...unknown} args */
  async get(...args) {
    return this.#call(
      'get',
      args,
      this.getResult
    );
  }

  /** @param {...unknown} args */
  async del(...args) {
    return this.#call(
      'del',
      args,
      this.delResult
    );
  }

  /** @param {...unknown} args */
  async eval(...args) {
    return this.#call(
      'eval',
      args,
      this.evalResult
    );
  }
}

function harness() {
  const client =
    new FakeClient();

  /** @type {object | undefined} */
  let options;

  const transport =
    new DemoUpstashRedisTransport({
      url: URL,
      token: TOKEN,
      clientFactory(input) {
        options = input;
        return client;
      }
    });

  return {
    client,
    options,
    transport
  };
}

test('Demo transport keeps the official client behind a no-telemetry raw-string boundary', () => {
  const {
    client,
    options,
    transport
  } = harness();

  assert.deepEqual(
    options,
    {
      url: URL,
      token: TOKEN,
      automaticDeserialization: false,
      enableTelemetry: false
    }
  );

  assert.equal(
    Object.isFrozen(transport),
    true
  );

  assert.deepEqual(
    client.calls,
    []
  );

  assert.equal(
    JSON.stringify(transport)
      .includes(TOKEN),
    false
  );
});

test('Demo transport maps SET NX PX and raw GET/DEL semantics', async () => {
  const {
    client,
    transport
  } = harness();

  assert.equal(
    await transport.setIfAbsent(
      'key',
      'value',
      123
    ),
    true
  );

  assert.deepEqual(
    client.calls.at(-1),
    [
      'set',
      'key',
      'value',
      {
        nx: true,
        px: 123
      }
    ]
  );

  client.setResult = null;

  assert.equal(
    await transport.setIfAbsent(
      'key',
      'value',
      123
    ),
    false
  );

  client.getResult = 'opaque';

  assert.equal(
    await transport.get('key'),
    'opaque'
  );

  client.delResult = 1;

  assert.equal(
    await transport.del('key'),
    true
  );
});

test('Demo transport allows bounded integer EVAL protocols', async () => {
  const {
    client,
    transport
  } = harness();

  client.evalResult = 6;

  assert.equal(
    await transport.eval(
      'return 6',
      ['key'],
      ['5', '1000']
    ),
    6
  );

  client.evalResult = 999_999;

  assert.equal(
    await transport.eval(
      'return 999999',
      ['key'],
      ['arg']
    ),
    999_999
  );
});

test('Demo transport fails closed and redacts service credentials', async () => {
  const {
    client,
    transport
  } = harness();

  client.evalResult = 1_000_001;

  await assert.rejects(
    () =>
      transport.eval(
        'bad',
        ['key'],
        ['arg']
      ),
    DemoUpstashRedisTransportError
  );

  client.error =
    new Error(
      `failure ${URL} ${TOKEN}`
    );

  await assert.rejects(
    () => transport.get('key'),
    (error) => {
      assert.ok(
        error instanceof
          DemoUpstashRedisTransportError
      );

      assert.equal(
        error.message.includes(URL),
        false
      );

      assert.equal(
        error.message.includes(TOKEN),
        false
      );

      return true;
    }
  );
});
