/**
 * Site header.
 *
 * Rebuilt to the Hertz brand handoff: logo top left at 34px with its clear space, nav at
 * a 28px gap with the active item underlined 3px yellow, the signed-in name and avatar
 * right, a 1px rule at 20% black underneath and the 3px yellow rule below that.
 *
 * ## Styling lives in css/custom.css
 *
 * The previous version carried ~20 lines of CSS in an inline `<style>` block inside the
 * template string. A directive template is injected wherever the element appears, so those
 * rules were re-declared on every render and sat outside the one file the rest of the
 * theme is styled from. Everything here is now `.hz-hd-*` in custom.css.
 *
 * ## What is deliberately still here
 *
 * The nav is not just the four items in the design. Champions get Uniform Returns and UC
 * Insights, and the FAQ splits by role — a champion's FAQ is a different page from an
 * employee's. Those are gated by `ng-show` and simply do not render for a shopper, which
 * is why the design only shows four. Removing them would take away pages champions use.
 *
 * ## One header at every width
 *
 * Below 768px this used to hide and the stock `hamburgernavigation` took over: a dark
 * drawer with no logo, the cart buried inside it, and links belonging to another tenant.
 * It is retired. On a phone this same header shows the logo, the cart and a Menu button,
 * and the nav below opens as a panel, so the links and their role gating are the same
 * list at every width rather than two lists that drift.
 */
angular.module('OrderCloud-HeaderNavigation', []);
angular.module('OrderCloud-HeaderNavigation')
    .directive('headernavigation', headernavigation)
;

