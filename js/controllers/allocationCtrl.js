/**
 * "My Uniform Allocation" — what this employee has left, and what they cannot order yet.
 *
 * Read-only. It changes nothing and orders nothing; it is the first thing to build because
 * it proves the whole round trip — Four51 session token, exchanged for ours, resolved to an
 * employee, against real entitlement — with nothing at risk if it is wrong.
 *
 * Every number on this page comes from the API. Nothing is computed here, and nothing is
 * hardcoded. That is the point: today `categoryCtrl.js` decides allocations in JavaScript
 * (`ssQuantity = 2`, `3` if full-time, `4` if LAX), which is why nobody can answer what an
 * employee gets at their anniversary — the storefront has no concept of one.
 */
four51.app.controller('AllocationCtrl', ['$scope', 'Allocation', 'AllocationConfig',
  function($scope, Allocation, AllocationConfig) {

    // Bound to an object, never bare primitives. Anything rendered under an `ng-if` gets
    // its own child scope, and writing to a bare name there creates a shadowing copy on
    // the child instead of updating this one.
    $scope.alloc = {
      enabled: Allocation.isEnabled(),
      loading: false,
      // null = nothing went wrong. A string = something the user can act on.
      error: null,
      eligibility: null,
      view: null
    };

    /**
     * Turn a failure into something a person can act on.
     *
     * Deliberately distinguishes "we cannot reach the service" from "the service says no".
     * Those have completely different causes and completely different people who can fix
     * them, and collapsing both into "something went wrong" is how an afternoon gets lost.
     */
    function describe(err) {
      if (!err) return 'Could not load your allocation.';
      if (err.noSession) return 'Please log in to see your uniform allocation.';
      if (err.network || err.status === 0) {
        return 'Could not reach the allocation service.';
      }
      if (err.status === 403) {
        return 'The allocation service refused this request.';
      }
      if (err.status === 401) {
        return 'Your session could not be verified for allocation.';
      }
      if (err.body && err.body.message) return err.body.message;
      return 'Could not load your allocation.';
    }

    $scope.alloc.load = function() {
      if (!$scope.alloc.enabled) return;
      $scope.alloc.loading = true;
      $scope.alloc.error = null;

      Allocation.eligibility()
        .then(function(eligibility) {
          $scope.alloc.eligibility = eligibility;
          // Someone who cannot order yet has no entitlement to fetch, and
          // `/me/eligibility` already carries the date their access opens. Asking for
          // entitlement anyway returns an empty shell that reads as "you have nothing",
          // which is a different and much worse message than "you are eligible on the
          // 14th of March".
          if (eligibility && eligibility.status !== 'eligible') return null;
          return Allocation.entitlement();
        })
        .then(function(view) {
          if (view) $scope.alloc.view = view;
          $scope.alloc.loading = false;
        })
        .catch(function(err) {
          $scope.alloc.error = describe(err);
          $scope.alloc.loading = false;
        });
    };

    $scope.alloc.load();
  }]);
