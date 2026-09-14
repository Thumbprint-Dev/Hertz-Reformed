# Hertz-Reformed

The Hertz Uniforms Four51 storefront theme. This repo is what Four51 deploys.

## Layout, and the Git File Deployment settings

The theme lives under **`app/`** — `app/index.html`, `app/js`, `app/css`, `app/lib`,
`app/partials` — which is the structure both `Four51/Four51Storefront` and
`Thumbprint-Dev/ModernTheme` use. It is not decorative: Four51's **Git File Deployment**
form asks for an *App code folder*, and that is the folder it means.

| Field | Value |
|---|---|
| Repository URL | `https://github.com/Thumbprint-Dev/Hertz-Reformed` |
| **App code folder** | `app` |
| Deployment sub folder in repository | *(leave blank)* |

Every asset path inside `app/index.html` is relative (`js/…`, `css/…`, `lib/…`), so the
folder moves as a unit and nothing needs rewriting.

## Deployment

Four51's admin has a **Git File Deployment** page (Products/Admin area) that auto-deploys on
merge to `master`, with a per-commit history and a **Redeploy** button. There is no build
step: AngularJS 1.2 with `ngRoute`, static files served as-is. What is in git is what ships.

Two things that have cost real time before, both worth knowing up front:

- **A merge to `master` is a live deploy.** There is no staging step in between.
- **When a change does not appear, clear `localStorage` before assuming the deploy failed.**
  `Category.tree()` caches the whole category tree under `451Cache.Tree.<tenant>` with **no
  expiry** and never hits the network when a cached copy exists, however stale. Verify
  against the live file with `curl` and a cache-busting query string before concluding
  anything.

If a deploy seems stalled far longer than others in the same session, check the Git File
Deployment page for that commit and use its Redeploy button.

## The allocation integration

Four51 owns commerce — users, groups, catalogue, cart, orders, checkout. A separate service
owns **entitlement**: who is eligible, what kit they get, what they have spent and what
remains. The two are joined by IDs only.

| File | Role |
|---|---|
| `app/js/allocationConfig.js` | Base URL and the on/off flag |
| `app/js/services/allocationService.js` | API client |
| `app/js/controllers/allocationCtrl.js` | The `/allocation` page |
| `app/partials/allocationView.html` | Its markup |
| `app/css/custom.css` | Its styles, appended under `/* Uniform Allocation */` |

**It ships disabled.** `AllocationConfig.enabled` is `false`, so the theme behaves exactly as
it did before these files existed: the page renders a single "not switched on" line and
nothing else changes anywhere. It is safe to deploy in this state, and doing so is the
intended way to get the files live and dormant ahead of the credentials.

### What has to be true before flipping it on

1. **The API must be reachable from a browser.** It is on Cloud Run, which currently grants
   `run.invoker` only to a scheduler service account, so a browser gets a 403.
2. **`ALLOWED_ORIGINS` on the API must include this storefront's origin.** The theme and the
   API are on different domains, so every call is cross-origin. Without it the browser
   blocks the request at the preflight — *before* the IAM check — which presents as a
   generic network error and looks exactly like problem 1. They are separate faults with
   separate fixes.
3. **Four51 API credentials must exist**, so `POST /auth/session` can resolve a session token
   to an employee instead of throwing.

None of these are code changes in this repo.

### Why the client does not use `$http`

`app/js/interceptors.js` sets `config.headers['Authorization'] = Security.auth()` on **every**
outbound `$http` call, with no URL allowlist. For a third-party API that is two problems: it
overwrites the caller's own `Authorization`, so our session token would be silently replaced
and every request would 401 with nothing in the code to explain it; and it would send the
Four51 session token to another origin on every call.

`app/js/services/allocationService.js` therefore uses a plain `XMLHttpRequest` wrapped in `$q`, which the
interceptor never sees. The Four51 token is sent exactly once, deliberately, to the one
endpoint whose job is to resolve it. The token we get back is held **in memory only** — not
`localStorage`, not a cookie — because it authorises spending an employee's allocation and
both of those are readable by any script on the page.

### Refusal messages

Read only `Message` and `Errors[].Message`. Never `LineItems[].Errors[]`:
`categoryCtrl.js`'s `formatInventoryErrors` rewrites *every* line-item error, whatever it
says, into "The size you selected for X is out of stock." An allocation or seasonal refusal
sent through that channel would send an employee chasing inventory for a problem that has
nothing to do with stock.

## Conventions worth keeping

- **Every custom element gets an explicit closing tag.** `<tag />` on a non-void custom
  element is parsed as an unclosed opener, and every sibling after it becomes a silently
  swallowed hidden child until the parser meets a real close. This has hidden entire tables
  and Add-to-Cart buttons before.
  `grep -oE "<[a-z]+[a-z-]* [^>]*/>" file.html` counts the latent bugs in a file.
- **Never a bare `ng-model`** that might render under an `ng-if`. `ng-if` creates a child
  scope, and assigning to an undotted name there creates a shadowing copy instead of
  updating the controller's property — the `$watch` never fires again. Bind to an object:
  `ng-model="thing.value"`.
- **All new CSS goes at the end of `app/css/custom.css`** under a comment block. Never edit
  `bootstrap-451.css`; override it from `custom.css`.
- **Use `padding-top`/`padding-bottom`, not the `padding` shorthand**, on any class meant to
  be combined with another that supplies its own padding — the shorthand replaces all four
  sides rather than merging, which silently zeroes horizontal padding and is invisible until
  you look at a mobile width.
- `.container-view`'s real padding is **5px**. Any full-bleed wrapper cancelling it needs
  `-5px`, not a value copied from another project.
- `.451xxx` class selectors are invalid CSS (a class cannot start with an unescaped digit)
  and match nothing. Use `[class~="451qa_home_link"]`.

## Related

The entitlement service, database, infrastructure and the full project documentation live in
`Thumbprint-Dev/Hertz-Database`. A read-only copy of this theme is vendored there at
`apps/storefront/` for reference, along with a local preview harness that renders the
allocation page against a local API without needing Four51 at all.