function headernavigation() {
    return {
        restrict: 'E',
        template: template,
        controller: 'NavCtrl'
    };

    function template() {
        return [
            '<header class="hz-hd">',
              '<div class="hz-hd-bar">',

                // ---- logo. Supplied asset, never recreated or recoloured (§2.1).
                '<a class="hz-hd-logo" ng-show="Four51User.isAuthenticated()" href="catalog">',
                  '<img src="https://images.hertz.com/misc/overlay/hertz-logo-black.png" alt="Hertz" />',
                '</a>',

                // ---- primary nav. A row on desktop, the Menu panel on a phone.
                '<nav class="hz-hd-nav" id="hz-hd-nav" aria-label="Main" ng-class="{\'is-open\': hdMenuOpen}">',
                  '<a class="hz-hd-link" href="catalog" ng-class="{active: isActive([\'catalog\'])}">',
                    '{{\'Home\' | r | xlat}}',
                  '</a>',

                  '<a class="hz-hd-link" href="order" ng-class="{active: isActive([\'order\'])}">',
                    '{{\'Orders\' | r | xlat}}',
                    '<span ng-if="waitingOrderCount > 0" class="hz-hd-badge">{{waitingOrderCount}}</span>',
                  '</a>',

                  '<a class="hz-hd-link" href="https://thumbprint.com/hertz/UniformReturn" target="_blank" rel="noopener noreferrer"',
                     ' ng-show="hertzChampionUser || dollarChampionUser || thriftyChampionUser">',
                    '{{\'Uniform Returns\' | r | xlat}}',
                  '</a>',

                  // Two FAQs, one label: a champion's FAQ is a different page.
                  '<a class="hz-hd-link" href="faq" ng-class="{active: isActive([\'faq\'])}"',
                     ' ng-show="hertzChampionUser || dollarChampionUser || thriftyChampionUser">',
                    '{{\'FAQ\' | r | xlat}}',
                  '</a>',
                  '<a class="hz-hd-link" href="allofaq" ng-class="{active: isActive([\'allofaq\'])}"',
                     ' ng-show="hertzUser || dollarUser || thriftyUser">',
                    '{{\'FAQ\' | r | xlat}}',
                  '</a>',

                  '<a class="hz-hd-link" href="uniforminsights" ng-class="{active: isActive([\'uniforminsights\'])}"',
                     ' ng-show="hertzChampionUser || dollarChampionUser || thriftyChampionUser">',
                    '{{\'UC Insights\' | r | xlat}}',
                  '</a>',
                  '<a class="hz-hd-link" href="insights" ng-class="{active: isActive([\'insights\'])}" ng-show="insightsUser">',
                    '{{\'Insights\' | r | xlat}}',
                  '</a>',
                  '<a class="hz-hd-link" href="catalog/tth_allpromo" ng-show="adminUser || purchaserUser">',
                    '{{\'Promo\' | r | xlat}}',
                  '</a>',

                  // ---- account. Bootstrap's dropdown, so data-toggle stays.
                  '<span class="hz-hd-drop dropdown"',
                        ' ng-class="{active: isActive([\'admin\', \'addresses\', \'address\', \'messages\', \'message\', \'favoriteorders\'])}">',
                    '<a class="hz-hd-link dropdown-toggle" data-toggle="dropdown" href="" aria-haspopup="true">',
                      '{{\'Account\' | r | xlat}}<b class="hz-hd-caret" aria-hidden="true"></b>',
                    '</a>',
                    '<ul class="dropdown-menu hz-hd-menu">',
                      '<li ng-show="user.Permissions.contains(\'ViewSelfAdmin\')">',
                        '<a href="admin">{{\'User Information\' | r | xlat}}</a>',
                      '</li>',
                  // Champions only. An allocation user does not choose where their
                  // uniform goes: it ships to their location, resolved from the
                  // department code in the HR feed, so an address they created would be
                  // ignored by everything downstream. The routes are guarded in
                  // js/routing.js as well, because hiding a link does not stop anyone
                  // typing the path.
                      '<li ng-show="(hertzChampionUser || dollarChampionUser || thriftyChampionUser) && user.Type == \'Customer\' && (user.Permissions.contains(\'CreateShipToAddress\') || user.Permissions.contains(\'CreateBillToAddress\'))">',
                        '<a href="addresses">{{\'Addresses\' | r | xlat}}</a>',
                      '</li>',
                      '<li ng-show="user.Type == \'Customer\' && user.Permissions.contains(\'ViewMessaging\')">',
                        '<a href="message">{{\'Messages\' | r | xlat}}</a>',
                      '</li>',
                      '<li ng-show="user.Permissions.contains(\'ViewContactUs\')">',
                        '<a href="contactus">{{\'Contact Us\' | r | xlat}}</a>',
                      '</li>',
                      '<li ng-show="user.Type!=\'TempCustomer\' && !user.Permissions.contains(\'PunchoutUser\')">',
                        '<a href="#" neworder ng-if="user.Permissions.contains(\'MultipleShoppingCart\') && currentOrder"',
                           ' ng-click="newOrderLoadingIndicator = true;startNewOrder()">',
                          '{{"Start" | r | xlat}} {{"New" | r | xlat}} {{"Order" | r | xlat}}',
                        '</a>',
                      '</li>',
                      '<li class="divider" ng-show="user.Type!=\'TempCustomer\' || AppConst.debug"></li>',
                      '<li ng-show="user.Type!=\'TempCustomer\'" ng-hide="PunchoutUser === true">',
                        '<a href="#" ng-click="Logout()">',
                          '<i class="fa fa-power-off text-danger"></i> <span>{{\'Log Out\' | r | xlat}}</span>',
                        '</a>',
                      '</li>',
                    '</ul>',
                  '</span>',
                '</nav>',

                // ---- who is signed in, and the cart
                '<div class="hz-hd-you">',
                  '<span class="hz-hd-name" ng-if="user.LastName">',
                    '<span ng-if="user.FirstName">{{user.FirstName.charAt(0)}}. </span>{{user.LastName}}',
                  '</span>',

                  '<span class="hz-hd-spend" ng-if="userSpendingAccounts">',
                    'Spending account: {{userSpendingAccounts[0].Balance | currency}}',
                  '</span>',

                  '<ul class="hz-hd-cart"><minicart></minicart></ul>',

                  // Inline SVG rather than a FontAwesome glyph: the icon is part of the
                  // brand mark area, and a webfont that fails to load leaves an empty box
                  // there rather than a missing decoration.
                  '<a class="hz-hd-avatar" href="admin" aria-label="Your account">',
                    '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">',
                      '<circle cx="12" cy="8" r="3.6"/>',
                      '<path d="M4.5 20.5c0-4.1 3.4-6.4 7.5-6.4s7.5 2.3 7.5 6.4"/>',
                    '</svg>',
                  '</a>',

                  // Phone only. The same 38px box as the cart beside it.
                  '<button type="button" class="hz-hd-toggle" ng-click="hdMenuOpen = !hdMenuOpen"',
                         ' aria-controls="hz-hd-nav" aria-expanded="{{hdMenuOpen ? \'true\' : \'false\'}}"',
                         ' aria-label="{{hdMenuOpen ? \'Close menu\' : \'Menu\'}}">',
                    '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">',
                      '<path ng-if="!hdMenuOpen" d="M4 7h16M4 12h16M4 17h16"/>',
                      '<path ng-if="hdMenuOpen" d="M6 6l12 12M18 6L6 18"/>',
                    '</svg>',
                  '</button>',
                '</div>',

              '</div>',
            '</header>'
        ].join('');
    }
}
