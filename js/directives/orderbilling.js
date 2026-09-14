four51.app.directive('orderbilling', ['Address', 'AddressList', '$timeout', function(Address, AddressList, $timeout) {
	var obj = {
		restrict: 'AE',
		templateUrl: 'partials/controls/orderBilling.html',
		controller: ['$scope', function($scope) {
		
			$scope.billaddress = { Country: 'US', IsShipping: false, IsBilling: true };

			$scope.$on('event:AddressSaved', function(event, address) {
				if (address.IsBilling) {
					$scope.currentOrder.BillAddressID = address.ID;
					$scope.billaddressform = false;
				}

				$scope.billaddress = { Country: 'US', IsShipping: false, IsBilling: true };
			});

			// Auto-populate billing address if there's only one billing address assigned
			var autoSetBillingAddress = function(force) {
				if ($scope.billaddresses && $scope.billaddresses.length > 0 && $scope.currentOrder) {
					// Filter to only billing addresses
					var billingAddresses = $scope.billaddresses.filter(function(addr) { return addr.IsBilling === true; });
					// If there's exactly one billing address, auto-select it
					// Force set it if force=true, otherwise only set if not already set
					if (billingAddresses.length === 1 && (force || !$scope.currentOrder.BillAddressID)) {
						$scope.currentOrder.BillAddressID = billingAddresses[0].ID;
						// Trigger validation after setting the address - wait for form to be available
						$timeout(function() {
							if ($scope.cart_billing) {
								// Mark the entire form as valid for billing address
								if ($scope.cart_billing.billingAddress) {
									$scope.cart_billing.billingAddress.$setValidity('required', true);
									$scope.cart_billing.billingAddress.$setValidity('ng-required', true);
								}
								// Also ensure form-level validation passes
								$scope.cart_billing.$setValidity('billingAddress', true);
							}
						}, 200);
					}
				}
			};

			// Watch for billaddresses changes
			$scope.$watch('billaddresses', function(billaddresses) {
				autoSetBillingAddress();
			}, true); // Deep watch to catch array changes

			// Also watch for currentOrder to be available
			$scope.$watch('currentOrder', function(currentOrder) {
				if (currentOrder) {
					autoSetBillingAddress();
					// Also check if BillAddressID gets cleared and restore it
					if (!currentOrder.BillAddressID) {
						autoSetBillingAddress(true);
					}
				}
			}, true);

			// Watch for BillAddressID being cleared and restore it
			$scope.$watch('currentOrder.BillAddressID', function(newValue, oldValue) {
				// If BillAddressID was cleared (had value, now doesn't), restore it
				if (oldValue && !newValue) {
					$timeout(function() {
						autoSetBillingAddress(true);
					}, 100);
				}
				if (newValue) {
					Address.get(newValue, function(add) {
						if ($scope.user.Permissions.contains('EditBillToName') && !add.IsCustEditable) {
							$scope.currentOrder.BillFirstName = add.FirstName;
							$scope.currentOrder.BillLastName = add.LastName;
						}
						$scope.BillAddress = add;
						// Ensure form validation passes
						$timeout(function() {
							if ($scope.cart_billing && $scope.cart_billing.billingAddress) {
								$scope.cart_billing.billingAddress.$setValidity('required', true);
							}
						}, 50);
					});
				}
			});

			$scope.$on('event:AddressCancel', function(event) {
				$scope.billaddressform = false;
			});

			// Ensure billing address is set before any order save operations
			// Listen for order save events
			$scope.$on('event:OrderSaving', function() {
				autoSetBillingAddress(true);
			});

			// Also ensure it's set on scope ready
			$timeout(function() {
				autoSetBillingAddress(true);
			}, 500);

			// Aggressively ensure billing address is always set
			// Watch currentOrder deeply and ensure BillAddressID is always set if available
			$scope.$watch(function() {
				// Return a value that changes when we need to check
				return $scope.currentOrder && $scope.currentOrder.ID ? $scope.currentOrder.ID + '_' + ($scope.currentOrder.BillAddressID || 'null') : null;
			}, function() {
				// Always ensure billing address is set
				autoSetBillingAddress(true);
			});

			// Intercept any order operations to ensure billing address is set
			// Listen for any scope broadcasts that might indicate order operations
			$scope.$on('$destroy', function() {
				// Ensure it's set one last time before directive is destroyed
				autoSetBillingAddress(true);
			});
		}]
	};
	return obj;
}]);

four51.app.directive('billingmessage', function() {
	var obj = {
		restrict: 'E',
		templateUrl: 'partials/messages/billing.html'
	};
	return obj;
});