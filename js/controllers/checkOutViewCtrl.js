four51.app.controller('CheckOutViewCtrl', ['$scope', '$routeParams', '$location', '$filter', '$rootScope', '$451', 'User', 'Order', 'OrderConfig', 'FavoriteOrder', 'AddressList', 'GoogleAnalytics',
  function ($scope, $routeParams, $location, $filter, $rootScope, $451, User, Order, OrderConfig, FavoriteOrder, AddressList, GoogleAnalytics) {
    $scope.errorSection = '';

    /**
     * Everything here that needs an order, in one place, run once the order exists.
     *
     * `currentOrder` and `user` are both loaded asynchronously by Four51Ctrl, inside the
     * `User.get` callback. Reaching checkout by clicking through from the cart, they are
     * already on the scope. Reaching it by a reload, a bookmark, a shared link or the
     * round trip back from SSO, they are not.
     *
     * This controller used to set `currentOrder.PaymentMethod` on its first statement.
     * With no order that threw, which killed the controller before Angular could link the
     * view, and the checkout route rendered a header and a footer with nothing between
     * them. A guard for exactly this case already existed eleven lines below — too late to
     * help, because the dereference above it had already thrown.
     *
     * "Not loaded yet" and "there is no order" are different answers. Only the second one
     * belongs at the catalogue; treating the first that way bounces someone out of
     * checkout for the crime of refreshing the page.
     */
    function startCheckout(order) {
      order.PaymentMethod = 'PurchaseOrder';

      $scope.isEditforApproval =
        $routeParams.id != null &&
        $scope.user && $scope.user.Permissions &&
        $scope.user.Permissions.contains('EditApprovalOrder');

      if ($scope.isEditforApproval) {
        Order.get($routeParams.id, function(loaded) {
          $scope.currentOrder = loaded;
        });
      }

      $scope.hasOrderConfig = OrderConfig.hasConfig(order, $scope.user);
      $scope.checkOutSection = $scope.hasOrderConfig ? 'order' : 'shipping';
      $scope.checkoutReady = true;
    }

    if ($scope.currentOrder) {
      startCheckout($scope.currentOrder);
    } else {
      // `undefined` is "Four51Ctrl has not answered yet"; `null` is its answer that there
      // is no open order. Wait for the first, redirect on the second.
      var stopWaiting = $scope.$watch('currentOrder', function(order) {
        if (order === undefined) return;
        stopWaiting();
        if (order === null) {
          $location.path('catalog');
          return;
        }
        startCheckout(order);
      });
    }

if ($scope.conSpringUser == true || $scope.conOfficeSpringUser === true) {
  // Watch for changes to Total
  $scope.$watch('currentOrder.Total', function(total) {
    if (!$scope.currentOrder) return;

    if ($scope.currentOrder.BudgetAccountID) {
      budgetAccountCalculation($scope.currentOrder.BudgetAccountID);
    }

    if (total > 0 && !$scope.currentOrder.Coupon) {
      console.log('setting to CreditCard');
      $scope.currentOrder.PaymentMethod = 'CreditCard';
    } else if (total === 0 && $scope.currentOrder.Coupon != null) {
      console.log('setting to PurchaseOrder');
      $scope.currentOrder.PaymentMethod = 'PurchaseOrder';
    }
  });

  // Watch for changes to Coupon
  $scope.$watch('currentOrder.Coupon', function(coupon) {
    if (!$scope.currentOrder) return;

    const total = $scope.currentOrder.Total;

    if (coupon != null && total === 0) {
      console.log('Coupon applied and total is 0, setting to PurchaseOrder');
      $scope.currentOrder.PaymentMethod = 'PurchaseOrder';
    } else if (total > 0 && !coupon) {
      console.log('Coupon removed or null, total > 0, setting to CreditCard');
      $scope.currentOrder.PaymentMethod = 'CreditCard';
    }
  });
}



  
      // hasOrderConfig / checkOutSection moved into startCheckout() above: both read the
      // order, so both have to wait for it.

      function submitOrder() {
        $scope.displayLoadingIndicator = true;
      $scope.submitClicked = true;
        $scope.errorMessage = null;
          Order.submit($scope.currentOrder,
            function(data) {
          if ($scope.user.Company.GoogleAnalyticsCode) {
            GoogleAnalytics.ecommerce(data, $scope.user);
          }
          $scope.user.CurrentOrderID = null;
          User.save($scope.user, function(data) {
                $scope.user = data;
                    $scope.displayLoadingIndicator = false;
              });
              $scope.currentOrder = null;
          $location.path('/order/new/' + data.ID);
            },
            function(ex) {
          $scope.submitClicked = false;
              $scope.errorMessage = ex.Message;
              $scope.displayLoadingIndicator = false;
              $scope.shippingUpdatingIndicator = false;
              $scope.shippingFetchIndicator = false;
            }
          );
      };
  
    $scope.$watch('currentOrder.CostCenter', function() {
      // Fires once at registration, when there may be no order yet.
      if (!$scope.currentOrder) return;
      OrderConfig.address($scope.currentOrder, $scope.user);
    });
  
    $scope.$watch('currentOrder.LineItems',function(item){
      if(!item)return;
      if($scope.user.ShipMethod && $scope.user.ShipMethod.DefaultShipperAccountNumber){
        angular.forEach($scope.currentOrder.LineItems, function(li){
          li.ShipAccount = $scope.user.ShipMethod.DefaultShipperAccountNumber;
        });
      }
    });
  
    $scope.$watch('currentOrder.LineItems[0].ShipAccount',function(val){
      if(!val)return;
      if(!$scope.currentOrder.IsMultipleShip()){
        angular.forEach($scope.currentOrder.LineItems, function(li){
          li.ShipAccount = val;
        });
      }
    });
  
      function saveChanges(callback) {
        $scope.displayLoadingIndicator = true;
        $scope.errorMessage = null;
        $scope.actionMessage = null;
        var auto = $scope.currentOrder.autoID;
      var cache = angular.copy($scope.currentOrder);
        Order.save($scope.currentOrder,
            function(data) {
              $scope.currentOrder = data;
          if(cache.CreditCard){
            $scope.currentOrder.CreditCard = cache.CreditCard;
          }
          if(cache.ExternalOrderDetailRecipients){
            $scope.currentOrder.ExternalOrderDetailRecipients = cache.ExternalOrderDetailRecipients;
          }
              if (auto) {
                $scope.currentOrder.autoID = true;
                $scope.currentOrder.ExternalID = 'auto';
              }
              $scope.displayLoadingIndicator = false;
              if (callback) callback($scope.currentOrder);
              else{
            $scope.actionMessage = "Your changes have been saved";
          }
            },
            function(ex) {
              $scope.currentOrder.ExternalID = null;
              $scope.errorMessage = ex.Message;
              $scope.displayLoadingIndicator = false;
              $scope.shippingUpdatingIndicator = false;
              $scope.shippingFetchIndicator = false;
              // `submitOrder` sets `submitClicked` and then calls this. Every other
              // indicator was cleared here but not that one, so a save that failed during
              // submit left the button reading "Submitting…" and disabled for good: the
              // error told you what went wrong and then gave you no way to try again short
              // of reloading. The inner Order.submit handler already resets it; this is the
              // path that did not.
              $scope.submitClicked = false;
            }
          );
      };
  
      $scope.continueShopping = function() {
        if (confirm('Do you want to save changes to your order before continuing?') == true)
            saveChanges(function() { $location.path('catalog') });
          else
          $location.path('catalog');
      };
  
      $scope.cancelOrder = function() {
        if (confirm('Are you sure you wish to cancel your order?') == true) {
          $scope.displayLoadingIndicator = true;
            Order.delete($scope.currentOrder,
              function() {
                  $scope.user.CurrentOrderID = null;
                  $scope.currentOrder = null;
                User.save($scope.user, function(data) {
                  $scope.user = data;
                  $scope.displayLoadingIndicator = false;
                  $location.path('catalog');
                });
              },
              function(ex) {
                $scope.actionMessage = ex.Message;
                $scope.displayLoadingIndicator = false;
              }
            );
        }
      };
  
      $scope.saveChanges = function() {
          saveChanges();
      };
  
    $scope.submitOrder = function() {
      $scope.submitClicked = true;
      saveChanges(function(data){
        submitOrder();
      });
    };
  
      $scope.saveFavorite = function() {
          FavoriteOrder.save($scope.currentOrder);
      };
  
    $scope.cancelEdit = function() {
      $location.path('order');
    };
  }]);
  
