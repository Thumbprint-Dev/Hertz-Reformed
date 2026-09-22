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
four51.app.controller('ReturnRequestCtrl', ['$scope', '$location', '$q', '$filter', 'Allocation',
  function($scope, $location, $q, $filter, Allocation) {

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
      boxCount: 1,
      email: '',
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
          rt.onBehalf = !!data.onBehalf;
          rt.who = results[1] || null;

          // The email is for questions about this return, so it is the address of whoever
          // is filling the form in: the Champion when it is on behalf, the employee
          // otherwise. Editable, because a work address is not always the one they read.
          var mine = $scope.user && $scope.user.Email;
          rt.email = mine || (!rt.onBehalf && rt.who && rt.who.email) || '';

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

    $scope.rt.choose = function(order) {
      var rt = $scope.rt;
      if (!order || order.returnable < 1) return;
      rt.order = order;
      rt.picks = {};
      rt.refusal = null;
      rt.tried = false;
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

    $scope.rt.moreBoxes = function() { if ($scope.rt.boxCount < 20) $scope.rt.boxCount += 1; };
    $scope.rt.fewerBoxes = function() { if ($scope.rt.boxCount > 1) $scope.rt.boxCount -= 1; };

    /** Why the button is not ready, in words, or null when it is. */
    $scope.rt.blocker = function() {
      var rt = $scope.rt;
      if (!rt.order) return 'Choose the order the items came from.';
      var chosen = rt.chosen();
      if (!chosen.length) return 'Choose at least one item to return.';
      if (chosen.some(rt.needsReason)) return 'Choose a reason for each item.';
      if (!rt.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(rt.email)) return 'Enter an email address.';
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
        }),
        boxCount: rt.boxCount,
        submitterEmail: rt.email
      };

      Allocation.requestReturn(request, FOR)
        .then(function(created) {
          var byLine = {};
          angular.forEach(rt.order.lines, function(l) { byLine[l.four51LineId] = l; });
          var labels = {};
          angular.forEach(rt.reasons, function(r) { labels[r.code] = r.label; });
          rt.done = {
            rmaNumber: created.rmaNumber,
            orderId: created.four51OrderId,
            boxCount: rt.boxCount,
            email: rt.email,
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
              angular.forEach(rt.orders, function(o) {
                if (o.four51OrderId === keep) { rt.order = o; }
              });
            });
          }
        })
        .finally(function() { rt.submitting = false; });
    };

    $scope.rt.startAnother = function() {
      var rt = $scope.rt;
      rt.done = null;
      rt.order = null;
      rt.picks = {};
      rt.boxCount = 1;
      rt.tried = false;
      load();
    };

    if ($scope.rt.enabled) load();
    else $scope.rt.loading = false;
  }]);
