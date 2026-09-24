/**
 * Start a return — the form that replaces typing an order into Cognito.
 *
 * The Cognito form (thumbprint.com/hertz/UniformReturn) asks for an employee id, a location
 * number, an order number in the right format, the item from a list of forty-one and a
 * quantity, all typed, all per item. Every one of those is something this system already
 * knows. Here the employee picks the order, picks what is going back from what was actually
 * on it, and says why; the rest comes from the HR record and the order itself.
 *
 * ## What the list is, and what it is not
 *
 * `GET /returns/orders` lists orders from our record of checkout, not Four51's order
 * history — a Champion's on-behalf order is the Champion's Four51 order, and only we know
 * whose uniform it was. Each line's `returnable` is exactly what `POST /returns` will accept,
 * already net of anything requested and still in the post, so the stepper cannot offer a
 * quantity the server would refuse.
 *
 * Orders placed before checkout started recording are not in it. The page says so rather
 * than showing an empty list as though there were nothing to return.
 *
 * ## Nothing is credited here
 *
 * A request issues an RMA number and moves nothing. The allocation comes back when the
 * warehouse receives the box, and only for what was in it — the page says that too, so
 * nobody expects their count to change the moment they press the button.
 *
 * `?for=<employeeId>` is a Champion raising a return for someone on their team, authorised
 * server-side by the same scope rule as ordering on behalf. `?order=<id>` preselects an
 * order, for arriving from an order's own page.
 */
