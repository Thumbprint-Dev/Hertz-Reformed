four51.app.config(['$routeProvider', '$locationProvider', function($routeProvider, $locationProvider) {
    $locationProvider.html5Mode(true);

    var concatProductView = function(routeParams){
        return 'productview.hcf?id='+ routeParams.productInteropID;
    }

    var concatSpecFormView = function(routeParams){
        return 'specform.hcf?id=' + routeParams.productInteropID;
    }

    /* The champion-only guard on /address* is a run block at the bottom of this file,
       not a route `resolve`. See the note there for why the obvious version does not
       work, and why `/insights` below is quietly broken in the same way. */

    $routeProvider.
        when('/listOrders', { templateUrl: 'partials/listOrders.html', controller: 'ListOrdersCtrl' }).
        when('/orderdetails/:orderid', {templateUrl: 'partials/orderDetails.html', controller: 'OrderDetailsCtrl'}).
        // `/catalog` is where sign-in lands and where `otherwise` sends everything, so it
        // is the front door and carries the landing page. A specific category still goes
        // to the product listing; only the bare path changed. The old bare-`/catalog`
        // view was a list of the top-level categories, which is exactly what the landing
        // page's "Start here" cells are, so nothing is unreachable.
        when('/catalog', { templateUrl: 'partials/homeView.html', controller: 'HomeCtrl' }).
        when('/catalog/:categoryInteropID', { templateUrl: 'partials/categoryView.html', controller: 'CategoryCtrl' }).
        when('/kit/:id', {templateUrl: 'partials/kitView.html', controller: 'KitCtrl'}).
        when('/kit/:id/:lineitemid', {templateUrl: 'partials/kitView.html', controller: 'KitCtrl'}).
        when('/kit/:id/:lineitemid/:productInteropID', {templateUrl: concatSpecFormView, controller: 'KitSpecFormCtrl'}).
        when('/kit/:id/:lineitemid/:productInteropID/:variantInteropID', {templateUrl: "partials/kitVariantView.html", controller: 'KitVariantCtrl'}).
        when('/kit/:id/:lineitemid/:productInteropID/:variantInteropID/edit', {templateUrl: concatSpecFormView, controller: 'KitSpecFormCtrl'}).
        when('/product/:productInteropID', {templateUrl: concatProductView, controller: 'ProductCtrl'}).
        when('/product/:productInteropID/:variantInteropID', {templateUrl: concatProductView, controller: 'ProductCtrl'}).
        when('/product/:productInteropID/:variantInteropID/edit', {templateUrl: concatSpecFormView, controller: 'SpecFormCtrl'}).
        when('/product/:productInteropID/:variantInteropID/:orderID', {templateUrl: concatProductView, controller: 'ProductCtrl'}).
        when('/product/:productInteropID/:variantInteropID/:lineItemIndex/:orderID/edit', {templateUrl: concatSpecFormView, controller: 'SpecFormCtrl'}).
        when('/order', { templateUrl: 'partials/orderSearchView.html', controller: 'OrderSearchCtrl' }).
        when('/order/:id', { templateUrl: 'partials/Reporting/orderHistoryView.html', controller: 'OrderViewCtrl' }).
        when('/order/new/:id', { templateUrl: 'partials/Reporting/orderHistoryView.html', controller: 'OrderViewCtrl' }).
        when('/favoriteorders', { templateUrl: 'partials/favoriteOrderListView.html', controller: 'FavoriteOrderCtrl' }).
        when('/order/:orderid/:lineitemindex/', { templateUrl: 'partials/Reporting/lineItemHistoryView.html', controller: 'LineItemViewCtrl' }).
        when('/message', { templateUrl: 'partials/messageListView.html', controller: 'MessageListCtrl' }).
        when('/message/:id', { templateUrl: 'partials/messageView.html', controller: 'MessageViewCtrl' }).
        when('/admin', { templateUrl: 'partials/userView.html', controller: 'UserEditCtrl' }).
        when('/addresses', { templateUrl: 'partials/addressListView.html', controller: 'AddressListCtrl' }).
        when('/address', { templateUrl: 'partials/addressView.html', controller: 'AddressViewCtrl' }).
        when('/address/:id', { templateUrl: 'partials/addressView.html', controller: 'AddressViewCtrl' }).
        when('/home', { templateUrl: 'partials/homeView.html', controller: 'HomeCtrl' }).
        when('/allocation', { templateUrl: 'partials/allocationView.html', controller: 'AllocationCtrl' }).
        // The beneficiary travels as ?for= on /allocation rather than in the path, so
        // `reloadOnSearch` staying default means changing who you are ordering for
        // re-runs the controller rather than leaving the previous person's pools on screen.
        when('/champion', { templateUrl: 'partials/championView.html', controller: 'ChampionCtrl' }).
        // Start a return. Beside /returns/, which is the policy; ?for= and ?order= as on
        // /allocation, and for the same reason.
        when('/returns/new', { templateUrl: 'partials/returnRequestView.html', controller: 'ReturnRequestCtrl' }).
        when('/cart', { templateUrl: 'partials/cartView.html', controller: 'CartViewCtrl'}).
        when('/checkout', { templateUrl: 'partials/checkOutView.html', controller: 'CheckOutViewCtrl' }).
        when('/checkout/:id', { templateUrl: 'partials/checkOutView.html', controller: 'CheckOutViewCtrl' }).
        when('/cart/:productInteropID/:lineItemIndex', { templateUrl: concatProductView, controller: 'LineItemEditCtrl'}).
        when('/cart/:productInteropID/:orderID/:lineItemIndex', { templateUrl: concatProductView, controller: 'LineItemEditCtrl'}).
        when('/cart/:id', { templateUrl: 'partials/cartView.html', controller: 'CartViewCtrl' }).
        when('/login', { templateUrl: 'partials/controls/login.html', controller: 'LoginCtrl' }).
        when('/search', { templateUrl: 'partials/searchView.html', controller: 'ProductSearchCtrl' }).
        when('/search/:searchTerm', { templateUrl: 'partials/searchView.html', controller: 'ProductSearchCtrl' }).
        when('/security', { templateUrl: 'partials/Security/security.html', controller: 'SecurityCtrl' }).
        when('/conditions', { templateUrl: 'partials/Conditions/conditions.html', controller: 'ConditionsCtrl' }).
        when('/reports', { templateUrl: 'partials/reportsView.html', controller: 'ReportsCtrl' }).
        when('/report/:id', { templateUrl: 'partials/Reporting/reportView.html', controller: 'ReportCtrl' }).
        when('/contactus', { templateUrl: 'partials/Messages/contactus.html' }).
        when('/requestform', { templateUrl: 'partials/Messages/requestform.html' }).
        when('/faq/', { templateUrl: 'partials/Messages/faq.html' }).
        when('/returns/', { templateUrl: 'partials/Messages/returns.html' }).
        when('/allofaq/', { templateUrl: 'partials/Messages/allofaq.html' }).
        when('/uniforminsights/', { templateUrl: 'partials/uniforminsights.html' }).
        when('/insights/', {
            templateUrl: 'partials/insights.html',
            resolve: {
                auth: ['User', '$q', '$location', function(User, $q, $location) {
                    var deferred = $q.defer();
                    User.get(function(user) {
                        var insights = user.Groups && user.Groups.some(function(g) {
                            return g.Name === 'Insights';
                        });
                        if (insights) {
                            deferred.resolve(user);
                        } else {
                            $location.path('/catalog');
                            deferred.reject('unauthorized');
                        }
                    });
                    return deferred.promise;
                }]
            }
        }).
        
        otherwise({redirectTo: '/catalog'});
}]);

