four51.app.controller('OrderSearchCtrl', ['$scope', '$location', 'OrderSearchCriteria', 'OrderSearch',
	function ($scope,  $location, OrderSearchCriteria, OrderSearch) {
		$scope.settings = {
			currentPage: 1,
			pageSize: 10
		};

		OrderSearchCriteria.query(function(data) {
			$scope.OrderSearchCriteria = data;
			$scope.hasStandardTypes = _hasType(data, 'Standard');
			$scope.hasReplenishmentTypes = _hasType(data, 'Replenishment');
			$scope.hasPriceRequestTypes = _hasType(data, 'PriceRequest');

			// Show the orders on arrival.
			//
			// Nothing was queried until the employee clicked a criteria link, so the page
			// opened on a search console with no results under it — the one thing it exists
			// to show, absent until you asked twice. Query starts the broadest criteria
			// that has anything in it, which is what someone opening "Order history"
			// means by opening it.
			var opening = _broadest(data);
			if (opening) {
				$scope.currentCriteria = opening;
				Query(opening);
			}
		});

		// The criteria come back as buckets — all orders, open orders, last 30 days — with
		// a count on each. The broadest is simply the one holding the most; picking by
		// DisplayName would tie this to whatever Four51 happens to call them.
		function _broadest(data) {
			var best = null;
			angular.forEach(data, function(o) {
				if (o.Type == 'Standard' && o.Count > 0 && (!best || o.Count > best.Count))
					best = o;
			});
			return best;
		}

		$scope.$watch('settings.currentPage', function() {
			Query($scope.currentCriteria);
		});

		$scope.OrderSearch = function($event, criteria) {
			$event.preventDefault();
			$scope.currentCriteria = criteria;
			Query(criteria);
		};

		function _hasType(data, type) {
			var hasType = false;
			angular.forEach(data, function(o) {
				if (hasType || o.Type == type && o.Count > 0)
					hasType = true;
			});
			return hasType;
		}

		function Query(criteria) {
			if (!criteria) return;
			$scope.showNoResults = false;
			$scope.pagedIndicator = true;
			OrderSearch.search(criteria, function (list, count) {
				$scope.orders = list;
				$scope.settings.listCount = count;
				$scope.showNoResults = list.length == 0;
				$scope.pagedIndicator = false;
			}, $scope.settings.currentPage, $scope.settings.pageSize);
			$scope.orderSearchStat = criteria;
		}
	}]);