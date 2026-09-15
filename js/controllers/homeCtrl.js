/**
 * The landing page.
 *
 * Until now `/` redirected to `/catalog`, so the first thing an employee saw after signing
 * in was a product grid that is empty for anyone whose groups are not yet configured — a
 * blank screen with a red banner apologising for it.
 *
 * This page answers the one question someone actually arrives with: *what can I order, and
 * how much of it is left?* Everything else is secondary and is kept off the page.
 */
four51.app.controller('HomeCtrl', ['$scope', 'Allocation',
  function($scope, Allocation) {

    // Bound to an object, never bare primitives: anything rendered under an `ng-if` gets
    // its own child scope, and writing to a bare name there shadows rather than updates.
    $scope.home = {
      enabled: Allocation.isEnabled(),
      loading: false,
      error: null,
      eligibility: null,
      view: null,
      totalRemaining: 0,
      totalGranted: 0,
      /** Pools worth naming on a summary card. Seasonal ones are handled separately. */
      pools: [],
      closed: []
    };

    function describe(err) {
      if (!err) return 'Could not load your allocation.';
      if (err.noSession) return 'Please sign in to see your uniform allocation.';
      if (err.network || err.status === 0) return 'Could not reach the allocation service.';
      if (err.status === 403) return 'The allocation service refused this request.';
      if (err.status === 401) return 'Your session could not be verified.';
      return 'Could not load your allocation.';
    }

    $scope.home.load = function() {
      if (!$scope.home.enabled) return;
      $scope.home.loading = true;
      $scope.home.error = null;

      Allocation.eligibility()
        .then(function(eligibility) {
          $scope.home.eligibility = eligibility;
          // Someone before day 90 has no entitlement to fetch, and `/me/eligibility`
          // already carries the date their access opens. Asking anyway returns an empty
          // shell that reads as "you have nothing", which is a worse answer than a date.
          if (eligibility && eligibility.status !== 'eligible') return null;
          return Allocation.entitlement();
        })
        .then(function(view) {
          if (view) {
            $scope.home.view = view;
            $scope.home.pools = view.pools || [];
            $scope.home.closed = view.seasonalClosed || [];
            var remaining = 0, granted = 0;
            angular.forEach($scope.home.pools, function(p) {
              remaining += p.remaining;
              granted += p.granted;
            });
            $scope.home.totalRemaining = remaining;
            $scope.home.totalGranted = granted;
          }
          $scope.home.loading = false;
        })
        .catch(function(err) {
          $scope.home.error = describe(err);
          $scope.home.loading = false;
        });
    };

    $scope.home.load();
  }]);
