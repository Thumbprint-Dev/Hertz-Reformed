/**
 * An order a Uniform Champion placed for this employee, seen by the employee.
 *
 * It is the Champion's Four51 order, so Four51 will not show it to the employee at all;
 * this page is built from our own record of it (`GET /me/orders-on-behalf`), which holds
 * who placed it, when, the lines and where it shipped. Reached from the employee's order
 * history, where the order appears marked "Ordered for you by" (Trevor, 24 Sep 2026).
 */
four51.app.controller('OrderBehalfCtrl', ['$scope', '$routeParams', 'Allocation',
  function($scope, $routeParams, Allocation) {
    $scope.ob = { loading: true, order: null, missing: false, returnsOn: Allocation.isEnabled() };

    $scope.ob.units = function() {
      var n = 0;
      angular.forEach(($scope.ob.order && $scope.ob.order.lines) || [], function(l) { n += l.quantity || 0; });
      return n;
    };

    Allocation.ordersOnBehalf()
      .then(function(res) {
        var found = null;
        angular.forEach((res && res.forMe) || [], function(o) {
          if (o.four51OrderId === $routeParams.id) found = o;
        });
        $scope.ob.order = found;
        $scope.ob.missing = !found;
      })
      .catch(function() { $scope.ob.missing = true; })
      .finally(function() { $scope.ob.loading = false; });
  }]);
