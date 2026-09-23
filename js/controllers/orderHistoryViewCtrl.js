four51.app.controller('OrderViewCtrl', ['$scope', '$location', '$routeParams', 'Order', 'FavoriteOrder', 'Address', 'User', 'Variant', 'Allocation',
	function ($scope, $location, $routeParams, Order, FavoriteOrder, Address, User, Variant, Allocation) {
		$scope.loadingIndicator = true;

		/** Garments, not lines: five polos on one line are five items to the person who ordered them. */
		$scope.units = function() {
			var n = 0;
			angular.forEach(($scope.order && $scope.order.LineItems) || [], function(li) { n += li.Quantity || 0; });
			return n;
		};

		/** Who the parcel is addressed to: the name on the line, else the name on the address. */
		$scope.shipName = function() {
			var o = $scope.order;
			if (!o) return '';
			var li = (o.LineItems || [])[0] || {};
			var name = [li.ShipFirstName, li.ShipLastName].filter(Boolean).join(' ');
			if (name) return name;
			var a = o.ShipAddress || {};
			return [a.FirstName, a.LastName].filter(Boolean).join(' ');
		};

		/**
		 * Whether this order can be sent back. A placed order that has not been cancelled; the
		 * return form itself decides which of its lines still have anything returnable.
		 */
		var NOT_RETURNABLE = ['Unsubmitted', 'AwaitingApproval', 'Declined', 'Canceled', 'Cancelled'];
		$scope.canReturn = function() {
			var o = $scope.order;
			return !!(o && o.ID && Allocation.isEnabled() && NOT_RETURNABLE.indexOf(o.Status) === -1);
		};

		$scope.isInPath = function(path) {
			var cur_path = $location.path().replace('/', '');
			var result = false;

			if(cur_path.indexOf(path) > -1) {
				result = true;
			}
			else {
				result = false;
			}
			return result;
		};

		Order.get($routeParams.id, function(data){
			$scope.loadingIndicator = false;
			$scope.order = data;
			$scope.order.recent = $scope.isInPath("new");
			$scope.hasSpecsOnAnyLineItem = false;
			for(var i = 0; i < data.LineItems.length ; i++) {
				if (data.LineItems[i].Specs) {
					$scope.hasSpecsOnAnyLineItem = true;
					break;
				}
			}

			if ($scope.order.IsMultipleShip()) {
				angular.forEach(data.LineItems, function(item) {
					if (item.ShipAddressID) {
						Address.get(item.ShipAddressID, function(add) {
							item.ShipAddress = add;
						});
					}
				});
			}
			else {
				Address.get(data.ShipAddressID || data.LineItems[0].ShipAddressID, function(add) {
					data.ShipAddress = add;
				});
			}

			// Only when there is one: asking for a null id came back as an empty address object,
			// which the page printed as a heading over a lone comma.
			if (data.BillAddressID) {
				Address.get(data.BillAddressID, function(add){
					data.BillAddress = add;
				});
			}
			if(data.HasShipments){
				Order.listShipments(data, function(data){
					$scope.shipments = data;
				})
			}
		}, true);

		$scope.saveFavorite = function(callback) {
			$scope.displayLoadingIndicator = true;
			$scope.errorMessage = null;
			$scope.actionMessage = null;
			FavoriteOrder.save($scope.order,
				function() {
					$scope.displayLoadingIndicator = false;
					if (callback) callback($scope.order);
					$scope.actionMessage = "Your order has been saved as a Favorite";
				},
				function(ex) {
					$scope.errorMessage = ex.Message;
				}
			);
		};

		$scope.repeatOrder = function() {
			$scope.errorMessage = null;
			$scope.actionMessage = null;
			Order.repeat($scope.order.ID,
				function(data) {
					$scope.currentOrder = data;
					$scope.user.CurrentOrderID = data.ID;
					User.save($scope.user, function(data){
						$scope.user = data;
						$location.path('/cart');
					});
				},
				function(ex) {
					$scope.errorMessage = ex.Message;
				}
			);
		};

		$scope.setCurrent = function() {
			$scope.errorMessage = null;
			$scope.actionMessage = null;
			User.setcurrentorder($scope.order.ID,
				function(data) {
					$scope.user = data;
					Order.get(data.CurrentOrderID, function(order) {
						$scope.currentOrder = order;
						$location.path('/cart');
					});
				},
				function(ex) {
					$scope.errorMessage = ex.Message;
				}
			)
		};

		$scope.onPrint = function()  {
			window.print();
		};

        $scope.downloadProof = function(item) {
            $scope.errorMessage = null;
            Variant.get({VariantInteropID: item.Variant.InteropID, ProductInteropID: item.Product.InteropID }, function(v) {
                if (v.ProofUrl) {
                    window.location = v.ProofUrl;
                }
                else {
                    $scope.errorMessage = "Unable to download proof"
                }
            });
        };
	}]);