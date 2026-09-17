four51.app.config(['$routeProvider', '$locationProvider', function($routeProvider, $locationProvider) {
    $locationProvider.html5Mode(true);

    var concatProductView = function(routeParams){
        return 'productview.hcf?id='+ routeParams.productInteropID;
    }

    var concatSpecFormView = function(routeParams){
        return 'specform.hcf?id=' + routeParams.productInteropID;
    }

    $routeProvider.
        // `/listOrders` removed. Its controller, `ListOrdersCtrl`, is never defined
        // anywhere in the theme — the route named a string and nothing else — so reaching
        // it threw `ng:areq: not a function, got undefined` and rendered "Server Error".
        // Nothing links to it; only a bookmark or an old link gets there, and `otherwise`
        // now sends those to the catalogue, which is a far better answer than an error
        // page. `partials/listOrders.html` is left in place rather than deleted: it is
        // inert, and order history lives at `/order`.
        // `/orderdetails/:orderid` removed, same reason as `/listOrders`: `OrderDetailsCtrl`
        // is never defined, so the route could only ever render "Server Error". Nothing
        // links to it; order history is `/order` and a placed order is `/order/new/:id`.
        //
        // NOT removed, and known broken: `KitSpecFormCtrl` and `KitVariantCtrl`, on the
        // deeper `/kit/...` routes below, are also undefined. They are left because they
        // belong to Four51's kit feature — `KitCtrl` itself does exist and `/kit/:id` is
        // reachable from productCtrl — and deleting a feature's routes is a bigger call
        // than deleting a route nothing can reach. Hertz's allocation is pool-based and
        // configures no kits, so nobody hits them today. If a kit is ever configured,
        // those two controllers have to be written before the flow works.
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
