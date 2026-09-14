angular.module('OrderCloud-ContentModal3', []); 

angular.module('OrderCloud-ContentModal3')
    .directive('contentmodal3', contentmodal3)
    .controller('ContentModalCtrl3', ContentModalCtrl3)
;

function contentmodal3() {
    var directive = {
        restrict: 'E',
        template: template,
        controller: 'ContentModalCtrl3'
    };
    return directive;

    function template() {
        return [
            '<style>',
            //this style is conditional based on nav placement and site css
            'contentmodal a, contentmodal a:hover, contentmodal a:focus {color:#fff; text-decoration:none;}',
            '</style>',
            // update the size of the modal window within the open()
            '<a class="hidden" ng-click="open3(500)">',
            // replace the *Open Modal* below with your link name
            '<span class="fa fa-info-circle hidden"></span> {{\'Open Modal\' | r | xlat}}',
            '</a>'
        ].join('');
    }
}

ContentModalCtrl3.$inject = ['$scope', '$route', '$location', '$modal', 'Product', 'Order', 'Category', 'User'];
function ContentModalCtrl3($scope, $route, $location, $modal, Product, Order, Category, User) {

    $scope.animationsEnabled = true;

    $scope.open3 = function (size) {

        var modalInstance = $modal.open({
            animation: $scope.animationsEnabled,
            backdrop: true,
            backdropClick: true,
            dialogFade: false,
            keyboard: true,
            size: size,
            template: contentmodal3open,
            controller: ContentModalOpenCtrl3,
            resolve: {
                item: function () {
                    //pass a scope variable into the modal content. in this case we are providing line item as an example for product use
                    return $scope.LineItem;
                }
            }
        });

        function contentmodal3open() {
            return [
              '<style>',
              '.modal-header {background-color:#f5f5f5;border-bottom: 1px solid #ccc; min-height: 36px; padding: 2px;}',
              '.modal-header h3 { margin-top:0;}',
              '.modal-header h5 { font-size:1.16em; font-weight:bold; padding:5px 10px; text-shadow: 0 1px 0 #ffffff;}',
              '.modal-header a.close {margin:0;padding:0;position:absolute;top:8px;right:10px;font-size:1.5em;color:#000;}',
              '.modal-body {width:100%; margin:0 auto; padding:10px 25px;}',
              '.modal-content {padding: 30px;}',
              '.modal-dialog {width: fit-content;}',
              '</style>',
              '<div class="modal-header" style="background-color: white;border-bottom: none;">',
                '<a class="pull-right close" ng-click="close()">',
                  '<i class="fa fa-times"></i>',
                  '</a>',
                '</div>',
              '<div class="modal-body">',
                '<div class="row">',
                  '<div class="col-xs-12 col-md-12">',
                    '<h1 class="product-modal-message">ADDED TO CART</h1>',
                    '<div class="secondary-title product-modal-title">{{item.Product.Name}}</div>',
                    // '<div class="item-info">',
                    //   '<p>{{item.Product.ExternalID}}</p>',
                    //   '<p>ITEM SUBTOTAL: {{(item.LineTotal || variantitemsOrderTotal) | culturecurrency}}</p>',
                    //   '</div>',
                    // '</div>',
                  // '<div class="col-xs-12 col-md-6 col-md-offset-1">',
                  //   '<figure>',
                  //     '<img id="451_img_prod_lg" class="product-image-large img-responsive" ng-src="{{item.Variant.PreviewUrl || item.Variant.LargeImageUrl || item.Product.LargeImageUrl}}" imageonload />',
                  //     '</figure>',
                  //   '</div>',
                  '</div>',
                '</div>',
                '<br/>',
              //Optional footer
              // '<div class="modal-footer">',
                '<div class="">',
                  '<div class="stacked-buttons-product">',
                    '<div class="row" style="text-align: center;">',
                      '<div class="col-xs-12">',
                        '<button class="btn btn-info back" type="button" id="451_btn_orderadd" ng-click="ok()">',
                          'View Cart & Checkout',
                          '</button>',
                        '</div>',
                      // '<div class="col-xs-6">',
                      //   '<button class="btn btn-info" type="button" id="451_btn_orderadd" ng-click="continueToCart()">',
                      //     'View Cart & Checkout',
                      //     '</button>',
                      //   '</div>',
                      '</div>',
                    '</div>',
                  '</div>',
                // '</div>',
              // '</div>'
            ].join('');
        }

        $scope.toggleAnimation = function () {
            $scope.animationsEnabled = !$scope.animationsEnabled;
        };

    };


    var ContentModalOpenCtrl3 = ['$scope', '$routeParams', '$modalInstance', '$modal', 'item', 'Product', 'Category', 'User', function($scope, $routeParams, $modalInstance, $modal, item, Product, Category, User) {

        $scope.item = item; // this is the item passed in from the ContentModalCtrl resolve

         Category.get($routeParams.categoryInteropID, function(cat) {
            $scope.currentCategory = cat;
	        $scope.categoryLoadingIndicator = false;
         })
        
        
        User.get(function(user) {
            $scope.user = user;
        });
        

        $scope.close = function () {
            $modalInstance.close();
        };

        $scope.cancel = function () {
            $modalInstance.dismiss('cancel');
        };
        

        $scope.continueToCart = function() {
            
               // clear fields
                $scope.user.CustomFields.forEach(function(item) {
                    if (item.Name == 'AdaptHealth_FirstName') {
                        item.Value = null;
                      }
                      if (item.Name == 'AdaptHealth_LastName') {
                        item.Value = null;
                      }
                      if (item.Name == 'AdaptHealth_SalesKit_Bags') {
                        item.Value = '';
                      }
                      if (item.Name == 'AdaptHealth_SalesKit_Polos') {
                        item.Value = '';
                      }
                      if (item.Name == 'AdaptHealth_PoloSize') {
                        item.Value = '';
                      }
                });
                // console.log('Location Clear', $scope.user.CustomFields[0].Value);
          
              $scope.actionMessage = null;
              $scope.securityWarning = false;
              $scope.user.Username = $scope.user.TempUsername;
              $scope.displayLoadingIndicator = true;
              if ($scope.user.Type == 'TempCustomer')
                $scope.user.ConvertFromTempUser = true;
          
                // console.log('Content Modal');
          
              User.save($scope.user,
                function(u) {
                  $scope.securityWarning = false;
                  $scope.displayLoadingIndicator = false;
                  $scope.actionMessage = 'Your changes have been saved';
                  $scope.user.TempUsername = u.Username;
                //   if (_AnonRouter && !$scope.existingUser) _AnonRouter.route();
                
                },
                function(ex) {
                  $scope.displayLoadingIndicator = false;
                  if (ex.Code.is('PasswordSecurity'))
                    $scope.securityWarning = true;
                  else {
                    $scope.actionMessage = $sce.trustAsHtml(ex.Message);
                  }
                }
              );

             $scope.ok();
             $location.path('cart');
            };

          $scope.ok = function () {
              $location.path('cart');
            // clear fields
                $scope.user.CustomFields.forEach(function(item) {
                  if (item.Name == 'AdaptHealth_FirstName') {
                    item.Value = null;
                  }
                  if (item.Name == 'AdaptHealth_LastName') {
                    item.Value = null;
                  }
                  if (item.Name == 'AdaptHealth_SalesKit_Bags') {
                    item.Value = '';
                  }
                  if (item.Name == 'AdaptHealth_SalesKit_Polos') {
                    item.Value = '';
                  }
                  if (item.Name == 'AdaptHealth_PoloSize') {
                    item.Value = '';
                  }
                });
                // console.log('Location Clear', $scope.user.CustomFields[0].Value);
            
          
              $scope.actionMessage = null;
              $scope.securityWarning = false;
              $scope.user.Username = $scope.user.TempUsername;
              $scope.displayLoadingIndicator = true;
              if ($scope.user.Type == 'TempCustomer')
                $scope.user.ConvertFromTempUser = true;
          
                // console.log('Content Modal');
          
              User.save($scope.user,
                function(u) {
                  $scope.securityWarning = false;
                  $scope.displayLoadingIndicator = false;
                  $scope.actionMessage = 'Your changes have been saved';
                  $scope.user.TempUsername = u.Username;
                //   if (_AnonRouter && !$scope.existingUser) _AnonRouter.route();
                
                },
                function(ex) {
                  $scope.displayLoadingIndicator = false;
                  if (ex.Code.is('PasswordSecurity'))
                    $scope.securityWarning = true;
                  else {
                    $scope.actionMessage = $sce.trustAsHtml(ex.Message);
                  }
                }
              );
              
            $modalInstance.close($scope.currentOrder);
          };

          $scope.cancel = function () {
            $modalInstance.dismiss('cancel');
          };

    }];
}
