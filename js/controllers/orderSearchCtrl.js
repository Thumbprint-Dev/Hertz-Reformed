four51.app.controller('OrderSearchCtrl', ['$scope', '$location', 'OrderSearchCriteria', 'OrderSearch',
	function ($scope,  $location, OrderSearchCriteria, OrderSearch) {
		$scope.settings = {
			currentPage: 1,
			pageSize: 10
		};
		$scope.pagedIndicator = true;
		$scope.orders = [];
		$scope.find = { text: '' };

		/**
		 * Every order, newest first, on arrival.
		 *
		 * Four51 files orders in buckets by status (Open, Completed, ...), each with a count,
		 * and searches one bucket at a time. The page used to open on the biggest bucket and
		 * offer the rest as chips, so a completed order was a click away from an employee
		 * asking where their uniform was. Now every bucket with anything in it is fetched
		 * and the lists are merged.
		 *
		 * One after another, not in parallel: `OrderSearch` keeps a single shared cache and
		 * clears it at the start of each search, so two in flight overwrite each other.
		 * Each result is copied out before the next begins. An employee has a handful of
		 * orders, so the whole of each bucket comes back in one page.
		 *
		 * The working cart is not an order yet, so an unsubmitted order is left out.
		 */
		OrderSearchCriteria.query(function(data) {
			var buckets = (data || []).filter(function(c) { return c.Type == 'Standard' && c.Count > 0; });
			var byId = {};
			var all = [];

			function next(i) {
				if (i >= buckets.length) return done();
				var c = angular.copy(buckets[i]);
				OrderSearch.search(c, function(list) {
					angular.forEach(list || [], function(o) {
						if (!o || typeof o !== 'object' || byId[o.ID]) return;
						if (o.Status === 'Unsubmitted') return;
						byId[o.ID] = true;
						all.push(o);
					});
					next(i + 1);
				}, 1, Math.max(c.Count, 10));
			}

			function done() {
				all.sort(function(a, b) {
					return new Date(b.DateSubmitted || b.DateCreated) - new Date(a.DateSubmitted || a.DateCreated);
				});
				$scope.allOrders = all;
				applyFind();
				$scope.pagedIndicator = false;
			}

			next(0);
		});

		/** The order-number box narrows the list as it is typed; nothing to submit. */
		function applyFind() {
			var q = String($scope.find.text || '').trim().toLowerCase();
			$scope.orders = !q ? ($scope.allOrders || []) : ($scope.allOrders || []).filter(function(o) {
				return String(o.ExternalID || '').toLowerCase().indexOf(q) > -1;
			});
			$scope.settings.listCount = $scope.orders.length;
			$scope.settings.currentPage = 1;
		}
		$scope.$watch('find.text', function(now, before) {
			if (now !== before) applyFind();
		});
	}]);
