four51.app.directive('productmodal', function() {
    var obj = {
        restrict: "E",
        templateUrl:'partials/productModal.html'
    };

    return obj;
});

four51.app.controller('productModalCtrl', function ($scope, $modalInstance, lineitem, user, display, currentOrder, ProductDisplayService, Order, User, $location) {
	
	$scope.TempLineItem = lineitem;
	$scope.settings = {
	    currentPage: 1,
	    pageSize: 20
	};
	$scope.LineItem = {};
	$scope.currentOrder = currentOrder;
	$scope.user = user;
	$scope.variantID = null;

    $scope.addToOrderText = 'Add To Cart';

	function setDefaultQty(lineitem) {
		if (lineitem.PriceSchedule && lineitem.PriceSchedule.DefaultQuantity != 0)
			$scope.LineItem.Quantity = lineitem.PriceSchedule.DefaultQuantity;
    }

	function getLineItemDetails(instruction) {
		ProductDisplayService.getProductAndVariant($scope.TempLineItem.Product.InteropID, $scope.variantID, function (data) {
			if (instruction == 'keep open state') {
				$scope.LineItem = {
					VariantList: {
						open: true
					}
				}
			}
			else {
				$scope.LineItem = {};
			}
			$scope.LineItem.Product = data.product;
			if ($scope.variantID) {
				$scope.LineItem.Variant = data.variant;
				$scope.Variant = data.variant;
			}
			else {
				$scope.Variant = {};
				$scope.Variant.ProductInteropID = $scope.LineItem.Product.InteropID;
				$scope.Variant.Specs = {};
				angular.forEach($scope.LineItem.Product.Specs, function(item){
					if(!item.CanSetForLineItem)
					{
						$scope.Variant.Specs[item.Name] = item;
					}
				});
			}
			ProductDisplayService.setNewLineItemScope($scope);
			ProductDisplayService.setProductViewScope($scope);
			setDefaultQty($scope.LineItem);
			$scope.setAddToOrderErrors();
		}, $scope.settings.currentPage, $scope.settings.pageSize, $scope.searchTerm);
	};
	getLineItemDetails();

	$scope.addToOrder = function(){
		if($scope.lineItemErrors && $scope.lineItemErrors.length){
			$scope.showAddToCartErrors = true;
			return;
		}
		if(!$scope.currentOrder){
			$scope.currentOrder = { };
			$scope.currentOrder.LineItems = [];
		}
		if (!$scope.currentOrder.LineItems)
			$scope.currentOrder.LineItems = [];
		if($scope.allowAddFromVariantList){
			angular.forEach($scope.variantLineItems, function(item){
				if(item.Quantity > 0){
					$scope.currentOrder.LineItems.push(item);
					$scope.currentOrder.Type = item.PriceSchedule.OrderType;
				}
			});
		}else{
			$scope.currentOrder.LineItems.push($scope.LineItem);
			$scope.currentOrder.Type = $scope.LineItem.PriceSchedule.OrderType;
		}
		$scope.addToOrderIndicator = true;
		//$scope.currentOrder.Type = (!$scope.LineItem.Product.IsVariantLevelInventory && $scope.variantLineItems) ? $scope.variantLineItems[$scope.LineItem.Product.Variants[0].InteropID].PriceSchedule.OrderType : $scope.LineItem.PriceSchedule.OrderType;
		// shipper rates are not recalcuated when a line item is added. clearing out the shipper to force new selection, like 1.0
		Order.clearshipping($scope.currentOrder).
			save($scope.currentOrder,
				function(o){
					$scope.user.CurrentOrderID = o.ID;
					$scope.currentOrder = o;
					User.save($scope.user, function(){
						$scope.addToOrderIndicator = false;
						$scope.message = 'Added To Cart';
						$scope.display = 'added to cart';
					});
				},
				function(ex) {
					$scope.addToOrderIndicator = false;
					$scope.lineItemErrors.push(ex.Detail ? ex.Detail : ex.Message);
					$scope.showAddToCartErrors = true;
					//$route.reload();
				}
		);
    };
    
	$scope.$watch('settings.currentPage', function(n, o) {
		if (n != o || (n == 1 && o == 1)) {
			console.log(n);
			console.log(o);
			getLineItemDetails('keep open state');
		}
	});

	$scope.identifyDisplay = function() {
	    if (display) {
	        $scope.display = display;
	    }
	    else {
    		// Used for standard ordering of product
    		$scope.display = 'normal order';
	    }
	};
	$scope.identifyDisplay();

	$scope.continueToCart = function() {
		$scope.ok();
		$location.path('cart');
	};
	
    $scope.ok = function () {
    	$modalInstance.close($scope.currentOrder);
    };

    $scope.cancel = function () {
    	$modalInstance.dismiss('cancel');
    };
    // When the user clicks anywhere outside of the modal, close it
// window.onclick = function(event) {
//   if (event.target == modal) {
//     modal.style.display = "none";
//   }
// }
});