/**
 * The address book is for Uniform Champions only.
 *
 * An allocation user does not choose where their uniform goes: it ships to their
 * location, resolved from the department code in the HR feed. Offering them an address
 * book offers a decision they do not have, and an address they created would be ignored
 * by everything downstream. The menu entries are hidden in `controls/accountnav.html`
 * and `lib/oc/headerNavigation.js`, and this stops the routes being typed.
 *
 * ## Why this is a run block and not a route `resolve`
 *
 * The obvious version is a `resolve` that rejects and calls `$location.path()`, which is
 * what the `/insights` route above does. It does not work, and `/insights` has the bug
 * today: the address bar changes and the page renders nothing at all. Rejecting a resolve
 * makes ngRoute unwind the transition without setting `$route.current`, and a location
 * change made inside that same turn is swallowed rather than starting the next
 * navigation. Rejecting first and deferring the redirect with `$timeout` does not fix it
 * either; the route then simply stays where it was, still blank.
 *
 * Redirecting from `$routeChangeStart` instead leaves the failed navigation out of it
 * entirely: the address book briefly begins to load and is then replaced by an ordinary
 * navigation to `/admin`, which renders. A blink of a page they may not keep is a better
 * outcome than a blank one, and this is a UX gate rather than a security boundary: the
 * addresses in question are the user's own, and nothing secret is behind it.
 *
 * ## Two sources of truth, deliberately
 *
 * `Allocation.hasRole` is the real answer, because champion status lives in our database,
 * but it reads a cached identity that is empty until the session exchange has happened,
 * so on a cold load straight into /addresses it would refuse a genuine champion. The
 * Four51 group match resolves through `User.get` and covers exactly that case. Either
 * passes.
 */
four51.app.run(['$rootScope', '$location', 'User', 'Allocation',
    function($rootScope, $location, User, Allocation) {
        $rootScope.$on('$routeChangeStart', function(event, next) {
            var path = next && next.$$route && next.$$route.originalPath;
            if (!path || path.indexOf('/address') !== 0) return;

            User.get(function(user) {
                var byGroup = user && user.Groups && user.Groups.some(function(g) {
                    return g.Name === '5_Hertz Uniform Champions'
                        || g.Name === '6_Dollar Uniform Champions'
                        || g.Name === '7_Thrifty Uniform Champions';
                });
                var byRole = Allocation.hasRole('champion') || Allocation.hasRole('admin');
                if (byGroup || byRole) return;

                // Their own details, which is what they were probably after.
                $location.path('/admin').replace();
            });
        });
    }]);
