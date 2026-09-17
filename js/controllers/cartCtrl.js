four51.app.controller('CartViewCtrl', ['$scope', '$routeParams', '$location', '$451', 'Order', 'OrderConfig', 'User', 'Punchout', '$sce', '$timeout', '$window',
function ($scope, $routeParams, $location, $451, Order, OrderConfig, User, Punchout, $sce, $timeout, $window) {
	//Punchout
	if($scope.PunchoutUser){
		$scope.punchouturl = $sce.trustAsResourceUrl(Punchout.punchoutSession.PunchOutPostURL);
	}
	$scope.submitPunchoutOrder = function () {
	    $scope.submitClicked = true;
		$scope.saveChanges(function (data) {
			Punchout.save($scope.currentOrder.ID, function(){
				Punchout.getForm(function (form) {
					$scope.punchoutForm = form;
					$timeout(function () {
						store.remove('punchoutconfig');
						$window.document.getElementById('punchoutForm').submit();
					}, 10);
				},function (err) {
					$scope.errorMessage = err.Message;
					$scope.submitClicked = false;
				});
			},function(ex){
				$scope.errorMessage = ex.Message;
				$scope.submitClicked = false;
			});
		}, true);
	};
    
	// `$scope.user &&` guards a dereference that runs at construction.
	//
	// `$scope.user` is loaded asynchronously by Four51Ctrl, inside the User.get callback, so
	// it is there when you click through from another page and absent when you reload this
	// one. The `$routeParams` test short-circuits on routes with no order id, which is why
	// this never showed up on the common path — but on the routes that DO carry one it
	// threw, killed the controller, and rendered a header and a footer with nothing between
	// them. That is exactly how checkout came to be broken.
	//
	// Failing to `false` is the safe direction: without knowing who the user is, do not
	// grant them approval-editing powers.
	$scope.isEditforApproval = $routeParams.id != null && $scope.user && $scope.user.Permissions.contains('EditApprovalOrder');
	if ($scope.isEditforApproval) {
		Order.get($routeParams.id, function(order) {
			$scope.currentOrder = order;
			// add cost center if it doesn't exists for the approving user
			var exists = false;
			angular.forEach(order.LineItems, function(li) {
				angular.forEach($scope.user.CostCenters, function(cc) {
					if (exists) return;
					exists = cc == li.CostCenter;
				});
				if (!exists) {
					$scope.user.CostCenters.push({
						'Name': li.CostCenter
					});
				}
			});
		});
	}
	

    

	$scope.currentDate = new Date();
	$scope.errorMessage = null;
	$scope.continueShopping = function() {
		if (!$scope.cart.$invalid) {
			if (confirm('Do you want to save changes to your order before continuing?') == true)
				$scope.saveChanges(function() { $location.path('catalog') });
		}
		else
			$location.path('catalog');
	};

	$scope.cancelOrder = function() {
		if (confirm('Are you sure you wish to cancel your order?') == true) {
			$scope.displayLoadingIndicator = true;
			$scope.actionMessage = null;
			Order.delete($scope.currentOrder,
				function(){
					$scope.currentOrder = null;
					$scope.user.CurrentOrderID = null;
					User.save($scope.user, function(){
						$location.path('catalog');
					});
					$scope.displayLoadingIndicator = false;
					$scope.actionMessage = 'Your Changes Have Been Saved';
				},
				function(ex) {
					$scope.actionMessage = 'An error occurred: ' + ex.Message;
					$scope.displayLoadingIndicator = false;
				}
			);
		}
	};

	$scope.saveChanges = function(callback) {
		$scope.actionMessage = null;
		$scope.errorMessage = null;
		if($scope.currentOrder.LineItems.length == $451.filter($scope.currentOrder.LineItems, {Property:'Selected', Value: true}).length) {
			$scope.cancelOrder();
		}
		else {
			$scope.displayLoadingIndicator = true;
			OrderConfig.address($scope.currentOrder, $scope.user);
			Order.save($scope.currentOrder,
				function(data) {
					$scope.currentOrder = data;
					$scope.displayLoadingIndicator = false;
					if (callback) callback();
					$scope.actionMessage = 'Your Changes Have Been Saved';
				},
				function(ex) {
					$scope.errorMessage = ex.Message;
					$scope.displayLoadingIndicator = false;
				}
			);
		}
	};

	$scope.removeItem = function(item) {
		if (confirm('Are you sure you wish to remove this item from your cart?') == true) {
			Order.deletelineitem($scope.currentOrder.ID, item.ID,
				function(order) {
					$scope.currentOrder = order;
					Order.clearshipping($scope.currentOrder);
					if (!order) {
						$scope.user.CurrentOrderID = null;
						User.save($scope.user, function(){
							$location.path('catalog');
						});
					}
					$scope.displayLoadingIndicator = false;
					$scope.actionMessage = 'Your Changes Have Been Saved';
				},
				function (ex) {
					$scope.errorMessage = ex.Message.replace(/\<<Approval Page>>/g, 'Approval Page');
					$scope.displayLoadingIndicator = false;
				}
			);
		}
	}

	$scope.checkOut = function() {
		$scope.displayLoadingIndicator = true;
		if (!$scope.isEditforApproval)
			OrderConfig.address($scope.currentOrder, $scope.user);
		Order.save($scope.currentOrder,
			function(data) {
				$scope.currentOrder = data;
                $location.path($scope.isEditforApproval ? 'checkout/' + $routeParams.id : 'checkout');
				$scope.displayLoadingIndicator = false;
			},
			function(ex) {
				$scope.errorMessage = ex.Message;
				$scope.displayLoadingIndicator = false;
			}
		);
	};

	$scope.$watch('currentOrder.LineItems', function(newval) {
		var newTotal = 0;
		if (!$scope.currentOrder) return newTotal;
		angular.forEach($scope.currentOrder.LineItems, function(item){
			if (item.IsKitParent)
				$scope.cart.$setValidity('kitValidation', !item.KitIsInvalid);
			newTotal += item.LineTotal;
		});
		$scope.currentOrder.Subtotal = newTotal;
	}, true);

	$scope.copyAddressToAll = function() {
		angular.forEach($scope.currentOrder.LineItems, function(n) {
			n.DateNeeded = $scope.currentOrder.LineItems[0].DateNeeded;
		});
	};

	$scope.copyCostCenterToAll = function() {
		angular.forEach($scope.currentOrder.LineItems, function(n) {
			n.CostCenter = $scope.currentOrder.LineItems[0].CostCenter;
		});
	};

	$scope.onPrint = function()  {
		window.print();
	};

	$scope.cancelEdit = function() {
		$location.path('order');
	};

    $scope.downloadProof = function(item) {
        window.location = item.Variant.ProofUrl;
    };
}]);
