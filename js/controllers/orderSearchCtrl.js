four51.app.controller('OrderSearchCtrl', ['$scope', '$location', 'OrderSearchCriteria', 'OrderSearch', 'Allocation',
	function ($scope,  $location, OrderSearchCriteria, OrderSearch, Allocation) {
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
				settle();
				withOnBehalf();
				// A cancelled order in Four51's own list: ask straight away, so its items go
				// back to whoever it was for. For a Champion's on-behalf order this is the
				// only session that can, because only the Champion can read it from Four51.
				// The API settles only what it has not already, and only on Four51's word.
				var anyCanceled = all.some(function(o) {
					return /^cancel+ed$/i.test(o.Status || '') || /^cancel+ed$/i.test(o.StatusText || '');
				});
				if (anyCanceled && Allocation.isEnabled()) {
					Allocation.checkCancellations(true).catch(function() { /* asked again on the next page */ });
				}
			}

			function settle() {
				all.sort(function(a, b) {
					return new Date(b.DateSubmitted || b.DateCreated) - new Date(a.DateSubmitted || a.DateCreated);
				});
				$scope.allOrders = all;
				applyFind();
				$scope.pagedIndicator = false;
			}

			/**
			 * Orders placed on someone's behalf, from both sides (Trevor, 24 Sep 2026).
			 *
			 * A Champion's on-behalf order is their Four51 order, so Four51 lists it for them
			 * and never for the employee. Our record knows both: the Champion's rows are marked
			 * with whose order each was, and the employee gets the order in their list, marked
			 * as placed for them, opening on a page built from our record because they cannot
			 * open the Champion's Four51 order.
			 */
			function withOnBehalf() {
				if (!Allocation.isEnabled()) return;
				Allocation.ordersOnBehalf().then(function(res) {
					// Matched by order ID, and by order number when the ID does not match: the ID
					// Four51 lists an order under can differ from the one recorded at checkout,
					// which left a Champion's on-behalf orders reading "Ordered by" (1007HTZSB).
					// The number ("1007HTZSB") is what both sides know it by and does not change.
					var byMe = {}, byMeNumber = {}, listedNumbers = {};
					angular.forEach((res && res.byMe) || [], function(o) {
						byMe[o.four51OrderId] = o;
						if (o.orderNumber) byMeNumber[o.orderNumber] = o;
					});
					angular.forEach(all, function(o) {
						var mine = byMe[o.ID] || (o.ExternalID && byMeNumber[o.ExternalID]);
						if (mine) o.hzFor = mine.beneficiary;
						if (o.ExternalID) listedNumbers[o.ExternalID] = true;
					});
					angular.forEach((res && res.forMe) || [], function(o) {
						if (byId[o.four51OrderId] || (o.orderNumber && listedNumbers[o.orderNumber])) return;
						byId[o.four51OrderId] = true;
						all.push({
							ID: o.four51OrderId,
							ExternalID: o.orderNumber,
							DateSubmitted: o.submittedAt,
							StatusText: o.cancelledOn ? 'Canceled' : 'Placed',
							DateCanceled: o.cancelledOn,
							hzBehalf: true,
							hzPlacedBy: o.placedBy
						});
					});
					settle();
				}).catch(function() { /* Four51's own list still stands */ });
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
