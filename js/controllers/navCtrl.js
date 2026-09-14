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

        $scope.$on('event:orderUpdate', function(event, order) {
            $scope.cartCount = (order ? ((order.Status == 'Unsubmitted') ? order.LineItems.length : null) : null);
        });
    }]);
