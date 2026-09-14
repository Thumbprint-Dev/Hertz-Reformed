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
  enabled: false,

  // No trailing slash. The test environment's Cloud Run URL.
  baseUrl: 'https://allocation-api-lcenhqeh3q-uc.a.run.app',

  // Our session token is short-lived by design (15 minutes). Re-exchange a little early
  // rather than letting a request fail and retry.
  tokenRefreshSeconds: 780
});
