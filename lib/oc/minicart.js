/*
 * The cart control in the header.
 *
 * ## What this replaced, and why the header was breaking
 *
 * The stock mini-cart shipped its own `<style>` block, injected into the page from the
 * directive template, and it fought the header rather than sitting in it:
 *
 *   - `margin-right: 30%` — a third of the viewport of empty space to the right of the
 *     cart, which is what pushed the icon away from the account button and left the header
 *     looking broken at every width.
 *   - `min-width: 300px` on a control that draws one icon.
 *   - `float: right` inside a flex row that was already handling placement, so the two
 *     layout models disagreed.
 *   - the whole thing wrapped in `style="height:10px"`, a ten-pixel box holding a
 *     twenty-four-pixel icon, so it overflowed its own container by design.
 *   - the count was rendered into `<span class="label label-default hidden">` — Bootstrap's
 *     `hidden` — so the number of items in the cart was never visible at all.
 *
 * Styling now lives in `custom.css` with the rest of the design system, where it can be
 * seen and changed alongside what it has to match.
 *
 * ## Click, not hover
 *
 * The panel opened on `:hover`. A hover menu cannot be opened from a touchscreen, cannot be
 * reached from the keyboard, and opens itself when the pointer merely crosses it on the way
 * somewhere else. It is now a button: click to open, click again, Escape, a click outside,
 * or a navigation to close. `aria-expanded` says which state it is in.
 *
 * ## Always present
 *
 * The old control appeared only once the cart had something in it, so the header silently
 * reflowed the moment a first item was added. It is now always there for a signed-in
 * shopper, with the badge appearing when there is something to count — nothing moves, and
 * there is always a way back to the cart.
 *
 * Every price is gated on BOTH the HidePricing permission and the order actually having a
 * total. The permission alone was not enough: a Uniform Champion does not carry
 * HidePricing — they buy a la carte and genuinely need to see prices — so an empty cart
 * rendered as " - $0.00" beside the cart icon on every page.
 */
angular.module('OrderCloud-Minicart', []);

angular.module('OrderCloud-Minicart')
    .directive('minicart', minicart)
    .controller('minicartCtrl', minicartCtrl)
;

