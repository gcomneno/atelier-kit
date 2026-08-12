import {
  isIP
} from 'node:net';

export class DemoIssuanceSubjectError extends Error {
  constructor() {
    super('Demo issuance subject is unavailable.');
    this.name =
      'DemoIssuanceSubjectError';
    this.code =
      'DEMO_ISSUANCE_SUBJECT_UNAVAILABLE';
  }
}

/**
 * Resolve the anti-abuse subject only from Vercel's deployment-owned client-IP
 * header.
 *
 * There is deliberately no fallback to x-forwarded-for, x-real-ip, arbitrary
 * forwarding chains, cookies or browser-provided identifiers.
 *
 * The boundary is inactive outside a real Vercel runtime. Local tests inject
 * the exact environment/header contract explicitly.
 *
 * @param {{
 *   environment: unknown,
 *   headers: unknown
 * }} input
 */
export function resolveDemoIssuanceSubject({
  environment,
  headers
}) {
  if (
    environment === null ||
    typeof environment !== 'object' ||
    Array.isArray(environment) ||
    /** @type {Record<string, unknown>} */ (
      environment
    ).VERCEL !== '1' ||
    headers === null ||
    typeof headers !== 'object' ||
    typeof /** @type {Record<string, unknown>} */ (
      headers
    ).get !== 'function'
  ) {
    throw new DemoIssuanceSubjectError();
  }

  const value =
    /** @type {{
     *   get(name: string): unknown
     * }} */ (headers).get(
      'x-vercel-forwarded-for'
    );

  if (
    typeof value !== 'string' ||
    value.length === 0 ||
    value.length > 64 ||
    value.trim() !== value ||
    value.includes(',') ||
    isIP(value) === 0
  ) {
    throw new DemoIssuanceSubjectError();
  }

  /*
   * Domain-prefix the subject before the limiter HMACs it. This makes future
   * subject classes non-interchangeable even if they happen to share bytes.
   */
  return `vercel-ip:${value}`;
}
