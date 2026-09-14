angular.module('OrderCloud-Minicart', []); 

angular.module('OrderCloud-Minicart')
    .directive('minicart', minicart)
    .controller('minicartCtrl', minicartCtrl)
;

function minicart() {
    return {
        restrict: 'E',
        transclude: true,
        template: template,
        controller: 'minicartCtrl'
    };

    function template(){
        return [
            '<style>',
            '.minicart {float: right; cursor: pointer;color: #242629; min-width:300px; text-align:right;padding-top: 0;margin-right: 30%;}',
            '@media (max-width: 768px) {.minicart { min-width:auto; } }',
            '.text-muted {color: #000000;}',
            '.minicart .fa-shopping-cart {position: relative;top: 3px;padding-right: 5px; font-size:1.5em;}',
            '.minicart .label.label-default {border-radius: 50%;;background-color: #0061AA;}',
            '.minicart:active .minicart-detail, .minicart:focus .minicart-detail, .minicart:hover .minicart-detail {display: block;}',
            '@media (max-width: 768px) {.minicart:active .minicart-detail, .minicart:focus .minicart-detail, .minicart:hover .minicart-detail {min-width:260px;} }',
            '.minicart .minicart-detail {display: none;border-radius: 20px;-webkit-box-shadow: 0px 6px 12px 0px rgba(0, 0, 0, 0.176);box-shadow: 0px 6px 12px 0px rgba(0, 0, 0, 0.176);padding: 10px;position: absolute;top: 100%;right: 10px;background-color: #fff;z-index: 9999;}',
            '.minicart .minicart-detail .fa-caret-up {position: absolute;top: -18px;right: 10px;color: #fff;}',
            '.minicart .minicart-detail .row:not(.lineitem-row) {padding: 10px 0;}',
            '.minicart .minicart-detail .row:not(.lineitem-row):not(.top-item) {border-top: 1px dashed #ddd;}',
            '.minicart .minicart-detail .row.lineitem-row {font-size: 0.8em; line-height:15px; text-align:left;}',
            '.minicart .minicart-detail .row.lineitem-row i.fa-times {font-size: 1.3em;}',
            '.minicart .minicart-detail a {display: block;}',
            '.minicart .minicart-detail figure {border: 1px solid #ddd;padding: 5px;}',
            '.minicart .minicart-detail figure img {width: 100%;}',
            '.minicart .minicart-detail .confirm-delete {position: absolute;left: 0;right: 0;top: 0;bottom: 0;background-color: #fff;}',
            '.minicart .minicart-detail .more {min-height:30px;}',
            '.minicart .minicart-detail .more a {float:right;font-size:85%; color:#000;}',
            '</style>',
            '<div ng-show="currentOrder && cartCount && !isInPath(\'order/\')" style="height:10px;">',
            '    <div class="minicart">',
            '        <i class="fa fa-shopping-cart" style="color:rgb(0, 38, 62);"></i> <span class="label label-default hidden">{{cartCount}}</span> <span ng-if="!(user.Permissions.contains(\'HidePricing\'))" class="hidden-xs" style="color:rgb(0, 38, 62);"> - {{currentOrder.Total | currency }}</span> <i class="fa fa-caret-down text-muted" style="color:rgb(0, 38, 62);"></i>',
            '        <div class="minicart-detail">',
            '            <i class="fa fa-caret-up fa-2x"></i>',
            '            <ul>',
            '                <li ng-repeat="lineitem in currentOrder.LineItems | limitTo: 5" ng-hide="lineitem.Kit">',
            '                    <div class="row" ng-class="{\'top-item\':$index == 0}">',
            '                        <div class="col-xs-3">',
            '                            <a ng-href="{{\'cart/\' + lineitem.Product.InteropID + \'/\' + $index}}" style="pointer-events: none;cursor: default;text-decoration: none;">',
            '                                <figure>',
            '                                    <img ng-src="{{lineitem.Product.SmallImageUrl}}" />',
            '                                </figure>',
            '                            </a>',
            '                        </div>',
            '                        <div class="col-xs-9">',
            '                            <div class="row lineitem-row">',
            '                                <div class="col-xs-5">',
            '                                    <a ng-href="{{\'cart/\' + lineitem.Product.InteropID + \'/\' + $index}}" style="pointer-events: none;cursor: default;text-decoration: none;">',
            '                                        <p class="text-muted">{{lineitem.Product.Name}}</p>',
            '                                    </a>',
            '                                </div>',
            '                                <div class="col-xs-2">',
            '                                    <p class="text-muted">{{\'X\' + lineitem.Quantity}}</p>',
            '                                </div>',
            '                                <div class="col-xs-3" ng-if="!(user.Permissions.contains(\'HidePricing\'))">',
            '                                    <p class="text-muted">{{lineitem.LineTotal | currency}}</p>',
            '                                </div>',
            '                                <div class="col-xs-2 text-right hidden">',
            '                                    <i class="fa fa-times text-muted" ng-click="removeItem(lineitem)"></i>',
            '                                </div>',
            '                            </div>',
            '                        </div>',
            '                    </div>',
            '                </li>',
            '<li class="more" ng-show="currentOrder.LineItems.length > 5">',
            '<a href="cart">more items &gt;</a>',
            '<li>',
            '            </ul>',
            '            <div class="row" ng-if="!(user.Permissions.contains(\'HidePricing\'))">',
            '                <div class="col-xs-8 text-right text-muted">Subtotal:</div>',
            '                <div class="col-xs-4 text-right text-muted">{{currentOrder.Subtotal | currency}}</div>',
            '            </div>',
            '            <div class="row" ng-show="currentOrder.Coupon">',
            '                <div class="col-xs-8 text-right">{{currentOrder.Coupon.Label}}:</div>',
            '                <div class="col-xs-4 text-right">{{currentOrder.Coupon.OrderDiscount * -1 | culturecurrency}}</div>',
            '            </div>',
            '            <div class="row" ng-if="!(user.Permissions.contains(\'HidePricing\')) && currentOrder.TaxCost">',
            '                <div class="col-xs-8 text-right">{{\'Tax\' | r | xlat}}:</div>',
            '                <div class="col-xs-4 text-right">{{currentOrder.TaxCost | culturecurrency}}</div>',
            '            </div>',
            '            <div class="row" ng-if="!(user.Permissions.contains(\'HidePricing\'))">',
            '                <div class="col-xs-8 text-right text-muted">Total:</div>',
            '                <div class="col-xs-4 text-right text-muted">{{currentOrder.Total | currency}}</div>',
            '            </div>',
            '',
            '            <div class="row" ng-hide="PunchoutUser === true">',
            '                <div class="col-xs-12">',
            '                    <a class="btn btn-default btn-block minicart-btn" href="cart">View Cart</a>',
            '                </div>',
            /*'                <div class="col-xs-6">',
            '                    <a class="btn btn-default btn-block minicart-btn" ng-click="cartCheckOut()">Checkout</a>',
            '                </div>',*/
            '            </div>',
            '            <div class="row" ng-if="PunchoutUser === true">',
            '                <div class="col-xs-12">',
            '                    <a class="btn btn-default btn-block minicart-btn" href="cart">View Cart</a>',
            '                </div>',
            '            </div>',
            '        </div>',
            '    </div>',
            '    <div style="clear:both;"></div>',
            '</div>'
        ].join('');
    }
}

minicartCtrl.$inject = ['$scope', '$location', 'Order', 'OrderConfig', 'User'];
function minicartCtrl($scope, $location, Order, OrderConfig, User) {

    $scope.removeItem = function(item, override) {
        if (override || confirm('Are you sure you wish to remove this item from your cart?') == true) {
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
    };

    $scope.cartCheckOut = function() {
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

    $scope.$on('event:orderUpdate', function(event, order){
        $scope.currentOrder = order ? (order.Status === 'Unsubmitted') ? order : null : null;
    })
}