four51.app.controller('ReturnRequestCtrl', ['$scope', '$location', '$q', '$filter', '$window', 'Allocation', 'Order',
  function($scope, $location, $q, $filter, $window, Allocation, Order) {

    var search = $location.search() || {};
    var FOR = search['for'] || null;
    var garment = $filter('hzGarment');

    // An object, never bare primitives: anything under an `ng-if` gets a child scope, and
    // writing to a bare name there shadows rather than updates.
    $scope.rt = {
      enabled: Allocation.isEnabled(),
      loading: true,
      error: null,
      forId: FOR,
      onBehalf: false,
      who: null,
      orders: [],
      reasons: [],
      order: null,
      picks: {},
      submitting: false,
      refusal: null,
      done: null,
      tried: false
    };

    function describe(err) {
      if (!err) return 'Could not load your orders.';
      if (err.noSession) return 'Please sign in to start a return.';
      if (err.network || err.status === 0) return 'Could not reach the allocation service.';
      if (err.status === 403) return 'You can only start a return for someone on your team.';
      if (err.status === 401) return 'Your session could not be verified.';
      return 'Could not load your orders.';
    }

    function load() {
      var rt = $scope.rt;
      rt.loading = true;
      rt.error = null;
      $q.all([Allocation.returnOrders(FOR), Allocation.profile(FOR)])
        .then(function(results) {
          var data = results[0] || {};
          rt.orders = data.orders || [];
          rt.reasons = data.reasons || [];
          numberOrders(rt.orders);
          rt.onBehalf = !!data.onBehalf;
          rt.who = results[1] || null;

          var wanted = search.order;
          var open = rt.orders.filter(function(o) { return o.returnable > 0; });
          var pre = null;
          angular.forEach(rt.orders, function(o) { if (o.four51OrderId === wanted) pre = o; });
          // One order with something to send back is the usual case, and choosing it for
          // them saves a click that has only one answer.
          if (!pre && open.length === 1) pre = open[0];
          if (pre && pre.returnable > 0) rt.choose(pre);
        })
        .catch(function(err) { rt.error = describe(err); })
        .finally(function() { rt.loading = false; });
    }

    /**
     * The number the employee knows each order by.
     *
     * "1000" is Four51's ExternalID; we record the order by its internal id, which reads as
     * noise ("Z0-sJfSN...") beside an order page headed "Order 1000". One lookup per order,
     * and an employee has one to three. A lookup that fails leaves the internal id showing,
     * which still names the right order.
     */
    function numberOrders(orders) {
      angular.forEach(orders, function(o) {
        try {
          Order.get(o.four51OrderId, function(order) {
            if (order && order.ExternalID) o.orderNumber = order.ExternalID;
          });
        } catch (e) { /* the internal id stays */ }
      });
    }

    $scope.rt.choose = function(order) {
      var rt = $scope.rt;
      if (!order || order.returnable < 1) return;
      rt.order = order;
      rt.picks = {};
      rt.refusal = null;
      rt.tried = false;
      forWhom(order);
    };

    /**
     * Whose return this is. A Champion's own list includes the orders they placed for
     * others (`beneficiary` on each); a return against one is raised for that employee, so
     * the header names them and the request carries their id. Choosing one of the
     * Champion's own orders again puts it back.
     */
    var own = null;
    function forWhom(order) {
      var rt = $scope.rt;
      if (own === null) own = { who: rt.who, onBehalf: rt.onBehalf };
      var b = order && order.beneficiary;
      if (!b) {
        rt.returnFor = null;
        rt.who = own.who;
        rt.onBehalf = own.onBehalf;
        return;
      }
      rt.returnFor = b.employeeId;
      rt.onBehalf = true;
      rt.who = { firstName: b.name, lastName: '', employeeId: b.employeeId };
      Allocation.profile(b.employeeId)
        .then(function(p) { if (rt.returnFor === b.employeeId && p) rt.who = p; })
        .catch(function() { /* the name from the order stands */ });
    }

    /** Units on the order, which is what "items" means to the person who ordered them. */
    $scope.rt.itemsIn = function(order) {
      return (order.lines || []).reduce(function(sum, l) { return sum + l.quantity; }, 0);
    };

    $scope.rt.nameOf = function(line) {
      return garment(line.productId || line.sku, line.categoryName);
    };

    $scope.rt.qtyOf = function(line) {
      var p = $scope.rt.picks[line.four51LineId];
      return p ? p.qty : 0;
    };

    $scope.rt.more = function(line) {
      var rt = $scope.rt;
      var p = rt.picks[line.four51LineId] || (rt.picks[line.four51LineId] = { qty: 0, reason: '' });
      if (p.qty < line.returnable) p.qty += 1;
      rt.refusal = null;
    };

    $scope.rt.fewer = function(line) {
      var rt = $scope.rt;
      var p = rt.picks[line.four51LineId];
      if (!p) return;
      p.qty = Math.max(0, p.qty - 1);
      // Taking an item off the return takes its reason with it, so nothing half-filled
      // is left behind to trip validation.
      if (p.qty === 0) delete rt.picks[line.four51LineId];
      rt.refusal = null;
    };

    /** The lines actually going back, in order-line order. */
    $scope.rt.chosen = function() {
      var rt = $scope.rt;
      if (!rt.order) return [];
      return rt.order.lines.filter(function(l) { return rt.qtyOf(l) > 0; });
    };

    $scope.rt.units = function() {
      var rt = $scope.rt;
      return rt.chosen().reduce(function(sum, l) { return sum + rt.qtyOf(l); }, 0);
    };

    $scope.rt.needsReason = function(line) {
      var p = $scope.rt.picks[line.four51LineId];
      return !!p && p.qty > 0 && !p.reason;
    };

    /** Why the button is not ready, in words, or null when it is. */
    $scope.rt.blocker = function() {
      var rt = $scope.rt;
      if (!rt.order) return 'Choose the order the items came from.';
      var chosen = rt.chosen();
      if (!chosen.length) return 'Choose at least one item to return.';
      if (chosen.some(rt.needsReason)) return 'Choose a reason for each item.';
      return null;
    };

    $scope.rt.submit = function() {
      var rt = $scope.rt;
      rt.tried = true;
      if (rt.submitting || rt.blocker()) return;

      rt.submitting = true;
      rt.refusal = null;
      var request = {
        four51OrderId: rt.order.four51OrderId,
        lines: rt.chosen().map(function(l) {
          var p = rt.picks[l.four51LineId];
          return { four51LineId: l.four51LineId, quantity: p.qty, reasonCode: p.reason };
        })
        // No email and no box count: the server records the submitter's email from their
        // HR record, so a reported return always joins back to a person.
      };

      Allocation.requestReturn(request, $scope.rt.returnFor || FOR)
        .then(function(created) {
          var byLine = {};
          angular.forEach(rt.order.lines, function(l) { byLine[l.four51LineId] = l; });
          var labels = {};
          angular.forEach(rt.reasons, function(r) { labels[r.code] = r.label; });
          rt.done = {
            rmaNumber: created.rmaNumber,
            orderId: created.four51OrderId,
            email: created.submitterEmail,
            // `issued`, `failed` or `not_configured`. Only the first two are ever mentioned
            // on the page: with labels switched off the confirmation says nothing about one.
            label: created.label || { status: 'not_configured' },
            labelBusy: false,
            lines: (created.lines || []).map(function(l) {
              var line = byLine[l.four51LineId] || {};
              return {
                name: rt.nameOf(line),
                size: line.size,
                quantity: l.quantity,
                reason: labels[l.reasonCode] || l.reasonCode
              };
            })
          };
        })
        .catch(function(err) {
          // A 409 carries a sentence written for the shopper; anything else is ours.
          var body = err && err.body;
          rt.refusal = (err && err.status === 409 && body && body.message) ||
            'Your return could not be sent. Please try again.';
          // The list may be stale, which is the usual reason for a refusal: something was
          // requested from another tab. Reload it so the steppers show the truth.
          if (err && err.status === 409) {
            var keep = rt.order && rt.order.four51OrderId;
            Allocation.returnOrders(FOR).then(function(data) {
              rt.orders = data.orders || [];
              numberOrders(rt.orders);
              angular.forEach(rt.orders, function(o) {
                if (o.four51OrderId === keep) { rt.order = o; }
              });
            });
          }
        })
        .finally(function() { rt.submitting = false; });
    };

    /**
     * Print the sample label and nothing else. The page's print styles show only the slip
     * while this class is on the body, so the sample prints as a label rather than as a
     * screenshot of the confirmation.
     */
    $scope.rt.printSample = function() {
      var body = $window.document.body;
      body.classList.add('hz-print-slip');
      try { $window.print(); } finally { body.classList.remove('hz-print-slip'); }
    };

    /** One more attempt at the label. The return already exists either way. */
    $scope.rt.retryLabel = function() {
      var done = $scope.rt.done;
      if (!done || done.labelBusy) return;
      done.labelBusy = true;
      Allocation.returnLabel(done.rmaNumber)
        .then(function(res) { done.label = (res && res.label) || done.label; })
        .catch(function() { done.label = { status: 'failed' }; })
        .finally(function() { done.labelBusy = false; });
    };

    $scope.rt.startAnother = function() {
      var rt = $scope.rt;
      rt.done = null;
      rt.order = null;
      rt.picks = {};
      rt.tried = false;
      load();
    };

    if ($scope.rt.enabled) load();
    else $scope.rt.loading = false;
  }]);
