four51.app.controller('Four51Ctrl', ['$scope', '$route', '$location', 'Punchout', '$451', 'User', 'Order', 'Security', 'OrderConfig', 'Category', 'AppConst','XLATService', 'GoogleAnalytics', 'OrderSearchCriteria', 'SpendingAccount',
function ($scope, $route, $location, Punchout, $451, User, Order, Security, OrderConfig, Category, AppConst, XLATService, GoogleAnalytics, OrderSearchCriteria, SpendingAccount) {
	$scope.AppConst = AppConst;
	$scope.scroll = 0;
	$scope.isAnon = $451.isAnon; //need to know this before we have access to the user object
	$scope.Four51User = Security;
	if ($451.isAnon && !Security.isAuthenticated()) {
		User.login(function () {
			$route.reload();
		});
	}

	// fix Bootstrap fixed-top and fixed-bottom from jumping around on mobile input when virtual keyboard appears
	if ($(window).width() < 960) {
		$(document)
			.on('focus', ':input:not("button")', function (e) {
				$('.navbar-fixed-bottom, .headroom.navbar-fixed-top').css("position", "relative");
			})
			.on('blur', ':input', function (e) {
				$('.navbar-fixed-bottom, .headroom.navbar-fixed-top').css("position", "fixed");
			});
	}
	

	// http://stackoverflow.com/questions/12592472/how-to-highlight-a-current-menu-item-in-angularjs
    $scope.isActive = function(path) {
        var cur_path = $location.path().replace('/', '');
        var result = false;

        if (path instanceof Array) {
            angular.forEach(path, function(p) {
                if (p == cur_path && !result)
                    result = true;
            });
        }
        else {
            if (cur_path == path)
                result = true;
        }
        return result;
    };
    
        $scope.isActivePartialPath = function(path) {
		var cur_path = $location.path().replace('/', '');
		var result = false;

		if (path instanceof Array) {
				angular.forEach(path, function(p) {
						if ((cur_path.search(p) >= 0) && !result)
								result = true;
				});
		}
		else {
				if (cur_path.search(path) >= 0)
						result = true;
		}
		return result;
};

    // extension of above isActive in path
    $scope.isInPath = function(path) {
        var cur_path = $location.path().replace('/', '');
        var result = false;

        if(cur_path.indexOf(path) > -1) {
            result = true;
        }
        else {
            result = false;
        }
        return result;
    };
    
    //Punchout
    $scope.PunchoutSession = Punchout.punchoutSession;

	function init() {
		if (Security.isAuthenticated()) {
			User.get(function (user) {
				$scope.user = user;
        $scope.adminMember = false;
				angular.forEach($scope.user.Groups, function(group){
					if(group.Name == "01_Hertz"){
						$scope.hertzUser = true;
					} else if (group.Name == "02_Dollar/Thrifty") {
                        $scope.dollarUser = true;
					} else if (group.Name == "03_Thrifty") {
                        $scope.thriftyUser = true;
                    } else if (group.Name == "1_Full-Time") {
                        $scope.fulltimeUser = true;
                    } else if (group.Name == "2_Part-Time") {
                        $scope.partimeUser = true;
                    } else if (group.Name == "8_LAX") {
                        $scope.laxUser = true;
                    } else if (group.Name == "3_WarmWeather") {
                        $scope.warmUser = true;
                    } else if (group.Name == "4_ColdWeather") {
                        $scope.coldUser = true;
                    } else if (group.Name == "5_Hertz Uniform Champions") {
                        $scope.hertzChampionUser = true;
                    } else if (group.Name == "6_Dollar Uniform Champions") {
                        $scope.dollarChampionUser = true;
                    } else if (group.Name == "7_Thrifty Uniform Champions") {
                        $scope.thriftyChampionUser = true;
				    } else if (group.Name == "9_No Bottoms") {
                        $scope.noBottomsUser = true;
				    } else if (group.Name == "Insights") {
                        $scope.insightsUser = true;
				    }
                    
				});

                $scope.user.Culture.CurrencyPrefix = XLATService.getCurrentLanguage(user.CultureUI, user.Culture.Name)[1];
                $scope.user.Culture.DateFormat = XLATService.getCurrentLanguage(user.CultureUI, user.Culture.Name)[2];
         
        //         var setLocation = store.get('locationSet');
        // 		if (!setLocation) {
        // 		  store.set('locationSet', true)
        // 		  $location.path('catalog/adt_shop');
        // 		} 
        
    // $scope.openOrderCount = 0;
    
    // Watch for changes to openOrderCount
    // $scope.$watch('openOrderCount', function(newVal, oldVal) {
    //     if (newVal !== oldVal) {
    //         $scope.openOrderCount = newVal; // Explicitly setting again, even though it already is
    //         console.log('Four51Ctrl changed from', oldVal, 'to', newVal);
    //         console.log('Four51Ctrl openOrderCount 1', openOrderCount);
    //     }
    // });
    
    // OrderSearchCriteria.query(function(orders) {
    //     angular.forEach(orders, function(order) {
    //         if (order.DisplayName == "Open") {
    //             $scope.openOrderCount = order.Count;
    //         }
    //     });
    // });
    
    OrderSearchCriteria.query(function(orders) {
    $scope.totalOrderCount = 0;
    angular.forEach(orders, function(order) {
        $scope.totalOrderCount += order.Count;
    });
});
    
            //Punchout
            // PunchoutUser has to be resolved on every load — it drives the cart's
            // Submit button and the return-post URL. Only the landing redirect is
            // once per session, which is what punchoutconfig tracks.
            var punchoutConfigured = store.get('punchoutconfig');
            angular.forEach($scope.user.Permissions,function(permission){
                if(permission == "PunchoutUser"){
                    $scope.PunchoutUser = true;
                }
            });
            if($scope.PunchoutUser && !punchoutConfigured){
                if($scope.PunchoutSession && $scope.PunchoutSession.PunchOutOperation == 'Edit') $location.path('cart');
                else if($scope.PunchoutSession && $scope.PunchoutSession.PunchoutLandingCategory) $location.path('catalog/' + $scope.PunchoutSession.PunchoutLandingCategory);
                else if($scope.PunchoutSession && $scope.PunchoutSession.PunchoutLandingProduct) $location.path('product/' + $scope.PunchoutSession.PunchoutLandingProduct);
                store.set('punchoutconfig','true');
            }

          //SPENDING ACCOUNTS NAV
          SpendingAccount.query(function(data) {
            $scope.userSpendingAccounts = data;
          });


	            if (!$scope.user.TermsAccepted)
		            $location.path('conditions');

				if (user.CurrentOrderID) {
					Order.get(user.CurrentOrderID, function (ordr) {
						$scope.currentOrder = ordr;
						OrderConfig.costcenter(ordr, user);
					});
				}
				else
					$scope.currentOrder = null;

				if (user.Company.GoogleAnalyticsCode) {
					GoogleAnalytics.analyticsLogin(user.Company.GoogleAnalyticsCode);
				}

			});
			Category.tree(function (data) {
				$scope.tree = data;
				$scope.$broadcast("treeComplete", data);
			});
		}
	}

	try {
		trackJs.configure({
			trackAjaxFail: false
		});
	}
	catch(ex) {}

    $scope.errorSection = '';

    function cleanup() {
        Security.clear();
    }

    $scope.$on('event:auth-loginConfirmed', function(){
        $route.reload();
	});
	$scope.$on("$routeChangeSuccess", init);
    $scope.$on('event:auth-loginRequired', cleanup);
}]);
