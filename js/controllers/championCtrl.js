/**
 * Choose someone to order for.
 *
 * A Uniform Champion orders against other people's allocations. This is the picker for
 * *whose*, and it is deliberately a page of its own rather than a control on the
 * allocation page: choosing a colleague is a different decision from choosing a polo, and
 * mixing them is how someone orders five shirts against the wrong person's year.
 *
 * ## The list is the scope
 *
 * `/champion/beneficiaries` returns exactly the employees this Champion may order for —
 * the server applies the Phase 4 scope rule and nobody else is in the response. So the
 * search box here filters a list that is already correct rather than querying "the
 * database": there is no query a Champion can type that reaches someone outside their
 * departments, because those rows never arrive.
 *
 * Filtering in the browser is the right shape for the size. A Champion covers a handful of
 * departments — the test fixture returns 14 people — and the list is fetched once. A
 * server-side search would add a round trip per keystroke to filter a list already in
 * memory. If a Champion ever covers thousands, this becomes a server query; the API is
 * already the place that knows the scope.
 */
four51.app.controller('ChampionCtrl', ['$scope', '$location', 'Allocation',
  function($scope, $location, Allocation) {

    // An object, never bare primitives: anything under an `ng-if` gets a child scope, and
    // writing to a bare name there shadows rather than updates.
    $scope.champ = {
      enabled: Allocation.isEnabled(),
      loading: false,
      error: null,
      isChampion: false,
      all: [],
      shown: [],
      query: '',
      /** How many are hidden by the current search, so the count is never a mystery. */
      total: 0,
      /**
       * Whose items the Champion's cart already holds, or null. One employee per cart
       * (Trevor, 24 Sep 2026): while it holds someone's, everyone else waits.
       */
      holder: null
    };

    /** Ask whose the cart is, once the cart itself is known. */
    function loadHolder() {
      var order = $scope.currentOrder;
      if (!order || !order.ID || !(order.LineItems && order.LineItems.length)) {
        $scope.champ.holder = null;
        return;
      }
      Allocation.cartHolder(order.ID)
        .then(function(res) { $scope.champ.holder = (res && res.holder) || null; })
        .catch(function() { $scope.champ.holder = null; });
    }
    $scope.$watch(function() {
      var o = $scope.currentOrder;
      return o ? o.ID + ':' + ((o.LineItems && o.LineItems.length) || 0) : String(o);
    }, function() { if ($scope.champ.enabled) loadHolder(); });

    /** Someone else's order is in the cart, so this person has to wait for it. */
    $scope.champ.waiting = function(b) {
      return !!($scope.champ.holder && b && b.employeeId !== $scope.champ.holder.employeeId);
    };
    $scope.champ.isHolder = function(b) {
      return !!($scope.champ.holder && b && b.employeeId === $scope.champ.holder.employeeId);
    };

    function describe(err) {
      if (!err) return 'Could not load your team.';
      if (err.noSession) return 'Please sign in.';
      if (err.network || err.status === 0) return 'Could not reach the allocation service.';
      if (err.status === 403) return 'The allocation service refused this request.';
      if (err.status === 401) {
        if (err.shimUsername) {
          return 'Signed in as "' + err.shimUsername + '", which is not set up for allocation yet.';
        }
        if (err.shimAttempted) {
          return 'Could not read your Four51 username, so allocation could not verify you.';
        }
        return 'Your session could not be verified.';
      }
      return 'Could not load your team.';
    }

    /**
     * Match on employee id, name or department.
     *
     * Id first and as a prefix, because that is what someone types when they have it in
     * front of them; name and department are substring matches for when they do not.
     */
    $scope.champ.filter = function() {
      var q = (($scope.champ.query || '').trim() || '').toLowerCase();
      if (!q) {
        $scope.champ.shown = $scope.champ.all;
        return;
      }
      $scope.champ.shown = $scope.champ.all.filter(function(b) {
        return (b.employeeId || '').toLowerCase().indexOf(q) === 0 ||
               (b.name || '').toLowerCase().indexOf(q) > -1 ||
               (b.deptCode || '').toLowerCase().indexOf(q) > -1;
      });
    };

    $scope.champ.clear = function() {
      $scope.champ.query = '';
      $scope.champ.filter();
    };

    /**
     * Hand off to the picker, carrying who it is for.
     *
     * The id travels in the URL rather than in a service singleton so the page can be
     * reloaded, bookmarked or opened in a second tab without silently reverting to the
     * Champion's own allocation — which is the version of this bug that spends the wrong
     * person's entitlement.
     */
    $scope.champ.orderFor = function(b) {
      if (!b || !b.eligible || $scope.champ.waiting(b)) return;
      $location.path('/allocation').search({ for: b.employeeId });
    };

    $scope.champ.load = function() {
      if (!$scope.champ.enabled) return;
      $scope.champ.loading = true;
      $scope.champ.error = null;

      Allocation.beneficiaries()
        .then(function(data) {
          $scope.champ.isChampion = !!(data && data.champion);
          $scope.champ.all = (data && data.beneficiaries) || [];
          $scope.champ.total = $scope.champ.all.length;
          $scope.champ.filter();
          $scope.champ.loading = false;
        })
        .catch(function(err) {
          $scope.champ.error = describe(err);
          $scope.champ.loading = false;
        });
    };

    $scope.champ.load();

    // The orders a Champion placed for their team are theirs to see in Four51, so this is
    // where a cancelled on-behalf order gets settled back to the employee (homeCtrl.js).
    // Nothing on this page shows an allocation, so there is nothing to reload.
    if ($scope.champ.enabled) {
      Allocation.checkCancellations().catch(function() { /* retried next session */ });
    }
  }]);
