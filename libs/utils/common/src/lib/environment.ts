/**
 * Whether the process is running under the jest test runner.
 *
 * `NODE_ENV` alone is intentionally NOT trusted: it is a plain string anyone
 * can set, so relying on it for security-sensitive gating (e.g. dynamic
 * `require` in the in-process worker) would be an arbitrary-code-execution
 * vector in a production build. We additionally require at least one signal
 * that only the jest runtime sets and that cannot be spoofed by an
 * environment variable:
 *   - `JEST_WORKER_ID`: set by jest in every worker and in `--runInBand`.
 *   - the injected `jest` global: present when `injectGlobals` is enabled
 *     (the default), and never defined in a normal production runtime.
 */
export function IsTestEnvironment(): boolean {
  const nodeEnvIsTest = (process.env.NODE_ENV || '').toLowerCase() === 'test';
  if (!nodeEnvIsTest) {
    return false;
  }

  const hasJestWorkerId = process.env.JEST_WORKER_ID !== undefined;
  const hasJestGlobal =
    typeof (globalThis as { jest?: unknown }).jest !== 'undefined';

  return hasJestWorkerId || hasJestGlobal;
}

export function IsDevelopmentEnvironment(): boolean {
  return (process.env.NODE_ENV || '').toLowerCase() === 'development';
}
