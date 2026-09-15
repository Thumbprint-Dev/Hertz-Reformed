/**
 * The cart gate.
 *
 * Four51 exposes no server-side checkout hook — the spike settled that
 * (`docs/09-SPIKE-FINDINGS.md`) — so enforcement has to happen before the storefront saves
 * an order. This is that "before".
 *
 * ## Why it wraps the service and not each controller
 *
 * `Order.save` is the one function every cart write goes through: adding a product,
 * editing a quantity, deleting a line, the cart page's own autosaves. Calling the gate from
 * each controller means finding all of them today and remembering on every future one, and
 * the cost of missing one is silent over-allocation. Wrapping the service gates the paths
 * nobody thought about, including the ones added after this file.
 *
 * ## Why `run` and not `$provide.decorator`
 *
 * In Angular 1.2 a `config` block is pushed onto the *same* queue as provider
 * registrations and runs in declaration order, so `$provide.decorator('Order', …)` only
 * works if this file is loaded after `orderService.js`. It was not, and the whole app died
 * on `unknown provider: OrderProvider` — a white screen, not a degraded cart.
 *
 * A `run` block executes once the injector is built, so every service exists and the order
 * of the script tags stops mattering. `Order` is a singleton object, so replacing its
 * methods here reaches every consumer, and run blocks execute before any controller does.
 *
 * ## What it does on failure, and why
 *
 * **A 409 blocks the save.** That is the gate doing its job: the API refused, and the
 * refusal text is already written for a shopper.
 *
 * **Anything else lets the save through.** A network error, a 500, a timeout — the order
 * proceeds unmetered and the nightly reconciliation posts the compensating entry, which is
 * exactly the job reconciliation already exists for: `PUT order/repeat/:id` bypasses this
 * gate entirely and always has, so an unmetered order is a condition the system is built to
 * detect and correct rather than one it has never seen.
 *
 * The alternative — fail closed — makes our uptime a hard dependency of Four51's cart. A
 * blip in our service would stop every employee in the company from ordering anything,
 * including people whose allocation is not in question. That trade is wrong in this
 * direction: the cost of failing open is a bounded over-allocation that reconciliation
 * catches and an operator can see, and the cost of failing closed is a storefront that does
 * not work. Recorded as decision 51.
 *
 * ## Products we do not own
 *
 * Lines whose product is not in `catalog_map` come back in `unmapped` and are not metered.
 * A promotional mug in the same cart as a polo is not an allocation item and this must not
 * pretend otherwise.
 */
four51.app.run(['Order', 'Allocation', function(Order, Allocation) {

    var save = Order.save;
    var submit = Order.submit;

    /** The lines the gate meters, in the shape the API takes. */
    function linesOf(order) {
      var lines = [];
      angular.forEach((order && order.LineItems) || [], function(item, index) {
        var product = item && item.Product;
        var interopId = product && product.InteropID;
        var quantity = item && item.Quantity;
        if (!interopId || !quantity || quantity < 1) return;
        lines.push({
          // Four51 does not always have an ID on an unsaved line; the index is stable
          // within one save and the API only uses this to report which line refused.
          four51LineId: String((item.ID !== undefined && item.ID !== null) ? item.ID : index),
          four51ProductId: String(interopId),
          quantity: quantity
        });
      });
      return lines;
    }

    /**
     * Refusal text, in the shape the storefront's own error handlers expect.
     *
     * Never `LineItems[].Errors` — `categoryCtrl.js:84` rewrites that unconditionally to
     * "out of stock", which would turn "you have reached your Polos allocation" into a
     * stock message and send someone to the wrong person for help.
     */
    function refusalMessage(err) {
      var messages = Allocation.refusalText(err && err.body);
      return messages.length ? messages.join(' ') : 'That order exceeds your uniform allocation.';
    }

    Order.save = function(order, success, error) {
      var orderId = order && order.ID;

      // No id yet, or the integration is off: nothing to meter against. An order with no
      // id has never been saved, so there is no reservation to reconcile it to either.
      if (!Allocation.isEnabled() || !orderId) {
        return save(order, success, error);
      }

      var lines = linesOf(order);
      Allocation.validateCart(orderId, lines, Allocation.orderBeneficiary(orderId))
        .then(function() {
          save(order, success, error);
        })
        .catch(function(err) {
          if (err && err.status === 409) {
            if (angular.isFunction(error)) error(refusalMessage(err));
            return;
          }
          // Unreachable or broken: let commerce continue and let reconciliation catch it.
          if (window.console && console.warn) {
            console.warn('allocation gate unavailable; order saved unmetered', err);
          }
          save(order, success, error);
        });
    };

    /**
     * Turn reservations into consumption, after Four51 has accepted the order.
     *
     * After, not before: if we consumed first and Four51 then rejected the submit, the
     * ledger would record units against an order that does not exist, and nothing would
     * ever correct it. This way the worst case is an accepted order we failed to record,
     * which is precisely the discrepancy reconciliation looks for.
     */
    Order.submit = function(order, success, error) {
      var orderId = order && order.ID;

      submit(order, function(saved) {
        if (Allocation.isEnabled() && orderId) {
          Allocation.checkout(orderId, linesOf(order), Allocation.orderBeneficiary(orderId))
            .catch(function(err) {
              if (window.console && console.warn) {
                console.warn('allocation checkout failed; reconciliation will correct', err);
              }
            })
            .finally(function() {
              Allocation.clearOrderBeneficiary(orderId);
            });
        }
        // The order is placed either way. Never hold a confirmation on our bookkeeping.
        if (angular.isFunction(success)) success(saved);
      }, error);
    };

}]);
