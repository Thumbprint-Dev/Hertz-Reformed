four51.app.directive('orderdetails', function() {
	var obj = {
		restrict: 'AE',
		templateUrl: 'partials/controls/orderDetails.html',
		controller: ['$scope', 'Address', function($scope, Address) {
			function addDays(date, days) {
			  var copy = new Date(Number(date));
			  copy.setDate(date.getDate() + days);
			  return copy;
			}	
			var currentDate = new Date();
			var futureDate = addDays(currentDate, 5); // Add 5 days
			$scope.options = {
				'minDate': futureDate
			};

			if ($scope.isEditforApproval) {
				var exists = false;
				angular.forEach($scope.user.CostCenters, function(cc) {
					if (exists) return;
					exists = cc == $scope.currentOrder.CostCenter;
				});
				if (!exists) {
					$scope.user.CostCenters.push({
						'Name': $scope.currentOrder.CostCenter
					});
				}
			}

            $scope.updateCostCenter = updateCostCenter;

            function updateCostCenter() {
                angular.forEach($scope.user.CostCenters, function(cc) {
                   if (cc.Name == $scope.currentOrder.CostCenter && cc.DefaultAddressID) {
                       Address.get(cc.DefaultAddressID, function(address) {
                            if (address.IsShipping) {
                                $scope.currentOrder.ShipAddressID = cc.DefaultAddressID;
                            }
                       });
                   }
                });
            }
		}]
	};
	return obj;
});
