four51.app.controller('ProductSearchCtrl', ['$scope', 'Product', '$routeParams', '$modal',
function($scope, Product, $routeParams, $modal) {
	$scope.settings = {
		currentPage: 1,
		pageSize: 100
	};

	$scope.searchTerm = $routeParams.searchTerm;
	console.log('string routeParams ', $routeParams);
	$scope.search = Search;


	// ----

	$scope.termsEnabled = {
	  allItems: [true, false, false, false],
	  all: [false, false, false, false],
	  tumblers: [false, false, false, false],
      bags: [false, false, false, false],
      pens: [false, false, false, false],
      coffee: [false, false, false, false],
      tech: [false, false, false, false],
      misc: [false, false, false, false],
      quick: [false, false, false, false],

	};
	var searchTerms = new Set();
	$scope.multiSearch = function(section, index, newTerm) {
	    console.log('newTerm', newTerm);
      
	    if ($scope.termsEnabled[section][index]) {
          // Disable all other search terms
          for (var property in $scope.termsEnabled) {
            if ($scope.termsEnabled.hasOwnProperty(property) && (property !== section)) {
              $scope.termsEnabled[property][0] = false;
            }
          }
        
	        searchTerms = [newTerm];
	    } else {
          $scope.termsEnabled.allItems[0] = true;
	        searchTerms = ['allItems'];
	    }
			$scope.searchTermList = Array.from(searchTerms);

      console.log('Searching', $scope.searchTermList, $scope.termsEnabled);
			Search();
	}
  // Trigger initial search for all promo items
// 	if ($scope.isActive('promoItems/')) {
//   $scope.multiSearch('allItems', 0, 'All Promo Items');
// } else if ($scope.isActive('mottoPromoItems/')) {
// 	$scope.multiSearch('allItems', 0, 'Motto All Promo Items');
// } else if ($scope.isActive('wellNowPromoItems/')) {
// 	$scope.multiSearch('allItems', 0, 'WellNow Promo Items');
// } else if ($scope.isActive('clearChoicePromoItems/')) {
// 	$scope.multiSearch('allItems', 0, 'ClearChoice All Promo Items');
// }
	// ----

	$scope.$watch('settings.currentPage', function(n, o) {
		if (n != o || (n == 1 && o == 1))
			Search();
	});
	
    $scope.animationsEnabled = true;

    $scope.openProductModal = function (li) {
        console.log('in function');
		var type = 'normal order';
        var modalInstance = $modal.open({
            animation: $scope.animationsEnabled,
            templateUrl: 'productModal.html',
            controller: 'productModalCtrl',
            backdrop: 'static',
            resolve: {
                lineitem: function () {
                    return li;
                },
                user: function () {
                    return $scope.user;
                },
                currentOrder: function () {
                    return $scope.currentOrder;
                },
				display: function() {
					return type
				}
            }
        });
        modalInstance.result.then(function(o){
            $scope.currentOrder = o;
        });
	};

	function searchForTerm(currentProductList) {
		if (!$scope.searchTermList || $scope.searchTermList.length == 0) {
			console.log('Done searching');
			$scope.products = currentProductList;
			$scope.productCount = currentProductList.length;
			$scope.searchLoading = false;
			return;
		}

		let searchTerm = $scope.searchTermList.pop();
		console.log('Searching for:', searchTerm);
		Product.search(null, searchTerm, null, function(products, count) {
			productList = currentProductList.concat(products);
			console.log('Search results', productList);
			searchForTerm(productList);
		}, $scope.settings.currentPage, $scope.settings.pageSize);
		// How will this handle paging??
	}

	function Search() {
		console.log('Search', $scope.searchTerm);
		$scope.searchLoading = true;

		if ($scope.searchTermList && $scope.searchTermList.length > 0) {
			console.log('Using searchTermList', $scope.searchTermList);
			searchForTerm([]);
		} else {
			Product.search(null, $scope.searchTerm, null, function(products, count) {
				$scope.products = products;
				$scope.productCount = count;
				$scope.searchLoading = false;
			}, $scope.settings.currentPage, $scope.settings.pageSize);
		}
	}
}]);
