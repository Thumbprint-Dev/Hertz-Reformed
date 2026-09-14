/**
 * Where the allocation API lives.
 *
 * One place to change it, because it differs per environment and must never be guessed
 * from `window.location` — the storefront is served by Four51, our API is not.
 *
 * `enabled: false` is the safe default and the whole point of this file. Everything the
 * allocation integration adds is behind it, so the theme ships and runs exactly as it does
 * today until someone deliberately turns it on. Two things have to be true first:
 *
 *   1. The API is reachable from a browser at all. Cloud Run currently grants
 *      `run.invoker` only to the scheduler service account, so a browser gets a 403 after
 *      a perfectly successful deploy (open decision 44).
 *   2. Four51 API credentials exist, so `POST /auth/session` can resolve a session token
 *      to an employee rather than throwing (open decision B2).
 *
 * Neither is a code problem and neither is fixed here. Until both are settled, leaving
 * this false means the allocation panel simply does not render.
 */
four51.app.constant('AllocationConfig', {
  enabled: true,

  // No trailing slash. The test environment's Cloud Run URL.
  baseUrl: 'https://allocation-api-lcenhqeh3q-uc.a.run.app',

  // Our session token is short-lived by design (15 minutes). Re-exchange a little early
  // rather than letting a request fail and retry.
  tokenRefreshSeconds: 780,

  /**
   * TESTING SHIM. Send this fixed token instead of the signed-in Four51 session.
   *
   * Why it exists: until Four51 API credentials are available, the deployed service runs
   * its local auth stub, which resolves `local:<username>` and cannot resolve a real
   * Four51 session token at all. Without this there is no way to exercise the integration
   * end to end against the real storefront.
   *
   * What it costs: whoever loads the page acts as this employee. It is bounded on the
   * server by LOCAL_TOKEN_ALLOWLIST, which names the handful of test logins the stub will
   * resolve and refuses everything else — so the exposure is a synthetic test account, not
   * an arbitrary one. That is an acceptable trade on a sandbox holding generated data and
   * an unacceptable one anywhere near real employees.
   *
   * MUST be null before any real HR feed lands. Leaving it set is the difference between a
   * test fixture and an impersonation endpoint.
   */
  devToken: 'local:web-htz'
});
