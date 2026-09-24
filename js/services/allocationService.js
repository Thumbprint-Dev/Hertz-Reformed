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

    // The next new cart's beneficiary, held until the gate claims it. See setPendingBeneficiary.
    var pendingBeneficiary = null;

    // In memory on purpose. See the note above.
    var _token = null;
    var _tokenAt = 0;
    var _pending = null;
    // The session response already carries roles and the employee id. Holding them avoids
    // a second call for something we were just told.
    var _identity = { employeeId: null, roles: [] };
    // One cancellation check per page session. See `checkCancellations`.
    var _cancelCheck = null;

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

    /**
     * Reading order for pools, wherever they are listed.
     *
     * The API returns them alphabetically, which puts Belt — one item — first and buries
     * the two pools carrying most of the allocation. This is the order Hertz's design uses
     * and the order people get dressed in. Anything not named keeps its API position at the
     * end, so a new pool appears rather than disappearing.
     */
    var POOL_ORDER = ['Polos', 'Bottoms', 'Layering', 'Headwear', 'Belt'];

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

            // Tell the rest of the theme, which asks a different question.
            //
            // `hertzChampionUser` is set in Four51Ctrl by matching the user's Four51 group
            // name against the literal string "5_Hertz Uniform Champions", and it gates the
            // FAQ link in the header and hamburger navs, the footer, and Remove in the
            // cart. Champion status in this system is decided by our database, not by a
            // group name, so the two disagree the moment a group is renamed or a champion
            // is set up in one place and not the other — and the symptom is a champion who
            // has the champion landing page and no champion nav.
            //
            // One fact, two readers. This makes the API the source and leaves the group
            // match in place as a fallback, so nothing that works today stops working.
            if ((_identity.roles || []).indexOf('champion') > -1) {
              $rootScope.hertzChampionUser = true;
            }

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
       * Who the employee is, according to the Hertz HR feed: department, job title,
       * allocation group, when the cycle turns over.
       *
       * Read-only, and there is no counterpart that writes. The feed is the authority for
       * every field, so anything typed into the storefront is overwritten on the next
       * ingest — see the note on the account page.
       *
       * @param forEmployeeId optional — a Champion reading a beneficiary's profile,
       *   authorised server-side by the same scope rule the cart uses.
       */
      profile: function(forEmployeeId) {
        return authed('GET', '/me/profile' + beneficiaryQuery(forEmployeeId), null);
      },

      /**
       * What can be sent back, order by order, and the reasons to choose from.
       *
       * From our record of the order rather than Four51's, because a Champion's on-behalf
       * order is the Champion's Four51 order and only we know whose uniform it was. Each
       * line's `returnable` is what `requestReturn` will accept right now, already net of
       * anything requested and still in the post.
       *
       * @param forEmployeeId optional — a Champion raising a return for someone on their
       *   team, authorised server-side by the same scope rule the cart uses.
       */
      returnOrders: function(forEmployeeId) {
        return authed('GET', '/returns/orders' + beneficiaryQuery(forEmployeeId), null);
      },

      /**
       * Raise a return and get its RMA number back. Credits nothing: the allocation comes
       * back when the warehouse receives the box, and only for what was in it.
       *
       * @param request `{ four51OrderId, lines: [{ four51LineId, quantity, reasonCode }] }`.
       *   No email: the server records the submitter's own from the HR record.
       */
      requestReturn: function(request, forEmployeeId) {
        var body = angular.extend({}, request);
        if (forEmployeeId) body.beneficiaryEmployeeId = forEmployeeId;
        return authed('POST', '/returns', body);
      },

      /**
       * Settle any of this user's orders Four51 has cancelled, giving their items back.
       *
       * Sends the user's own Four51 token, once, to a server that reads each open order back
       * from Four51 with it and credits only what Four51 reports as Canceled — the browser
       * never claims a cancellation, so there is nothing here to trust. Once per page session:
       * a cancellation is rare, and the landing page is where this is called from.
       */
      checkCancellations: function() {
        if (_cancelCheck) return _cancelCheck;
        var four51Token = Security.auth();
        if (!four51Token) return $q.when({ checked: 0, cancelled: [] });
        _cancelCheck = authed('POST', '/orders/check-cancellations', { four51Token: four51Token })
          .catch(function(err) {
            _cancelCheck = null;
            return $q.reject(err);
          });
        return _cancelCheck;
      },

      /**
       * The prepaid label for a return: the one it has, or another attempt when the first
       * failed. The server buys at most one per return however often this is called.
       */
      returnLabel: function(rmaNumber) {
        return authed('POST', '/returns/' + encodeURIComponent(rmaNumber) + '/label', null);
      },

      /**
       * Turn this order's reservations into consumption. Called after Four51 accepts a
       * submit — see the note in allocationGate.js on why after rather than before.
       */
      checkout: function(four51OrderId, lines, forEmployeeId, shipAddress, orderNumber) {
        var body = { four51OrderId: four51OrderId, lines: lines };
        if (forEmployeeId) body.beneficiaryEmployeeId = forEmployeeId;
        // Where it shipped, so a return label can be printed from the same address.
        if (shipAddress) body.shipAddress = shipAddress;
        // The number people know it by ("1000"), so the employee a Champion ordered for can
        // see it, by number, without being able to read the Champion's Four51 order.
        if (orderNumber) body.orderNumber = String(orderNumber);
        return authed('POST', '/checkout', body);
      },

      /**
       * Orders placed on someone's behalf: `forMe` (a Champion ordered for me) and `byMe`
       * (I ordered for someone). See `GET /me/orders-on-behalf`.
       */
      ordersOnBehalf: function() {
        return authed('GET', '/me/orders-on-behalf', null);
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

      /**
       * Who the next brand-new cart is for. A cart has no id until Four51's first save
       * returns, so the picker cannot record the beneficiary against it in advance, and the
       * gate used to meter that first add against the Champion's own allocation. The picker
       * sets this before saving; the gate takes it (once) when the new id arrives.
       */
      setPendingBeneficiary: function(employeeId) { pendingBeneficiary = employeeId || null; },
      takePendingBeneficiary: function() {
        var p = pendingBeneficiary;
        pendingBeneficiary = null;
        return p;
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

      inDisplayOrder: function(pools) {
        var known = [];
        var rest = [];
        angular.forEach(pools || [], function(p) {
          (POOL_ORDER.indexOf(p.name) > -1 ? known : rest).push(p);
        });
        known.sort(function(a, b) {
          return POOL_ORDER.indexOf(a.name) - POOL_ORDER.indexOf(b.name);
        });
        return known.concat(rest);
      },

      /**
       * Where an allocation's held units are, from the entitlement's `holds`.
       *
       *   self      in the allocation holder's own cart
       *   me        in the signed-in person's cart, when they are ordering for someone else
       *   others    in carts other people are filling for them: [{ employeeId, name, units }]
       *   elsewhere in another person's cart whose name was never recorded (below)
       *
       * An employee's units in a Champion's cart used to read as "reserved in your cart",
       * with a link to a cart that was empty (Trevor, 24 Sep 2026). A response without
       * `holds` (an API older than the storefront) counts everything as `self`, which is
       * what the page said before.
       *
       * `ownOrderId` is the signed-in person's current Four51 order (`user.CurrentOrderID`,
       * null for no cart), or `undefined` while the user has not loaded. It places holds
       * written before the cart gate recorded who filled a cart: those carry no name, so
       * they are placed by order instead. The signed-in person's own cart is their current
       * order; any other order holding the units is someone else's. For an employee that
       * is a Champion's order ("elsewhere"). For a Champion ordering on someone's behalf,
       * their current order is their own cart ("me") and any other is the employee's
       * ("self"). Until the user has loaded, an unnamed hold stays `self`.
       */
      splitHolds: function(view, ownOrderId) {
        var out = { self: 0, me: 0, others: [], elsewhere: 0 };
        if (!view) return out;
        if (!view.holds) {
          angular.forEach(view.pools || [], function(p) { out.self += p.reserved || 0; });
          return out;
        }
        var me = (_identity || {}).employeeId;
        var byPlacer = {};
        angular.forEach(view.holds, function(h) {
          if (!h.placedBy) {
            if (ownOrderId === undefined) { out.self += h.units; return; }
            var mine = !!ownOrderId && h.four51OrderId === ownOrderId;
            if (view.onBehalf) { if (mine) out.me += h.units; else out.self += h.units; }
            else if (mine) out.self += h.units;
            else out.elsewhere += h.units;
            return;
          }
          if (me && h.placedBy.employeeId === me) { out.me += h.units; return; }
          var o = byPlacer[h.placedBy.employeeId];
          if (!o) {
            o = byPlacer[h.placedBy.employeeId] = { employeeId: h.placedBy.employeeId, name: h.placedBy.name, units: 0 };
            out.others.push(o);
          }
          o.units += h.units;
        });
        return out;
      },

      /** Everyone this Champion may order for. `{ champion: false, beneficiaries: [] }`
       *  for an ordinary employee — not an error. */
      beneficiaries: function() {
        return authed('GET', '/champion/beneficiaries', null);
      },

      /**
       * Whose items this Four51 cart holds, as { holder: { employeeId, name } | null }.
       * A Champion orders for one employee at a time; the cart gate refuses a second.
       */
      cartHolder: function(four51OrderId) {
        if (!four51OrderId) return $q.when({ holder: null });
        return authed('GET', '/champion/cart-holder?order=' + encodeURIComponent(four51OrderId), null);
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
