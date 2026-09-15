/**
 * Client for the allocation API — the service that owns entitlement.
 *
 * Four51 owns commerce: users, groups, catalogue, cart, orders, checkout. This API owns
 * who is eligible, what kit they get, what they have spent and what remains. The two are
 * joined by IDs only.
 *
 * ## Why this does NOT use $http
 *
 * `js/interceptors.js` pushes a request interceptor that does, unconditionally and with no
 * URL allowlist:
 *
 *     config.headers['Authorization'] = Security.auth();
 *
 * on **every** outbound $http call. Two consequences, both bad here:
 *
 *   1. It overwrites whatever `Authorization` the caller set — so our own session token
 *      would be silently replaced by the Four51 one and every request would 401, with
 *      nothing in the code to explain why.
 *   2. It would send the Four51 session token to a third-party origin on every call,
 *      including calls that have no business seeing it.
 *
 * So this talks to the API with a plain XMLHttpRequest wrapped in `$q`, which the
 * interceptor never sees. The Four51 token is sent exactly once, deliberately, to
 * `POST /auth/session`, which is the one endpoint whose job is to resolve it.
 *
 * ## The token we get back
 *
 * A short-lived JWT carrying `employeeId` and `programId`. It is held in memory only —
 * not in `localStorage`, not in a cookie — because both are readable by any script on the
 * page and this token authorises spending someone's allocation. In-memory means it dies
 * with the tab, and re-exchanging is cheap.
 */
