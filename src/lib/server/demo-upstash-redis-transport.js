import { Redis } from '@upstash/redis';

export class DemoUpstashRedisTransportError extends Error {
  constructor() {
    super('Demo Redis transport failed.');
    this.name = 'DemoUpstashRedisTransportError';
    this.code = 'DEMO_UPSTASH_REDIS_TRANSPORT_FAILED';
  }
}

/** @param {unknown} value */
function nonEmptyString(value) {
  return (
    typeof value === 'string' &&
    value.length > 0
  );
}

/** @param {unknown} value */
function validKey(value) {
  return (
    typeof value === 'string' &&
    value.length > 0 &&
    value.length <= 1024
  );
}

/** @param {unknown} value */
function validStringList(value) {
  return (
    Array.isArray(value) &&
    value.every(nonEmptyString)
  );
}

/** @param {unknown} client */
function assertClient(client) {
  if (
    client === null ||
    typeof client !== 'object'
  ) {
    throw new DemoUpstashRedisTransportError();
  }

  for (const method of [
    'set',
    'get',
    'del',
    'eval'
  ]) {
    if (
      typeof /** @type {Record<string, unknown>} */ (
        client
      )[method] !== 'function'
    ) {
      throw new DemoUpstashRedisTransportError();
    }
  }
}

/**
 * Server-only Redis transport dedicated to public Demo state.
 *
 * It exposes no scan/enumeration/arbitrary-command API and keeps official
 * client diagnostics behind a redacted boundary.
 */
export class DemoUpstashRedisTransport {
  #client;

  /**
   * `clientFactory` is constructor-only test injection.
   *
   * @param {{
   *   url: string,
   *   token: string,
   *   clientFactory?: (options: object) => object
   * }} options
   */
  constructor(options) {
    if (
      options === null ||
      typeof options !== 'object' ||
      Array.isArray(options) ||
      Object.getPrototypeOf(options) !==
        Object.prototype ||
      Object.keys(options).some(
        (key) =>
          ![
            'url',
            'token',
            'clientFactory'
          ].includes(key)
      ) ||
      !nonEmptyString(options.url) ||
      !nonEmptyString(options.token) ||
      (
        options.clientFactory !== undefined &&
        typeof options.clientFactory !==
          'function'
      )
    ) {
      throw new DemoUpstashRedisTransportError();
    }

    const clientOptions = {
      url: options.url,
      token: options.token,
      automaticDeserialization: false,
      enableTelemetry: false
    };

    let client;

    try {
      client =
        options.clientFactory === undefined
          ? new Redis(clientOptions)
          : options.clientFactory(
              Object.freeze({
                ...clientOptions
              })
            );

      assertClient(client);
    } catch {
      throw new DemoUpstashRedisTransportError();
    }

    this.#client = client;
    Object.freeze(this);
  }

  /**
   * @param {string} key
   * @param {string} value
   * @param {number} ttlMs
   */
  async setIfAbsent(
    key,
    value,
    ttlMs
  ) {
    if (
      !validKey(key) ||
      !nonEmptyString(value) ||
      !Number.isSafeInteger(ttlMs) ||
      ttlMs <= 0
    ) {
      throw new DemoUpstashRedisTransportError();
    }

    const result =
      await this.#call(
        'set',
        key,
        value,
        {
          nx: true,
          px: ttlMs
        }
      );

    if (result === 'OK') {
      return true;
    }

    if (result === null) {
      return false;
    }

    throw new DemoUpstashRedisTransportError();
  }

  /** @param {string} key */
  async get(key) {
    if (!validKey(key)) {
      throw new DemoUpstashRedisTransportError();
    }

    const result =
      await this.#call(
        'get',
        key
      );

    if (
      typeof result === 'string' ||
      result === null
    ) {
      return result;
    }

    throw new DemoUpstashRedisTransportError();
  }

  /** @param {string} key */
  async del(key) {
    if (!validKey(key)) {
      throw new DemoUpstashRedisTransportError();
    }

    const result =
      await this.#call(
        'del',
        key
      );

    if (result === 0) return false;
    if (result === 1) return true;

    throw new DemoUpstashRedisTransportError();
  }

  /**
   * EVAL is constrained to explicit keys/arguments supplied by store-owned
   * scripts. Integer results form the small store protocol.
   *
   * @param {string} script
   * @param {string[]} keys
   * @param {string[]} args
   */
  async eval(script, keys, args) {
    if (
      !nonEmptyString(script) ||
      !validStringList(keys) ||
      !validStringList(args)
    ) {
      throw new DemoUpstashRedisTransportError();
    }

    const result =
      await this.#call(
        'eval',
        script,
        [...keys],
        [...args]
      );

    if (
      Number.isSafeInteger(result) &&
      result >= 0 &&
      result <= 1_000_000
    ) {
      return result;
    }

    throw new DemoUpstashRedisTransportError();
  }

  /**
   * @param {'set' | 'get' | 'del' | 'eval'} method
   * @param {...unknown} args
   */
  async #call(method, ...args) {
    try {
      return await /** @type {any} */ (
        this.#client
      )[method](...args);
    } catch {
      throw new DemoUpstashRedisTransportError();
    }
  }
}
