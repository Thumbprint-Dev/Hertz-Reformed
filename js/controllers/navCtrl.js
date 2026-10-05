four51.app.controller('NavCtrl', ['$location', '$route', '$scope', '$451', 'User', 'OrderSearchCriteria',
    function ($location, $route, $scope, $451, User, OrderSearchCriteria) {
      $scope.openOrderCount = 0;
      OrderSearchCriteria.query(function(orders) {
          angular.forEach(orders, function(order){
              if(order.DisplayName == "Open"){
                  $scope.openOrderCount = order.Count;
              }
          });
      });

      $scope.waitingOrderCount = 0;
      OrderSearchCriteria.query(function(orders) {
          angular.forEach(orders, function(order){
              if(order.DisplayName == "Awaiting Approval"){
                  $scope.waitingOrderCount = order.Count;
              }
          });
      });
      

 
        $scope.Logout = function(){
            User.logout();
            if ($scope.isAnon) {
                $location.path("/catalog");
                User.login(function(user) {
                    $scope.user = user;
                });
            }
        };

        $scope.Clear = function() {
            localStorage.clear();
        }

        // The phone menu closes once a link has taken you somewhere, including Back.
        $scope.hdMenuOpen = false;
        $scope.$on('$routeChangeStart', function() { $scope.hdMenuOpen = false; });

        $scope.$on('event:orderUpdate', function(event, order) {
            // Units, not lines, so the badge matches the cart and checkout: five polos in
            // one line are five items (Trevor, 5 Oct 2026).
            var units = null;
            if (order && order.Status == 'Unsubmitted') {
                units = 0;
                angular.forEach(order.LineItems || [], function(li) { units += (+li.Quantity || 0); });
            }
            $scope.cartCount = units;
        });
    }]);
