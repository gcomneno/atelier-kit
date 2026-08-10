import assert from 'node:assert/strict';
import test from 'node:test';
import {
  HostedUpstashRedisTransport,
  HostedUpstashRedisTransportError
} from './hosted-upstash-redis-transport.js';

const URL = 'https://redis-transport-test.example.com';
const TOKEN = 'REDIS_TRANSPORT_TOKEN_SENTINEL_DO_NOT_LOG';

class FakeClient {
  /** @type {any[]} */
  calls = [];
  /** @type {unknown} */
  setResult = 'OK';
  /** @type {unknown} */
  getResult = null;
  /** @type {unknown} */
  getDelResult = null;
  /** @type {unknown} */
  delResult = 0;
  /** @type {unknown} */
  evalResult = 0;
  /** @type {unknown} */
  error = null;

  /** @param {string} name @param {unknown[]} args @param {unknown} result */
  #call(name, args, result) {
    this.calls.push([name, ...args]);
    if (this.error) throw this.error;
    return result;
  }

  /** @param {...unknown} args */
  async set(...args) { return this.#call('set', args, this.setResult); }
  /** @param {...unknown} args */
  async get(...args) { return this.#call('get', args, this.getResult); }
  /** @param {...unknown} args */
  async getdel(...args) { return this.#call('getdel', args, this.getDelResult); }
  /** @param {...unknown} args */
  async del(...args) { return this.#call('del', args, this.delResult); }
  /** @param {...unknown} args */
  async eval(...args) { return this.#call('eval', args, this.evalResult); }
}

function harness() {
  const client = new FakeClient();
  /** @type {object | undefined} */
  let options;
  const transport = new HostedUpstashRedisTransport({
    url: URL,
    token: TOKEN,
    clientFactory(input) {
      options = input;
      return client;
    }
  });
  return { client, options, transport };
}

test('Upstash transport uses a no-network injected client and disables deserialization and telemetry', () => {
  const { client, options, transport } = harness();
  assert.deepEqual(options, {
    url: URL,
    token: TOKEN,
    automaticDeserialization: false,
    enableTelemetry: false
  });
  assert.equal(Object.isFrozen(transport), true);
  assert.deepEqual(client.calls, []);
  assert.equal(JSON.stringify(transport).includes(TOKEN), false);
});

test('Upstash transport maps SET NX PX and normalizes collisions', async () => {
  const { client, transport } = harness();
  assert.equal(await transport.setIfAbsent('key', 'value', 123), true);
  assert.deepEqual(client.calls.at(-1), [
    'set', 'key', 'value', { nx: true, px: 123 }
  ]);
  client.setResult = null;
  assert.equal(await transport.setIfAbsent('key', 'value', 123), false);
});

test('Upstash transport preserves raw GET and GETDEL string/null results', async () => {
  const { client, transport } = harness();
  client.getResult = '{"v":1}';
  client.getDelResult = 'opaque-payload';
  assert.equal(await transport.get('key'), '{"v":1}');
  assert.equal(await transport.getDel('key'), 'opaque-payload');
  client.getResult = null;
  client.getDelResult = null;
  assert.equal(await transport.get('key'), null);
  assert.equal(await transport.getDel('key'), null);
});

test('Upstash transport normalizes DEL 0/1 and keeps EVAL ordering and finite protocol results', async () => {
  const { client, transport } = harness();
  client.delResult = 0;
  assert.equal(await transport.del('key'), false);
  client.delResult = 1;
  assert.equal(await transport.del('key'), true);
  client.evalResult = 3;
  assert.equal(await transport.eval('return 3', ['old', 'next'], ['expected', 'next', 'ttl']), 3);
  assert.deepEqual(client.calls.at(-1), [
    'eval', 'return 3', ['old', 'next'], ['expected', 'next', 'ttl']
  ]);
});

test('Upstash transport fails closed for unexpected responses and redacts client diagnostics', async () => {
  const { client, transport } = harness();
  client.setResult = 'QUEUED';
  await assert.rejects(() => transport.setIfAbsent('key', 'value', 1), HostedUpstashRedisTransportError);
  client.getResult = {};
  await assert.rejects(() => transport.get('key'), HostedUpstashRedisTransportError);
  client.getDelResult = 1;
  await assert.rejects(() => transport.getDel('key'), HostedUpstashRedisTransportError);
  client.delResult = 2;
  await assert.rejects(() => transport.del('key'), HostedUpstashRedisTransportError);
  client.evalResult = 4;
  await assert.rejects(() => transport.eval('return 4', ['key'], ['arg']), HostedUpstashRedisTransportError);

  client.error = new Error(`network failure for ${URL} with ${TOKEN}`);
  await assert.rejects(
    () => transport.get('key'),
    (error) => {
      assert.ok(error instanceof HostedUpstashRedisTransportError);
      assert.equal(error.message.includes(URL), false);
      assert.equal(error.message.includes(TOKEN), false);
      return true;
    }
  );
});
