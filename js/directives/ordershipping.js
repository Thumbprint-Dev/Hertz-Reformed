four51.app.directive('ordershipping', ['Order', 'Shipper', 'Address', 'AddressList', function(Order, Shipper, Address, AddressList) {
	var obj = {
		restrict: 'AE',
		templateUrl: 'partials/controls/orderShipping.html',
		controller: ['$scope', function($scope) {
			
			$scope.shipaddress = { Country: 'US', IsShipping: true, IsBilling: false };
			$scope.shippingAddressConfirmed = false;
			$scope.$on('event:AddressCancel', function() {
				$scope.shipaddressform = false;
			});
			$scope.$on('event:AddressSaved', function(event, address) {
				if (address.IsShipping) {
					$scope.currentOrder.ShipAddressID = address.ID;
					if (!$scope.shipToMultipleAddresses)
						$scope.setShipAddressAtOrderLevel();
					$scope.shipaddressform = false;
				}

		
				$scope.shipaddress = { Country: 'US', IsShipping: true, IsBilling: false };
			});

			var saveChanges = function(callback, error) {
				$scope.errorMessage = null;
				var auto = $scope.currentOrder.autoID;
				Order.save($scope.currentOrder,
					function(data) {
                        //Due to order save race condition, BillAddressID was being set to null
                        var billAddressID = $scope.currentOrder.BillAddressID;
						$scope.currentOrder = data;
                        $scope.currentOrder.BillAddressID = billAddressID;
						$scope.displayLoadingIndicator = false;
						if (auto) {
							$scope.currentOrder.autoID = true;
							$scope.currentOrder.ExternalID = 'auto';
						}
						if (callback) callback($scope.currentOrder);
					},
					function(ex) {
						if (auto)
							$scope.currentOrder.ExternalID = auto;
						$scope.errorMessage = ex.Message;
						$scope.shippingUpdatingIndicator = false;
						$scope.shippingFetchIndicator = false;
						if (error) error(ex);
					}
				);
			};

			Shipper.query($scope.currentOrder, function(list) {
				$scope.shippers = list;
				// sometimes the current shipper is not longer available. we need to clear the shipping information in that case
				var exists = false;
				angular.forEach(list, function(s) {
					if (!exists && $scope.currentOrder.LineItems[0].ShipperID == s.ID)
						exists = true;
				});
				if (!exists) {
					Order.clearshipping($scope.currentOrder);
				}
				// Default to FedEx Ground if no shipping method is selected
				if (list && list.length > 0 && !$scope.currentOrder.LineItems[0].ShipperName && !$scope.currentOrder.IsMultipleShip()) {
					var defaultShipper = null;
					// Look for FedEx Ground (case insensitive)
					angular.forEach(list, function(s) {
						if (!defaultShipper && s && s.Name && (s.Name.toLowerCase().indexOf('fedex ground') !== -1 || s.Name.toLowerCase().indexOf('fedexground') !== -1)) {
							defaultShipper = s;
						}
					});
					// Fallback to first shipper if FedEx Ground not found
					if (!defaultShipper) {
						defaultShipper = list[0];
					}
					if (defaultShipper) {
						$scope.currentOrder.LineItems[0].ShipperName = defaultShipper.Name;
						$scope.currentOrder.LineItems[0].ShipperID = defaultShipper.ID;
						$scope.currentOrder.Shipper = defaultShipper;
						$scope.currentOrder.ShipperName = defaultShipper.Name;
						$scope.currentOrder.ShipperID = defaultShipper.ID;
						// Set default for all line items
						angular.forEach($scope.currentOrder.LineItems, function(item) {
							item.ShipperName = defaultShipper.Name;
							item.ShipperID = defaultShipper.ID;
						});
						// Update shipper to save the default
						$scope.updateShipper();
					}
				}
			});

			$scope.setMultipleShipAddress = function() {
				$scope.currentOrder.forceMultipleShip(true);
				angular.forEach($scope.currentOrder.LineItems, function(li, i) {
					if (i == 0) return;
					li.ShipAddressID = null;
					li.ShipFirstName = null;
					li.ShipLastName = null;
					li.ShipperID = null;
					li.ShipperName = null;
					li.ShipAccount = null;
				});
			}

			$scope.setSingleShipAddress = function() {
				$scope.currentOrder.forceMultipleShip(false);
				angular.forEach($scope.currentOrder.LineItems, function(li) {
					li.ShipAddressID = $scope.currentOrder.LineItems[0].ShipAddressID;
					li.ShipFirstName = $scope.currentOrder.LineItems[0].ShipFirstName;
					li.ShipLastName = $scope.currentOrder.LineItems[0].ShipLastName;
					li.ShipperID = $scope.currentOrder.LineItems[0].ShipperID;
					li.ShipAccount = $scope.currentOrder.LineItems[0].ShipAccount;
				});
			};

			$scope.$watch('currentOrder.ShipAddressID', function(newValue) {
				$scope.orderShipAddress = {};
				if ($scope.currentOrder) {
					$scope.currentOrder.ShipFirstName = null;
					$scope.currentOrder.ShipLastName = null;
					angular.forEach($scope.currentOrder.LineItems, function(item) {
						item.ShipFirstName = null;
						item.ShipLastName = null;
					});
				}
				// Reset confirmation checkbox when address changes
				$scope.shippingAddressConfirmed = false;

				if (newValue) {
					Address.get(newValue, function(add) {
						if ($scope.user.Permissions.contains('EditShipToName') && !add.IsCustEditable) {
							angular.forEach($scope.currentOrder.LineItems, function(item) {
								item.ShipFirstName = add.FirstName;
								item.ShipLastName = add.LastName;
							});
						}
						$scope.orderShipAddress = add;
					});
                    if (!$scope.currentOrder.IsMultipleShip()) {
                        $scope.setShipAddressAtOrderLevel();
                    }
				}
			});

			$scope.$watch('currentOrder.LineItems[0].ShipFirstName', function(newValue) {
				var shipFirstName = newValue;
				if ($scope.currentOrder) {
					angular.forEach($scope.currentOrder.LineItems, function(item) {
						item.ShipFirstName = shipFirstName;
					});
				}
			});

			$scope.$watch('currentOrder.LineItems[0].ShipLastName', function(newValue) {
				var shipLastName = newValue;
				if ($scope.currentOrder) {
					angular.forEach($scope.currentOrder.LineItems, function(item) {
						item.ShipLastName = shipLastName;
					});
				}
			});

			$scope.setShipAddressAtLineItem = function(item) {
				item.ShipFirstName = null;
				item.ShipLastName = null;
				// Reset confirmation checkbox when address changes for this line item
				item.shippingAddressConfirmed = false;
					saveChanges(
					function(order) {
						Shipper.query(order,
							function(list) {
								$scope.shippers = list;
								// Default to FedEx Ground if no shipping method is selected for this line item
								if (list && list.length > 0 && !item.ShipperName && order.IsMultipleShip()) {
									var defaultShipper = null;
									// Look for FedEx Ground (case insensitive)
									angular.forEach(list, function(s) {
										if (!defaultShipper && s && s.Name && (s.Name.toLowerCase().indexOf('fedex ground') !== -1 || s.Name.toLowerCase().indexOf('fedexground') !== -1)) {
											defaultShipper = s;
										}
									});
									// Fallback to first shipper if FedEx Ground not found
									if (!defaultShipper) {
										defaultShipper = list[0];
									}
									if (defaultShipper) {
										item.ShipperName = defaultShipper.Name;
										item.ShipperID = defaultShipper.ID;
										item.Shipper = defaultShipper;
										// Update shipper to save the default for this line item
										$scope.updateShipper(item);
									}
								}
							}
						);
					},
					function(ex) {
						item.ShipAddressID = null;
					}
				);
			};

			$scope.setShipAddressAtOrderLevel = function() {
				$scope.shippingFetchIndicator = true;
				$scope.currentOrder.ShipperName = null;
				$scope.currentOrder.Shipper = null;
				$scope.currentOrder.ShipperID = null;
				angular.forEach($scope.currentOrder.LineItems, function(li) {
					li.ShipAddressID = $scope.currentOrder.ShipAddressID;
					li.ShipFirstName = null;
					li.ShipLastName = null;
					li.ShipperName = null;
					li.Shipper = null;
					li.ShipperID = null;
				});
				saveChanges(
					function(order) {
						Shipper.query(order, function(list) {
							$scope.shippers = list;
							// Default to FedEx Ground if no shipping method is selected
							if (list && list.length > 0 && !$scope.currentOrder.LineItems[0].ShipperName && !$scope.currentOrder.IsMultipleShip()) {
								var defaultShipper = null;
								// Look for FedEx Ground (case insensitive)
								angular.forEach(list, function(s) {
									if (!defaultShipper && s && s.Name && (s.Name.toLowerCase().indexOf('fedex ground') !== -1 || s.Name.toLowerCase().indexOf('fedexground') !== -1)) {
										defaultShipper = s;
									}
								});
								// Fallback to first shipper if FedEx Ground not found
								if (!defaultShipper) {
									defaultShipper = list[0];
								}
								if (defaultShipper) {
									$scope.currentOrder.LineItems[0].ShipperName = defaultShipper.Name;
									$scope.currentOrder.LineItems[0].ShipperID = defaultShipper.ID;
									$scope.currentOrder.Shipper = defaultShipper;
									$scope.currentOrder.ShipperName = defaultShipper.Name;
									$scope.currentOrder.ShipperID = defaultShipper.ID;
									// Set default for all line items
									angular.forEach($scope.currentOrder.LineItems, function(item) {
										item.ShipperName = defaultShipper.Name;
										item.ShipperID = defaultShipper.ID;
									});
									// Update shipper to save the default
									$scope.updateShipper();
								}
							}
							$scope.shippingFetchIndicator = false;
							}
						);
					},
					function(ex) {
						$scope.currentOrder.ShipAddressID = null;
						angular.forEach($scope.currentOrder.LineItems, function(li) {
							li.ShipAddressID = null;
						});
					}
				);
			};
			$scope.updateShipper = function(li) {
				$scope.shippingUpdatingIndicator = true;
				$scope.shippingFetchIndicator = true;
				if (!li) { // at the order level
					angular.forEach($scope.shippers, function(s) {
						if (s.Name == $scope.currentOrder.LineItems[0].ShipperName)
							$scope.currentOrder.Shipper = s;
					});

					angular.forEach($scope.currentOrder.LineItems, function(item) {
						item.ShipperName = $scope.currentOrder.Shipper ? $scope.currentOrder.Shipper.Name : null;
						item.ShipperID = $scope.currentOrder.Shipper ? $scope.currentOrder.Shipper.ID : null;
					});

					saveChanges(function() {
						$scope.shippingUpdatingIndicator = false;
						$scope.shippingFetchIndicator = false;
					});
				}
				else { // at the lineitem level for multiple shipping
					angular.forEach($scope.shippers, function(s) {
						if (s.Name == li.ShipperName)
							li.Shipper = s;
					});
					if (li.Shipper.Name) li.ShipperName = li.Shipper.Name;
					if (li.Shipper.ID) li.ShipperID = li.Shipper.ID;
					saveChanges(function() {
						$scope.shippingUpdatingIndicator = false;
						$scope.shippingFetchIndicator = false;
					});
				}
			};

			$scope.$on('event:AddressCancel', function(event) {
				$scope.addressform = false;
			});
		}]
	};
	return obj;
}]);

four51.app.directive('shippingmessage', function() {
	var obj = {
		restrict: 'E',
		templateUrl: 'partials/messages/shipping.html'
	};
	return obj;
});