function minicart() {
    return {
        restrict: 'E',
        template: template,
        controller: 'minicartCtrl'
    };

    function template(){
        return [
            '<li class="hz-mc" ng-hide="isInPath(\'order/\')">',

            //  The button. Same 38px box, border and radius as the account avatar beside
            //  it, so the two read as a pair rather than as an icon next to a control.
            '  <button type="button" class="hz-mc-btn" ng-click="toggleCart($event)"',
            '          aria-haspopup="true" aria-expanded="{{cartOpen ? \'true\' : \'false\'}}"',
            '          aria-label="{{cartCount ? cartCount + \' items in your cart\' : \'Your cart is empty\'}}">',

            //    Inline SVG, stroked to match the account glyph, rather than a FontAwesome
            //    glyph: a webfont that fails to load leaves an empty box in the brand mark
            //    area instead of a missing decoration.
            '    <svg class="hz-mc-i" viewBox="0 0 24 24" aria-hidden="true" focusable="false">',
            '      <path d="M2.75 4h2.1l2.55 10.9a1.7 1.7 0 0 0 1.66 1.31h7.9a1.7 1.7 0 0 0 1.66-1.31L20.4 7.7H5.5"/>',
            '      <circle cx="10" cy="19.6" r="1.35"/>',
            '      <circle cx="17.2" cy="19.6" r="1.35"/>',
            '    </svg>',

            //    Yellow fill with near-black type: yellow is a fill and never type (§3.2).
            '    <span class="hz-mc-badge" ng-if="cartCount > 0">{{cartCount}}</span>',
            '  </button>',

            '  <div class="hz-mc-panel" ng-if="cartOpen" ng-click="$event.stopPropagation()">',
            '    <p class="hz-mc-h">',
            '      <span ng-if="cartCount === 1">1 item in your cart</span>',
            '      <span ng-if="cartCount !== 1">{{cartCount || 0}} items in your cart</span>',
            '    </p>',

            //    The empty state is a door, not an apology: the one thing someone wants
            //    from an empty cart is the way back to choosing.
            '    <div class="hz-mc-empty" ng-if="!cartCount">',
            '      <p>Nothing here yet.</p>',
            '      <a href="allocation" ng-click="closeCart()">Choose your uniform</a>',
            '    </div>',

            '    <ul class="hz-mc-list" ng-if="cartCount">',
            '      <li class="hz-mc-row" ng-repeat="lineitem in currentOrder.LineItems | limitTo: 5" ng-hide="lineitem.Kit">',
            '        <span class="hz-mc-thumb">',
            '          <img ng-if="lineitem.Product.SmallImageUrl" ng-src="{{lineitem.Product.SmallImageUrl}}" alt="" />',
            '        </span>',
            '        <span class="hz-mc-meta">',
            '          <span class="hz-mc-name">{{lineitem.Product.Name}}</span>',
            '          <span class="hz-mc-qty">Qty {{lineitem.Quantity}}</span>',
            '        </span>',
            '        <span class="hz-mc-line" ng-if="!(user.Permissions.contains(\'HidePricing\')) && currentOrder.Total > 0">',
            '          {{lineitem.LineTotal | currency}}',
            '        </span>',
            '      </li>',
            '      <li class="hz-mc-more" ng-show="currentOrder.LineItems.length > 5">',
            '        <a href="cart" ng-click="closeCart()">and {{currentOrder.LineItems.length - 5}} more</a>',
            '      </li>',
            '    </ul>',

            '    <div class="hz-mc-sums" ng-if="cartCount && !(user.Permissions.contains(\'HidePricing\')) && currentOrder.Total > 0">',
            '      <p><span>Subtotal</span><span>{{currentOrder.Subtotal | currency}}</span></p>',
            '      <p ng-show="currentOrder.Coupon"><span>{{currentOrder.Coupon.Label}}</span><span>{{currentOrder.Coupon.OrderDiscount * -1 | culturecurrency}}</span></p>',
            '      <p ng-if="currentOrder.TaxCost"><span>{{\'Tax\' | r | xlat}}</span><span>{{currentOrder.TaxCost | culturecurrency}}</span></p>',
            '      <p class="hz-mc-total"><span>Total</span><span>{{currentOrder.Total | currency}}</span></p>',
            '    </div>',

            '    <a class="hz-mc-go" href="cart" ng-if="cartCount" ng-click="closeCart()">Go to my cart</a>',
            '  </div>',
            '</li>'
        ].join('');
    }
}

minicartCtrl.$inject = ['$scope', '$location', '$document', 'Order', 'OrderConfig', 'User'];
function minicartCtrl($scope, $location, $document, Order, OrderConfig, User) {

    $scope.cartOpen = false;

    /*
     * Open and close.
     *
     * The click that opens the panel is stopped here so it does not immediately reach the
     * document handler below and close it again in the same tick.
     */
    $scope.toggleCart = function(event) {
        if (event && event.stopPropagation) event.stopPropagation();
        $scope.cartOpen = !$scope.cartOpen;
    };

    $scope.closeCart = function() { $scope.cartOpen = false; };

    function closeFromOutside() {
        if (!$scope.cartOpen) return;
        $scope.$apply(function() { $scope.cartOpen = false; });
    }

    function onKey(event) {
        if (event.keyCode === 27) closeFromOutside();
    }

    $document.on('click', closeFromOutside);
    $document.on('keydown', onKey);

    // A panel left open across a navigation would hang over the next page, and the handlers
    // above would outlive the header that owns them.
    $scope.$on('$routeChangeSuccess', function() { $scope.cartOpen = false; });
    $scope.$on('$destroy', function() {
        $document.off('click', closeFromOutside);
        $document.off('keydown', onKey);
    });

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