four51.app.factory('Allocation', ['$q', '$rootScope', 'AllocationConfig', 'Security',
  function($q, $rootScope, AllocationConfig, Security) {

    // In memory on purpose. See the note above.
    var _token = null;
    var _tokenAt = 0;
    var _pending = null;
    // The session response already carries roles and the employee id. Holding them avoids
    // a second call for something we were just told.
    var _identity = { employeeId: null, roles: [] };

    function url(path) {
      return AllocationConfig.baseUrl.replace(/\/$/, '') + path;
    }

    /**
     * Settle a deferred from outside Angular, and get back into a digest.
     *
     * This XHR is not Angular's, so nothing schedules a digest when it completes and the
     * view would never update.
     *
     * `$evalAsync`, NOT `$applyAsync`. `$applyAsync` arrived in Angular 1.3 and this theme
     * runs 1.2.15, where it is simply `undefined` — calling it threw inside the xhr
     * handler, so the deferred was never resolved and never rejected, and the page sat on
     * "Loading your allocation..." forever with no error anywhere. A hang rather than a
     * failure, which is the harder thing to diagnose.
     *
     * `$evalAsync` has existed since 1.0 and schedules a digest if one is not already
     * running, which is exactly what is needed here.
     */
    function settle(fn) {
      $rootScope.$evalAsync(fn);
    }

    /**
     * A request that bypasses Angular's $http, and therefore the interceptor.
     *
     * Deliberately plain: no retries, no caching, no global error broadcast. A failure
     * here must not look like a Four51 failure, because the two have completely different
     * causes and completely different fixes.
     */
    function request(method, path, body, bearer) {
      var deferred = $q.defer();
      var xhr = new XMLHttpRequest();
      xhr.open(method, url(path), true);
      xhr.setRequestHeader('Content-Type', 'application/json');
      if (bearer) xhr.setRequestHeader('Authorization', 'Bearer ' + bearer);

      xhr.onload = function() {
        var parsed = null;
        try {
          parsed = xhr.responseText ? JSON.parse(xhr.responseText) : null;
        } catch (e) {
          // A non-JSON body from this API is always an infrastructure answer rather than
          // an application one — a Cloud Run 403 HTML page, say (decision 44).
          deferred.reject({ status: xhr.status, body: xhr.responseText, parseError: true });
          return;
        }
        if (xhr.status >= 200 && xhr.status < 300) {
          settle(function() { deferred.resolve(parsed); });
        } else {
          settle(function() { deferred.reject({ status: xhr.status, body: parsed }); });
        }
      };

      xhr.onerror = function() {
        settle(function() {
          // Network-level failure. With `enabled: true` and decision 44 unsettled, this is
          // what a browser sees: the preflight never gets past Cloud Run's IAM check.
          deferred.reject({ status: 0, body: null, network: true });
        });
      };

      xhr.send(body ? JSON.stringify(body) : null);
      return deferred.promise;
    }

    /**
     * Exchange the Four51 session token for ours.
     *
     * Concurrent callers share one in-flight exchange — the allocation panel and the cart
     * gate both want a token on the same page load, and two exchanges would be two
     * pointless round trips against a shopper's first paint.
     */
    function session() {
      var fresh = _token && (Date.now() - _tokenAt) / 1000 < AllocationConfig.tokenRefreshSeconds;
      if (fresh) return $q.when(_token);
      if (_pending) return _pending;

      // The shim wins when set, because the point of it is to work when the real session
      // token cannot be resolved. See the note on AllocationConfig.devToken — it is
      // bounded server-side by an allowlist and must be null before real data exists.
      var four51Token = AllocationConfig.devToken || Security.auth();
      if (!four51Token) return $q.reject({ status: 401, body: null, noSession: true });

      _pending = request('POST', '/auth/session', { four51Token: four51Token }, null)
        .then(function(data) {
          _token = data.token;
          _tokenAt = Date.now();
          _identity = { employeeId: data.employeeId, roles: data.roles || [] };
          _pending = null;
          return _token;
        })
        .catch(function(err) {
          _pending = null;
          _token = null;
          return $q.reject(err);
        });

      return _pending;
    }

    /** Authenticated GET/POST, exchanging first and re-exchanging once on a 401. */
    function authed(method, path, body) {
      return session()
        .then(function(token) { return request(method, path, body, token); })
        .catch(function(err) {
          if (!err || err.status !== 401) return $q.reject(err);
          // The token expired mid-session. One retry, with a forced re-exchange; a second
          // 401 is a real failure and must surface rather than loop.
          _token = null;
          _tokenAt = 0;
          return session().then(function(token) {
            return request(method, path, body, token);
          });
        });
    }

    return {
      /** False until decision 44 and B2 are settled — see AllocationConfig. */
      isEnabled: function() {
        // With the shim set there is no Four51 session to require — that is the situation
        // it exists for.
        return !!AllocationConfig.enabled &&
               (!!AllocationConfig.devToken || !!Security.isAuthenticated());
      },

      /** Whether this employee may order today, and if not, the exact date they can. */
      eligibility: function() {
        return authed('GET', '/me/eligibility', null);
      },

      /**
       * Pools, categories and what remains, plus anything withheld by a seasonal window.
       *
       * `seasonalClosed[]` is deliberately separate from `pools[]`: nothing in it is
       * orderable, but it carries `opensOn` so the UI can say "available 1 October"
       * rather than showing nothing at all.
       */
      entitlement: function() {
        return authed('GET', '/me/entitlement', null);
      },

      /**
       * Ask the gatekeeper whether this cart may be saved, and **hold the units**.
       *
       * This is the cart path: it reserves, so it belongs with an actual save. Anything
       * that only wants the answer must call `previewCart` instead.
       *
       * Resolves with `{ ok: true, ... }`, or rejects with a 409 whose body is a
       * Four51-shaped refusal. Read `Message` and `Errors[].Message` and show them
       * verbatim — see `refusalText` below for why `LineItems` must be ignored.
       */
      validateCart: function(four51OrderId, lines) {
        return authed('POST', '/cart/validate', {
          four51OrderId: four51OrderId,
          lines: lines
        });
      },

      /**
       * Ask the same question and hold nothing.
       *
       * Same checks, same refusal shape, no reservation. The picker uses this: it is
       * asking whether a selection fits, not saving a cart, and a reservation made on a
       * question is one the employee never agreed to and cannot undo by leaving the page.
       */
      previewCart: function(four51OrderId, lines) {
        return authed('POST', '/cart/preview', {
          four51OrderId: four51OrderId,
          lines: lines
        });
      },

      /**
       * Pull the readable text out of a refusal.
       *
       * ONLY `Message` and `Errors[].Message`. `LineItems[].Errors[]` is never read,
       * because `categoryCtrl.js`'s `formatInventoryErrors` rewrites every line-item error
       * — whatever it actually says — into "The size you selected for X is out of stock."
       * An allocation or seasonal refusal shown through that channel would send an
       * employee chasing inventory for a problem that has nothing to do with stock. The
       * API deliberately sends empty `LineItems[].Errors` arrays for the same reason.
       */
      refusalText: function(refusal) {
        if (!refusal) return [];
        var out = [];
        if (refusal.Message) out.push(refusal.Message);
        angular.forEach(refusal.Errors || [], function(e) {
          if (e && e.Message && out.indexOf(e.Message) === -1) out.push(e.Message);
        });
        return out;
      },

      /**
       * Who the session belongs to, and what they may do.
       *
       * Populated by the exchange, so it is only meaningful after a call that needed a
       * token. Roles come from `user_role_assignments` with `revoked_at IS NULL`, so a
       * champion who has been stood down loses the entries on their next session.
       */
      identity: function() { return _identity; },

      hasRole: function(role) {
        return (_identity.roles || []).indexOf(role) > -1;
      },

      /** Drop the cached token. Call on logout so the next user re-exchanges. */
      clear: function() {
        _token = null;
        _tokenAt = 0;
        _pending = null;
        _identity = { employeeId: null, roles: [] };
      }
    };
  }]);
