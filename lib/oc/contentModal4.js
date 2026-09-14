angular.module('OrderCloud-ContentModal4', []); 

angular.module('OrderCloud-ContentModal4')
    .directive('contentmodal4', contentmodal4)
    .controller('ContentModalCtrl4', ContentModalCtrl4)
;

function contentmodal4() {
    var directive = {
        restrict: 'E',
        template: template,
        controller: 'ContentModalCtrl4'
    };
    return directive;

    function template() {
        return [
            '<style>',
            //this style is conditional based on nav placement and site css
            'contentmodal a, contentmodal a:hover, contentmodal a:focus {color:#fff; text-decoration:none;}',
            '</style>',
            // update the size of the modal window within the open()
            '<a ng-click="open4(500)" style="text-decoration: none;">',
            // replace the *Open Modal* below with your link name
            '<span class="modalName"></span> {{\'Open\' | r | xlat}}',
            '</a>'
        ].join('');
    }
}

ContentModalCtrl4.$inject = ['$scope', '$modal'];
function ContentModalCtrl4($scope, $modal) {

    $scope.animationsEnabled = true;

    $scope.open4 = function (size) {

        var modalInstance = $modal.open({
            animation: $scope.animationsEnabled,
            backdrop: true,
            backdropClick: true,
            dialogFade: false,
            keyboard: true,
            size: size,
            template: contentmodal4open,
            controller: ContentModalOpenCtrl4,
            resolve: {
                item: function () {
                    //pass a scope variable into the modal content. in this case we are providing line item as an example for product use
                    return $scope.LineItem;
                }
            }
        });

        function contentmodal4open() {
            return [
              '<style>',
              '.modal-header {background-color:#f5f5f5;border-bottom: 1px solid #ccc; min-height: 36px; padding: 2px;}',
              '.modal-header h3 { margin-top:0;}',
              '.modal-header h5 { font-size:1.16em; font-weight:bold; padding:5px 10px; text-shadow: 0 1px 0 #ffffff;}',
              '.modal-header a.close {margin:0;padding:0;position:absolute;top:8px;right:10px;font-size:1.5em;color:#000;}',
              '.modal-body {width:100%; margin:0 auto; padding:10px 25px;}',
              '.modal-content {padding: 30px;}',
              '</style>',
              '<div class="modal-header" style="background-color: white;border-bottom: none;">',
                '<a class="pull-right close" ng-click="close()">',
                  '<i class="fa fa-times"></i>',
                  '</a>',
                '</div>',
              '<div class="modal-body">',
                '<div class="row">',
                  '<div class="col-xs-12 col-md-5">',
                    '<h1 class="product-modal-message">ADDED TO CART</h1>',
                    '<div class="secondary-title product-modal-title">{{item.Product.Name}}</div>',
                    '<div class="item-info">',
                      '<p>{{item.Product.ExternalID}}</p>',
                      '<p>ITEM SUBTOTAL: {{(item.LineTotal || variantitemsOrderTotal) | culturecurrency}}</p>',
                      '</div>',
                    '</div>',
                  '<div class="col-xs-12 col-md-6 col-md-offset-1">',
                    '<figure>',
                      '<img id="451_img_prod_lg" class="product-image-large img-responsive" ng-src="{{item.Variant.PreviewUrl || item.Variant.LargeImageUrl || item.Product.LargeImageUrl}}" imageonload />',
                      '</figure>',
                    '</div>',
                  '</div>',
                '</div>',
                '<br/>',
              //Optional footer
              // '<div class="modal-footer">',
                '<div class="" ng-hide="item.Product.ExternalID === \'TTH-KIT-CON\'">',
                  '<div class="stacked-buttons-product">',
                    '<div class="row" style="text-align: center;">',
                      '<div class="col-xs-12 col-sm-6 col-md-6 col-lg-6">',
                        '<button back-step class="btn btn-info back" type="button" id="451_btn_orderadd" ng-click="ok()" style="margin-bottom:20px;">',
                          'Continue Shopping',
                          '</button>',
                        '</div>',
                      '<div class="col-xs-12 col-sm-6 col-md-6 col-lg-6">',
                        '<button class="btn btn-info" type="button" id="451_btn_orderadd" ng-click="continueToCart()">',
                          'View Cart & Checkout',
                          '</button>',
                        '</div>',
                      '</div>',
                    '</div>',
                  '</div>',
                '<div class="" ng-show="item.Product.ExternalID === \'TTH-KIT-CON\'">',
                        '<div class="stacked-buttons-product">',
                          '<div class="row">',
                            '<div style="text-align: center;" class="col-xs-12">',
                              '<button class="btn btn-info back" type="button" id="451_btn_orderadd" ng-click="conFieldKit()">',
                                'Continue to Step 2 and select your apparel',
                                '</button>',
                              '</div>',
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

    var ContentModalOpenCtrl4 = ['$scope', '$modalInstance', '$modal', 'item', function($scope, $modalInstance, $modal, item) {

        $scope.item = item; // this is the item passed in from the ContentModalCtrl4 resolve

        $scope.close = function () {
            $modalInstance.close();
        };

        $scope.cancel = function () {
            $modalInstance.dismiss('cancel');
        };

        $scope.continueToCart = function() {
          $scope.ok();
          $location.path('cart');
        };

        $scope.conFieldKit = function() {
          $scope.ok();
          $location.path('catalog/tt_con_all');
        };
        

    }];

}
