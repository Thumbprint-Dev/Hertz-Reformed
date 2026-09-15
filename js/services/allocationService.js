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
four51.app.factory('Allocation', ['$q', '$rootScope', '$timeout', 'AllocationConfig', 'Security', 'User',
  function($q, $rootScope, $timeout, AllocationConfig, Security, User) {

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
    /**
     * The signed-in Four51 username, for the local auth shim. Resolves to a name or null.
     *
     * Two sources, because the first one is not always populated. `Security.currentUser`
     * comes from a cookie written at login by `Security.init`; `isAuthenticated()` is what
     * repopulates it after a page load. That cookie turned out to be missing `Username` in
     * practice — the symptom was a bare "session could not be verified" with nothing to act
     * on — so `User.get` is the fallback. It is the same source the header reads, cached in
     * localStorage and answered synchronously when it is warm.
     *
     * Never rejects and never hangs. A promise that neither settles is worse than a wrong
     * answer here: it leaves the page on its loading skeleton forever, which is exactly how
     * the `$applyAsync` bug presented. The timeout guarantees an answer.
     */
    function shimUsername() {
      if (!AllocationConfig.localAuthShim) return $q.when(null);

      // An explicit string pins the login instead of reading it. The escape hatch for
      // when Four51's username is not what the allowlist expects — a prefixed one, say —
      // so testing is never blocked on working that out.
      if (typeof AllocationConfig.localAuthShim === 'string') {
        return $q.when(AllocationConfig.localAuthShim);
      }

      try {
        Security.isAuthenticated();
        var fromCookie = Security.currentUser && Security.currentUser.Username;
        if (fromCookie) return $q.when(fromCookie);
      } catch (e) {
        // Fall through to User.get rather than giving up.
      }

      var d = $q.defer();
      var settled = false;
      function settle(value) {
        if (settled) return;
        settled = true;
        d.resolve(value || null);
      }

      // If the cache is cold this is a network call; if it is warm the callback fires
      // synchronously, so the digest is nudged rather than waited on.
      $timeout(function() { settle(null); }, 5000);
      try {
        User.get(function(user) {
          settle(user && user.Username);
          $rootScope.$evalAsync();
        });
      } catch (e) {
        settle(null);
      }
      return d.promise;
    }

    /**
     * Query string for a beneficiary read, or nothing at all.
     *
     * Encoded rather than concatenated: an employee id is external input, and the one
     * place it reaches a URL is the one place to be careful about it.
     */
    /** sessionStorage prefix for the per-order beneficiary. */
    var BENEFICIARY_KEY = 'hz.alloc.for.';

    function beneficiaryQuery(employeeId) {
      if (!employeeId) return '';
      return '?beneficiaryEmployeeId=' + encodeURIComponent(employeeId);
    }

    function session() {
      var fresh = _token && (Date.now() - _tokenAt) / 1000 < AllocationConfig.tokenRefreshSeconds;
      if (fresh) return $q.when(_token);
      if (_pending) return _pending;

      // The shim wins when on, because the point of it is to work when the real session
      // token cannot be resolved. See the note on AllocationConfig.localAuthShim — it is
      // bounded server-side by an allowlist and must be off before real data exists.
      _pending = shimUsername().then(function(shimUser) {
        var four51Token = shimUser ? 'local:' + shimUser : Security.auth();
        if (!four51Token) {
          _pending = null;
          return $q.reject({ status: 401, body: null, noSession: true });
        }

        return request('POST', '/auth/session', { four51Token: four51Token }, null)
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
            if (err && err.status === 401) {
              // Always stamped, including when no name was found: a 401 here is an
              // allowlist question, and "which login?" is the only thing worth knowing.
              err.shimUsername = shimUser || null;
              err.shimAttempted = AllocationConfig.localAuthShim === true;
            }
            return $q.reject(err);
          });
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
      eligibility: function(forEmployeeId) {
        return authed('GET', '/me/eligibility' + beneficiaryQuery(forEmployeeId), null);
      },

      /**
       * Pools, categories and what remains, plus anything withheld by a seasonal window.
       *
       * `seasonalClosed[]` is deliberately separate from `pools[]`: nothing in it is
       * orderable, but it carries `opensOn` so the UI can say "available 1 October"
       * rather than showing nothing at all.
       */
      /**
       * @param forEmployeeId optional — a Champion reading a beneficiary's allocation.
       *   The server authorises it with the same scope rule the cart uses, so passing an
       *   id you may not order for is a 403 rather than a disclosure.
       */
      entitlement: function(forEmployeeId) {
        return authed('GET', '/me/entitlement' + beneficiaryQuery(forEmployeeId), null);
      },

      /**
       * Turn this order's reservations into consumption. Called after Four51 accepts a
       * submit — see the note in allocationGate.js on why after rather than before.
       */
      checkout: function(four51OrderId, lines, forEmployeeId) {
        var body = { four51OrderId: four51OrderId, lines: lines };
        if (forEmployeeId) body.beneficiaryEmployeeId = forEmployeeId;
        return authed('POST', '/checkout', body);
      },

      /**
       * Who a Four51 order is being built for, when it is not the signed-in user.
       *
       * A Champion's on-behalf order is still *their* Four51 order — Four51 has no notion
       * of ordering as someone else — so the beneficiary is ours to remember, and it has
       * to survive the page reloads a cart goes through between adding a line and checking
       * out. Held per order id in sessionStorage: per order because a Champion may build
       * one for Ana and then one for Ben, and sessionStorage because it should not outlive
       * the browser session that created it.
       *
       * Every write is still authorised server-side on each call, so a tampered value buys
       * nothing: it produces a 403 rather than someone else's allocation.
       */
      orderBeneficiary: function(four51OrderId) {
        if (!four51OrderId) return null;
        try {
          return window.sessionStorage.getItem(BENEFICIARY_KEY + four51OrderId) || null;
        } catch (e) {
          return null;
        }
      },

      setOrderBeneficiary: function(four51OrderId, employeeId) {
        if (!four51OrderId) return;
        try {
          if (employeeId) {
            window.sessionStorage.setItem(BENEFICIARY_KEY + four51OrderId, employeeId);
          } else {
            window.sessionStorage.removeItem(BENEFICIARY_KEY + four51OrderId);
          }
        } catch (e) {
          // Private browsing, or storage disabled. The order still validates against the
          // signed-in user, which is a refusal rather than a wrong charge.
        }
      },

      clearOrderBeneficiary: function(four51OrderId) {
        this.setOrderBeneficiary(four51OrderId, null);
      },

      /** Everyone this Champion may order for. `{ champion: false, beneficiaries: [] }`
       *  for an ordinary employee — not an error. */
      beneficiaries: function() {
        return authed('GET', '/champion/beneficiaries', null);
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
      validateCart: function(four51OrderId, lines, forEmployeeId) {
        var body = { four51OrderId: four51OrderId, lines: lines };
        if (forEmployeeId) body.beneficiaryEmployeeId = forEmployeeId;
        return authed('POST', '/cart/validate', body);
      },

      /**
       * Ask the same question and hold nothing.
       *
       * Same checks, same refusal shape, no reservation. The picker uses this: it is
       * asking whether a selection fits, not saving a cart, and a reservation made on a
       * question is one the employee never agreed to and cannot undo by leaving the page.
       */
      previewCart: function(four51OrderId, lines, forEmployeeId) {
        var body = { four51OrderId: four51OrderId, lines: lines };
        // Only sent when there is one: an absent key is an ordinary self-service check,
        // and the server treats an empty string the same way.
        if (forEmployeeId) body.beneficiaryEmployeeId = forEmployeeId;
        return authed('POST', '/cart/preview', body);
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
